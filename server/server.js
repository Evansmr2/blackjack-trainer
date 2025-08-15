const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { RoomManager, ROOM_TYPES } = require('./roomConfig');
const BlackjackGame = require('./gameLogic');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
// Servir archivos estáticos
app.use(express.static('public'));
app.use(express.static('../')); // Servir archivos del directorio padre
app.use(express.static(path.join(__dirname, '../')));

// Estado del juego
const gameRooms = new Map();
const playerSockets = new Map();
const roomManager = new RoomManager();

// Clase para manejar una sala de juego
class GameRoom {
  constructor(roomId, roomType = 'BEGINNER') {
    this.id = roomId;
    this.type = roomType;
    this.config = ROOM_TYPES[roomType] || ROOM_TYPES.BEGINNER;
    this.players = new Map();
    this.game = new BlackjackGame(this);
    this.gameState = {
      deck: [],
      dealerCards: [],
      dealerValue: 0,
      gameInProgress: false,
      currentPlayerIndex: 0,
      spots: {
        1: { occupied: false, playerId: null, playerName: '', cards: [], bet: 0, value: 0 },
        2: { occupied: false, playerId: null, playerName: '', cards: [], bet: 0, value: 0 },
        3: { occupied: false, playerId: null, playerName: '', cards: [], bet: 0, value: 0 }
      },
      runningCount: 0,
      cardsPlayed: 0,
      gamePhase: 'WAITING',
      minBet: this.config.minBet,
      maxBet: this.config.maxBet
    };
    this.maxPlayers = this.config.maxPlayers;
  }

  addPlayer(playerId, playerName, socket, bankroll = null) {
    if (this.players.size >= this.maxPlayers) {
      return { success: false, message: 'Sala llena' };
    }

    const initialBankroll = bankroll || this.config.buyInMin;
    
    if (initialBankroll < this.config.buyInMin) {
      return { success: false, message: `Buy-in mínimo: $${this.config.buyInMin}` };
    }

    const player = {
      id: playerId,
      name: playerName,
      socket: socket,
      bankroll: initialBankroll,
      currentSpot: null,
      joinedAt: new Date()
    };

    this.players.set(playerId, player);
    socket.join(this.id);
    
    // Actualizar contador de jugadores en room manager
    roomManager.updateRoomPlayerCount(this.id, this.players.size);
    
    return { success: true, player };
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      // Liberar spot si lo tenía ocupado
      if (player.currentSpot) {
        this.gameState.spots[player.currentSpot] = {
          occupied: false,
          playerId: null,
          playerName: '',
          cards: [],
          bet: 0,
          value: 0
        };
      }
      
      this.players.delete(playerId);
      player.socket.leave(this.id);
      
      // Actualizar contador de jugadores
      roomManager.updateRoomPlayerCount(this.id, this.players.size);
      
      // Notificar a otros jugadores
      this.broadcastGameState();
      
      return true;
    }
    return false;
  }

  buyInToSpot(playerId, spotNumber) {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, message: 'Jugador no encontrado' };
    }

    if (spotNumber < 1 || spotNumber > 3) {
      return { success: false, message: 'Spot inválido' };
    }

    if (this.gameState.spots[spotNumber].occupied) {
      return { success: false, message: 'Spot ya ocupado' };
    }

    // Liberar spot anterior si tenía uno
    if (player.currentSpot) {
      this.gameState.spots[player.currentSpot] = {
        occupied: false,
        playerId: null,
        playerName: '',
        cards: [],
        bet: 0,
        value: 0
      };
    }

    // Ocupar nuevo spot
    this.gameState.spots[spotNumber] = {
      occupied: true,
      playerId: playerId,
      playerName: player.name,
      cards: [],
      bet: 0,
      value: 0
    };

    player.currentSpot = spotNumber;
    
    return { success: true };
  }

  placeBet(playerId, amount) {
    const player = this.players.get(playerId);
    if (!player || !player.currentSpot) {
      return { success: false, message: 'Jugador no tiene spot' };
    }

    if (amount < this.config.minBet) {
      return { success: false, message: `Apuesta mínima: $${this.config.minBet}` };
    }

    if (amount > this.config.maxBet) {
      return { success: false, message: `Apuesta máxima: $${this.config.maxBet}` };
    }

    if (amount > player.bankroll) {
      return { success: false, message: 'Fondos insuficientes' };
    }

    if (this.gameState.gameInProgress) {
      return { success: false, message: 'No se puede apostar durante el juego' };
    }

    const spot = this.gameState.spots[player.currentSpot];
    
    // Devolver apuesta anterior si existe
    if (spot.bet > 0) {
      player.bankroll += spot.bet;
    }
    
    spot.bet = amount;
    player.bankroll -= amount;

    return { success: true };
  }

  broadcastGameState() {
    const gameData = {
      roomId: this.id,
      roomType: this.type,
      roomConfig: this.config,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        bankroll: p.bankroll,
        currentSpot: p.currentSpot
      })),
      gameState: {
        ...this.gameState,
        ...this.game.getGameState()
      }
    };

    io.to(this.id).emit('gameStateUpdate', gameData);
  }

  initializeDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];

    // Crear 6 mazos
    for (let d = 0; d < 6; d++) {
      for (let suit of suits) {
        for (let rank of ranks) {
          deck.push({ suit, rank, value: this.getCardValue(rank) });
        }
      }
    }

    // Barajar
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    this.gameState.deck = deck;
    this.gameState.cardsPlayed = 0;
    this.gameState.runningCount = 0;
  }

  getCardValue(rank) {
    if (rank === 'A') return 11;
    if (['K', 'Q', 'J'].includes(rank)) return 10;
    return parseInt(rank);
  }

  calculateHandValue(cards) {
    let value = 0;
    let aces = 0;

    for (let card of cards) {
      if (card.rank === 'A') {
        aces++;
        value += 11;
      } else {
        value += card.value;
      }
    }

    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  }
}

