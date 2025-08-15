// Configuración de salas y tipos de mesa

const ROOM_TYPES = {
  BEGINNER: {
    name: 'Mesa Principiante',
    minBet: 5,
    maxBet: 100,
    maxPlayers: 3,
    buyInMin: 100,
    buyInMax: 500
  },
  INTERMEDIATE: {
    name: 'Mesa Intermedia',
    minBet: 25,
    maxBet: 500,
    maxPlayers: 3,
    buyInMin: 500,
    buyInMax: 2000
  },
  HIGH_ROLLER: {
    name: 'Mesa VIP',
    minBet: 100,
    maxBet: 2000,
    maxPlayers: 3,
    buyInMin: 2000,
    buyInMax: 10000
  }
};

const GAME_RULES = {
  DEALER_HITS_SOFT_17: true,
  BLACKJACK_PAYS: 1.5,
  INSURANCE_PAYS: 2,
  DOUBLE_AFTER_SPLIT: true,
  SURRENDER_ALLOWED: true,
  MAX_SPLITS: 3,
  DECK_COUNT: 6,
  PENETRATION: 0.75 // 75% del mazo antes de barajar
};

class RoomManager {
  constructor() {
    this.activeRooms = new Map();
    this.roomCounter = 1;
  }

  createRoom(roomType = 'BEGINNER', customName = null) {
    const roomId = customName || `SALA_${this.roomCounter++}`;
    const config = ROOM_TYPES[roomType] || ROOM_TYPES.BEGINNER;
    
    const roomData = {
      id: roomId,
      type: roomType,
      config: config,
      rules: GAME_RULES,
      createdAt: new Date(),
      isPrivate: !!customName,
      playerCount: 0,
      gameInProgress: false
    };
    
    this.activeRooms.set(roomId, roomData);
    return roomData;
  }

  getRoomList() {
    return Array.from(this.activeRooms.values())
      .filter(room => !room.isPrivate && room.playerCount < room.config.maxPlayers)
      .map(room => ({
        id: room.id,
        name: room.config.name,
        type: room.type,
        playerCount: room.playerCount,
        maxPlayers: room.config.maxPlayers,
        minBet: room.config.minBet,
        maxBet: room.config.maxBet,
        gameInProgress: room.gameInProgress
      }));
  }

  getRoomById(roomId) {
    return this.activeRooms.get(roomId);
  }

  updateRoomPlayerCount(roomId, count) {
    const room = this.activeRooms.get(roomId);
    if (room) {
      room.playerCount = count;
      
      // Eliminar sala si está vacía por más de 5 minutos
      if (count === 0) {
        setTimeout(() => {
          const currentRoom = this.activeRooms.get(roomId);
          if (currentRoom && currentRoom.playerCount === 0) {
            this.activeRooms.delete(roomId);
            console.log(`Sala ${roomId} eliminada por inactividad`);
          }
        }, 5 * 60 * 1000); // 5 minutos
      }
    }
  }

  setRoomGameStatus(roomId, inProgress) {
    const room = this.activeRooms.get(roomId);
    if (room) {
      room.gameInProgress = inProgress;
    }
  }

  deleteRoom(roomId) {
    return this.activeRooms.delete(roomId);
  }

  // Generar ID de sala personalizada
  generateCustomRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Validar si un jugador puede unirse a una sala
  canJoinRoom(roomId, playerBankroll) {
    const room = this.activeRooms.get(roomId);
    if (!room) {
      return { canJoin: false, reason: 'Sala no encontrada' };
    }

    if (room.playerCount >= room.config.maxPlayers) {
      return { canJoin: false, reason: 'Sala llena' };
    }

    if (playerBankroll < room.config.buyInMin) {
      return { 
        canJoin: false, 
        reason: `Buy-in mínimo: $${room.config.buyInMin}` 
      };
    }

    return { canJoin: true };
  }
}

module.exports = {
  RoomManager,
  ROOM_TYPES,
  GAME_RULES
};