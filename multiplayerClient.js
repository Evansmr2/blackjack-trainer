// Cliente multijugador para Blackjack
class MultiplayerClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.playerId = null;
        this.playerName = '';
        this.currentRoom = null;
        this.bankroll = 1000;
        this.gameState = null;
        
        // Referencias a elementos del DOM
        this.elements = {};
        this.initializeElements();
        this.setupEventListeners();
    }
    
    initializeElements() {
        this.elements = {
            // Controles de conexión
            connectBtn: document.getElementById('connectBtn'),
            disconnectBtn: document.getElementById('disconnectBtn'),
            playerNameInput: document.getElementById('playerName'),
            connectionStatus: document.getElementById('connectionStatus'),
            
            // Lista de salas
            roomsList: document.getElementById('roomsList'),
            createRoomBtn: document.getElementById('createRoomBtn'),
            roomTypeSelect: document.getElementById('roomTypeSelect'),
            
            // Controles del juego
            gameArea: document.getElementById('gameArea'),
            playersInRoom: document.getElementById('playersInRoom'),
            startRoundBtn: document.getElementById('startRoundBtn'),
            
            // Información del jugador
            playerBankroll: document.getElementById('playerBankroll'),
            currentBet: document.getElementById('currentBet'),
            
            // Controles de apuesta
            betAmount: document.getElementById('betAmount'),
            placeBetBtn: document.getElementById('placeBetBtn'),
            
            // Acciones del juego
            hitBtn: document.getElementById('hitBtn'),
            standBtn: document.getElementById('standBtn'),
            doubleBtn: document.getElementById('doubleBtn'),
            
            // Estado del juego
            gameStatus: document.getElementById('gameStatus'),
            dealerCards: document.getElementById('dealerCards'),
            dealerValue: document.getElementById('dealerValue')
        };
    }
    
    setupEventListeners() {
        // Conexión
        this.elements.connectBtn?.addEventListener('click', () => this.connect());
        this.elements.disconnectBtn?.addEventListener('click', () => this.disconnect());
        
        // Salas
        this.elements.createRoomBtn?.addEventListener('click', () => this.createRoom());
        
        // Juego
        this.elements.startRoundBtn?.addEventListener('click', () => this.startNewRound());
        this.elements.placeBetBtn?.addEventListener('click', () => this.placeBet());
        
        // Acciones del jugador
        this.elements.hitBtn?.addEventListener('click', () => this.hit());
        this.elements.standBtn?.addEventListener('click', () => this.stand());
        this.elements.doubleBtn?.addEventListener('click', () => this.double());
    }
    
    connect() {
        const playerName = this.elements.playerNameInput?.value.trim();
        if (!playerName) {
            alert('Por favor ingresa tu nombre');
            return;
        }
        
        this.playerName = playerName;
        
        try {
            // Conectar al servidor Socket.IO
            this.socket = io('http://localhost:3000');
            
            // Eventos de conexión
            this.socket.on('connect', () => {
                this.isConnected = true;
                this.playerId = this.socket.id;
                this.updateConnectionStatus('Conectado al servidor');
                this.loadRooms();
            });
            
            this.socket.on('disconnect', () => {
                this.isConnected = false;
                this.updateConnectionStatus('Desconectado del servidor');
                this.clearRooms();
            });
            
            // Eventos de salas
            this.socket.on('roomsList', (rooms) => {
                this.displayRooms(rooms);
            });
            
            this.socket.on('roomCreated', (room) => {
                this.updateConnectionStatus(`Sala "${room.name}" creada exitosamente`);
                this.loadRooms();
            });
            
            this.socket.on('joinedRoom', (data) => {
                this.currentRoom = data.room;
                this.bankroll = data.bankroll;
                this.updateConnectionStatus(`Te uniste a la sala "${data.room.name}"`);
                this.showGameArea();
                this.updatePlayersInRoom();
                this.updateBankrollDisplay();
            });
            
            this.socket.on('playerJoined', (data) => {
                this.updateConnectionStatus(`${data.playerName} se unió a la sala`);
                this.updatePlayersInRoom();
            });
            
            this.socket.on('playerLeft', (data) => {
                this.updateConnectionStatus(`${data.playerName} dejó la sala`);
                this.updatePlayersInRoom();
            });
            
            // Eventos del juego
            this.socket.on('gameStateUpdate', (gameState) => {
                this.gameState = gameState;
                this.updateGameDisplay();
            });
            
            this.socket.on('roundStarted', (gameState) => {
                this.gameState = gameState;
                this.updateConnectionStatus('Nueva ronda iniciada');
                this.updateGameDisplay();
                this.enableBettingControls(false);
            });
            
            this.socket.on('betPlaced', (data) => {
                this.bankroll = data.newBankroll;
                this.updateBankrollDisplay();
                this.updateConnectionStatus(`Apuesta de $${data.amount} colocada`);
            });
            
            this.socket.on('playerAction', (data) => {
                this.updateConnectionStatus(`${data.playerName} eligió ${data.action}`);
            });
            
            this.socket.on('roundEnded', (results) => {
                this.handleRoundEnd(results);
            });
            
            // Eventos de error
            this.socket.on('error', (error) => {
                this.updateConnectionStatus(`Error: ${error.message}`, 'error');
            });
            
        } catch (error) {
            this.updateConnectionStatus(`Error de conexión: ${error.message}`, 'error');
        }
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.currentRoom = null;
        this.updateConnectionStatus('Desconectado');
        this.hideGameArea();
        this.clearRooms();
    }
    
    loadRooms() {
        if (this.socket) {
            this.socket.emit('getRooms');
        }
    }
    
    createRoom() {
        const roomType = this.elements.roomTypeSelect?.value || 'beginner';
        
        if (this.socket) {
            this.socket.emit('createRoom', {
                playerName: this.playerName,
                roomType: roomType
            });
        }
    }
    
    joinRoom(roomId) {
        if (this.socket) {
            this.socket.emit('joinRoom', {
                roomId: roomId,
                playerName: this.playerName,
                bankroll: this.bankroll
            });
        }
    }
    
    startNewRound() {
        if (this.socket && this.currentRoom) {
            this.socket.emit('startNewRound', {
                roomId: this.currentRoom.id
            });
        }
    }
    
    placeBet() {
        const betAmount = parseInt(this.elements.betAmount?.value) || 0;
        
        if (betAmount <= 0) {
            alert('Ingresa una cantidad válida para apostar');
            return;
        }
        
        if (betAmount > this.bankroll) {
            alert('No tienes suficiente dinero para esta apuesta');
            return;
        }
        
        if (this.socket && this.currentRoom) {
            this.socket.emit('placeBet', {
                roomId: this.currentRoom.id,
                amount: betAmount
            });
        }
    }
    
    hit() {
        if (this.socket && this.currentRoom) {
            this.socket.emit('playerAction', {
                roomId: this.currentRoom.id,
                action: 'hit'
            });
        }
    }
    
    stand() {
        if (this.socket && this.currentRoom) {
            this.socket.emit('playerAction', {
                roomId: this.currentRoom.id,
                action: 'stand'
            });
        }
    }
    
    double() {
        if (this.socket && this.currentRoom) {
            this.socket.emit('playerAction', {
                roomId: this.currentRoom.id,
                action: 'double'
            });
        }
    }
    
    updateConnectionStatus(message, type = 'info') {
        if (this.elements.connectionStatus) {
            this.elements.connectionStatus.textContent = message;
            this.elements.connectionStatus.className = `connection-status ${type}`;
        }
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    displayRooms(rooms) {
        if (!this.elements.roomsList) return;
        
        this.elements.roomsList.innerHTML = '';
        
        if (rooms.length === 0) {
            this.elements.roomsList.innerHTML = '<p>No hay salas disponibles</p>';
            return;
        }
        
        rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            roomElement.innerHTML = `
                <div class="room-info">
                    <h4>${room.name}</h4>
                    <p>Tipo: ${room.config.name}</p>
                    <p>Jugadores: ${room.players.length}/${room.config.maxPlayers}</p>
                    <p>Apuesta mínima: $${room.config.minBet}</p>
                    <p>Apuesta máxima: $${room.config.maxBet}</p>
                </div>
                <button onclick="multiplayerClient.joinRoom('${room.id}')" 
                        ${room.players.length >= room.config.maxPlayers ? 'disabled' : ''}>
                    ${room.players.length >= room.config.maxPlayers ? 'Llena' : 'Unirse'}
                </button>
            `;
            this.elements.roomsList.appendChild(roomElement);
        });
    }
    
    clearRooms() {
        if (this.elements.roomsList) {
            this.elements.roomsList.innerHTML = '';
        }
    }
    
    showGameArea() {
        if (this.elements.gameArea) {
            this.elements.gameArea.style.display = 'block';
        }
    }
    
    hideGameArea() {
        if (this.elements.gameArea) {
            this.elements.gameArea.style.display = 'none';
        }
    }
    
    updatePlayersInRoom() {
        if (!this.elements.playersInRoom || !this.currentRoom) return;
        
        const playersHtml = this.currentRoom.players.map(player => 
            `<div class="player-info">
                <span class="player-name">${player.name}</span>
                <span class="player-bankroll">$${player.bankroll}</span>
            </div>`
        ).join('');
        
        this.elements.playersInRoom.innerHTML = playersHtml;
    }
    
    updateBankrollDisplay() {
        if (this.elements.playerBankroll) {
            this.elements.playerBankroll.textContent = `$${this.bankroll}`;
        }
    }
    
    updateGameDisplay() {
        if (!this.gameState) return;
        
        // Actualizar cartas del dealer
        this.displayDealerCards();
        
        // Actualizar estado del juego
        if (this.elements.gameStatus) {
            this.elements.gameStatus.textContent = this.gameState.status || 'Esperando...';
        }
        
        // Actualizar controles según el estado del juego
        this.updateGameControls();
    }
    
    displayDealerCards() {
        if (!this.elements.dealerCards || !this.gameState.dealer) return;
        
        const dealerHand = this.gameState.dealer.hand;
        const cardsHtml = dealerHand.map(card => 
            `<div class="card ${card.color}">
                <div class="card-rank">${card.rank}</div>
                <div class="card-suit">${card.suit}</div>
            </div>`
        ).join('');
        
        this.elements.dealerCards.innerHTML = cardsHtml;
        
        if (this.elements.dealerValue) {
            this.elements.dealerValue.textContent = this.gameState.dealer.value || '';
        }
    }
    
    updateGameControls() {
        const isMyTurn = this.gameState && 
                        this.gameState.currentPlayer && 
                        this.gameState.currentPlayer.id === this.playerId;
        
        // Habilitar/deshabilitar botones de acción
        if (this.elements.hitBtn) this.elements.hitBtn.disabled = !isMyTurn;
        if (this.elements.standBtn) this.elements.standBtn.disabled = !isMyTurn;
        if (this.elements.doubleBtn) this.elements.doubleBtn.disabled = !isMyTurn;
    }
    
    enableBettingControls(enabled) {
        if (this.elements.placeBetBtn) this.elements.placeBetBtn.disabled = !enabled;
        if (this.elements.betAmount) this.elements.betAmount.disabled = !enabled;
    }
    
    handleRoundEnd(results) {
        // Actualizar bankroll basado en los resultados
        const myResult = results.find(result => result.playerId === this.playerId);
        if (myResult) {
            this.bankroll = myResult.newBankroll;
            this.updateBankrollDisplay();
            
            let message = `Ronda terminada. `;
            if (myResult.winnings > 0) {
                message += `¡Ganaste $${myResult.winnings}!`;
            } else if (myResult.winnings < 0) {
                message += `Perdiste $${Math.abs(myResult.winnings)}.`;
            } else {
                message += `Empate.`;
            }
            
            this.updateConnectionStatus(message);
        }
        
        // Habilitar controles para nueva ronda
        this.enableBettingControls(true);
    }
}

// Instancia global del cliente
let multiplayerClient = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    multiplayerClient = new MultiplayerClient();
});