// Rutas
app.get('/', (req, res) => {
  res.send(`
    <h1>🎮 Servidor Multijugador de Blackjack</h1>
    <p>Servidor ejecutándose correctamente</p>
    <p><a href="/game">Ir al juego</a></p>
    <p><a href="/multiplayer.html">Juego Multijugador</a></p>
  `);
});

// Ruta para el juego multijugador
app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, '../multiplayer.html'));
});

// Socket.IO eventos
io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  // Obtener lista de salas
  socket.on('getRoomList', () => {
    socket.emit('roomList', roomManager.getRoomList());
  });

  // Crear sala personalizada
  socket.on('createRoom', (data) => {
    const { roomType = 'BEGINNER', customName } = data;
    const roomData = roomManager.createRoom(roomType, customName);
    
    socket.emit('roomCreated', {
      success: true,
      roomId: roomData.id,
      roomData: roomData
    });
  });

  // Unirse a una sala
  socket.on('joinRoom', (data) => {
    const { roomId, playerName, bankroll } = data;
    const playerId = uuidv4();
    
    // Crear sala si no existe
    if (!gameRooms.has(roomId)) {
      const roomData = roomManager.getRoomById(roomId) || roomManager.createRoom('BEGINNER', roomId);
      gameRooms.set(roomId, new GameRoom(roomId, roomData.type));
    }
    
    const room = gameRooms.get(roomId);
    const result = room.addPlayer(playerId, playerName, socket, bankroll);
    
    if (result.success) {
      playerSockets.set(socket.id, { playerId, roomId });
      
      socket.emit('joinedRoom', {
        success: true,
        playerId: playerId,
        roomId: roomId,
        playerName: playerName,
        bankroll: result.player.bankroll
      });
      
      // Inicializar mazo si es el primer jugador
      if (room.players.size === 1) {
        room.game.initializeDeck();
      }
      
      room.broadcastGameState();
      
      console.log(`${playerName} se unió a la sala ${roomId}`);
    } else {
      socket.emit('joinedRoom', {
        success: false,
        message: result.message
      });
    }
  });

  // Buy-in a un spot
  socket.on('buyInToSpot', (data) => {
    const playerInfo = playerSockets.get(socket.id);
    if (!playerInfo) return;
    
    const room = gameRooms.get(playerInfo.roomId);
    if (!room) return;
    
    const result = room.buyInToSpot(playerInfo.playerId, data.spotNumber);
    
    socket.emit('buyInResult', result);
    
    if (result.success) {
      room.broadcastGameState();
    }
  });

  // Apostar
  socket.on('placeBet', (data) => {
    const playerInfo = playerSockets.get(socket.id);
    if (!playerInfo) return;
    
    const room = gameRooms.get(playerInfo.roomId);
    if (!room) return;
    
    const result = room.placeBet(playerInfo.playerId, data.amount);
    
    socket.emit('betResult', result);
    
    if (result.success) {
      room.broadcastGameState();
    }
  });

  // Iniciar nueva ronda
  socket.on('startRound', () => {
    const playerInfo = playerSockets.get(socket.id);
    if (!playerInfo) return;
    
    const room = gameRooms.get(playerInfo.roomId);
    if (!room) return;
    
    const result = room.game.startNewRound();
    
    if (result.success) {
      room.gameState.gameInProgress = true;
      roomManager.setRoomGameStatus(playerInfo.roomId, true);
      room.broadcastGameState();
      
      io.to(playerInfo.roomId).emit('roundStarted', {
        success: true,
        message: 'Nueva ronda iniciada'
      });
    } else {
      socket.emit('roundStarted', result);
    }
  });

  // Acción del jugador: Hit
  socket.on('playerHit', () => {
    const playerInfo = playerSockets.get(socket.id);
    if (!playerInfo) return;
    
    const room = gameRooms.get(playerInfo.roomId);
    if (!room) return;
    
    const result = room.game.playerHit(playerInfo.playerId);
    
    if (result.success) {
      room.broadcastGameState();
      
      io.to(playerInfo.roomId).emit('playerAction', {
        action: 'hit',
        playerId: playerInfo.playerId,
        card: result.card
      });
    } else {
      socket.emit('actionResult', result);
    }
  });

  // Acción del jugador: Stand
  socket.on('playerStand', () => {
    const playerInfo = playerSockets.get(socket.id);
    if (!playerInfo) return;
    
    const room = gameRooms.get(playerInfo.roomId);
    if (!room) return;
    
    const result = room.game.playerStand(playerInfo.playerId);
    
    if (result.success) {
      room.broadcastGameState();
      
      io.to(playerInfo.roomId).emit('playerAction', {
        action: 'stand',
        playerId: playerInfo.playerId
      });
    } else {
      socket.emit('actionResult', result);
    }
  });

  // Acción del jugador: Double Down
  socket.on('playerDouble', () => {
    const playerInfo = playerSockets.get(socket.id);
    if (!playerInfo) return;
    
    const room = gameRooms.get(playerInfo.roomId);
    if (!room) return;
    
    const result = room.game.playerDouble(playerInfo.playerId);
    
    if (result.success) {
      room.broadcastGameState();
      
      io.to(playerInfo.roomId).emit('playerAction', {
        action: 'double',
        playerId: playerInfo.playerId,
        card: result.card
      });
    } else {
      socket.emit('actionResult', result);
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    const playerInfo = playerSockets.get(socket.id);
    if (playerInfo) {
      const room = gameRooms.get(playerInfo.roomId);
      if (room) {
        room.removePlayer(playerInfo.playerId);
        
        // Eliminar sala si está vacía
        if (room.players.size === 0) {
          gameRooms.delete(playerInfo.roomId);
          console.log(`Sala ${playerInfo.roomId} eliminada`);
        }
      }
      
      playerSockets.delete(socket.id);
    }
    
    console.log(`Usuario desconectado: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor multijugador ejecutándose en http://localhost:${PORT}`);
  console.log(`🎮 Accede al juego en http://localhost:${PORT}/game`);
});