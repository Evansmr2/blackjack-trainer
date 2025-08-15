// Lógica del juego de Blackjack multijugador

class BlackjackGame {
  constructor(room) {
    this.room = room;
    this.deck = [];
    this.dealerCards = [];
    this.gamePhase = 'WAITING'; // WAITING, BETTING, DEALING, PLAYING, DEALER_TURN, FINISHED
    this.currentPlayerIndex = 0;
    this.activePlayers = [];
    this.runningCount = 0;
    this.cardsPlayed = 0;
    this.gameResults = {};
  }

  // Inicializar nuevo mazo
  initializeDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    this.deck = [];

    // Crear 6 mazos
    for (let d = 0; d < 6; d++) {
      for (let suit of suits) {
        for (let rank of ranks) {
          this.deck.push({ 
            suit, 
            rank, 
            value: this.getCardValue(rank),
            id: `${suit}${rank}_${d}` 
          });
        }
      }
    }

    this.shuffleDeck();
    this.cardsPlayed = 0;
    this.runningCount = 0;
  }

  // Barajar mazo
  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  // Obtener valor de carta
  getCardValue(rank) {
    if (rank === 'A') return 11;
    if (['K', 'Q', 'J'].includes(rank)) return 10;
    return parseInt(rank);
  }

  // Calcular valor de mano
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

  // Repartir carta
  dealCard() {
    if (this.deck.length === 0) {
      this.initializeDeck();
    }
    
    const card = this.deck.pop();
    this.cardsPlayed++;
    
    // Actualizar conteo (Hi-Lo)
    if (['2', '3', '4', '5', '6'].includes(card.rank)) {
      this.runningCount++;
    } else if (['10', 'J', 'Q', 'K', 'A'].includes(card.rank)) {
      this.runningCount--;
    }
    
    return card;
  }

  // Iniciar nueva ronda
  startNewRound() {
    if (this.gamePhase !== 'WAITING') {
      return { success: false, message: 'Juego ya en progreso' };
    }

    // Verificar que hay jugadores con apuestas
    this.activePlayers = [];
    for (let spotNum of [1, 2, 3]) {
      const spot = this.room.gameState.spots[spotNum];
      if (spot.occupied && spot.bet > 0) {
        this.activePlayers.push({
          spotNumber: spotNum,
          playerId: spot.playerId,
          playerName: spot.playerName,
          cards: [],
          bet: spot.bet,
          value: 0,
          status: 'PLAYING', // PLAYING, STAND, BUST, BLACKJACK, SURRENDER
          canDouble: true,
          canSplit: false,
          insurance: 0
        });
      }
    }

    if (this.activePlayers.length === 0) {
      return { success: false, message: 'No hay apuestas para iniciar' };
    }

    // Verificar si necesitamos barajar
    const penetration = this.cardsPlayed / (6 * 52);
    if (penetration > 0.75) {
      this.initializeDeck();
    }

    this.gamePhase = 'DEALING';
    this.dealerCards = [];
    this.currentPlayerIndex = 0;
    this.gameResults = {};

    // Repartir cartas iniciales
    this.dealInitialCards();

    return { success: true };
  }

  // Repartir cartas iniciales
  dealInitialCards() {
    // Dos cartas para cada jugador
    for (let round = 0; round < 2; round++) {
      for (let player of this.activePlayers) {
        const card = this.dealCard();
        player.cards.push(card);
        player.value = this.calculateHandValue(player.cards);
        
        // Actualizar spot en room
        this.room.gameState.spots[player.spotNumber].cards = player.cards;
        this.room.gameState.spots[player.spotNumber].value = player.value;
      }
    }

    // Una carta para el dealer (boca arriba)
    this.dealerCards.push(this.dealCard());
    this.room.gameState.dealerCards = this.dealerCards;
    this.room.gameState.dealerValue = this.calculateHandValue(this.dealerCards);

    // Verificar blackjacks
    this.checkBlackjacks();

    // Si no hay blackjacks, comenzar turno de jugadores
    if (this.gamePhase === 'DEALING') {
      this.gamePhase = 'PLAYING';
      this.findNextPlayer();
    }
  }

  // Verificar blackjacks
  checkBlackjacks() {
    let hasPlayerBlackjack = false;
    
    for (let player of this.activePlayers) {
      if (player.value === 21) {
        player.status = 'BLACKJACK';
        hasPlayerBlackjack = true;
      }
    }

    // Si hay blackjacks, repartir segunda carta del dealer
    if (hasPlayerBlackjack) {
      this.dealerCards.push(this.dealCard());
      this.room.gameState.dealerCards = this.dealerCards;
      this.room.gameState.dealerValue = this.calculateHandValue(this.dealerCards);
      
      // Si el dealer también tiene blackjack, es empate
      const dealerBlackjack = this.room.gameState.dealerValue === 21;
      
      for (let player of this.activePlayers) {
        if (player.status === 'BLACKJACK') {
          if (dealerBlackjack) {
            this.gameResults[player.spotNumber] = { result: 'PUSH', payout: player.bet };
          } else {
            this.gameResults[player.spotNumber] = { result: 'BLACKJACK', payout: player.bet * 2.5 };
          }
        }
      }
      
      // Si todos tienen blackjack, terminar juego
      const allBlackjack = this.activePlayers.every(p => p.status === 'BLACKJACK');
      if (allBlackjack) {
        this.gamePhase = 'FINISHED';
        this.processResults();
        return;
      }
    }
  }

  // Encontrar siguiente jugador
  findNextPlayer() {
    while (this.currentPlayerIndex < this.activePlayers.length) {
      const player = this.activePlayers[this.currentPlayerIndex];
      if (player.status === 'PLAYING') {
        return player;
      }
      this.currentPlayerIndex++;
    }
    
    // No hay más jugadores, turno del dealer
    this.gamePhase = 'DEALER_TURN';
    this.playDealerTurn();
    return null;
  }

  // Acción del jugador: Hit
  playerHit(playerId) {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.playerId !== playerId) {
      return { success: false, message: 'No es tu turno' };
    }

    const card = this.dealCard();
    currentPlayer.cards.push(card);
    currentPlayer.value = this.calculateHandValue(currentPlayer.cards);
    currentPlayer.canDouble = false;
    
    // Actualizar spot
    this.room.gameState.spots[currentPlayer.spotNumber].cards = currentPlayer.cards;
    this.room.gameState.spots[currentPlayer.spotNumber].value = currentPlayer.value;

    // Verificar bust
    if (currentPlayer.value > 21) {
      currentPlayer.status = 'BUST';
      this.gameResults[currentPlayer.spotNumber] = { result: 'BUST', payout: 0 };
      this.nextPlayer();
    }

    return { success: true, card };
  }

  // Acción del jugador: Stand
  playerStand(playerId) {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.playerId !== playerId) {
      return { success: false, message: 'No es tu turno' };
    }

    currentPlayer.status = 'STAND';
    this.nextPlayer();
    
    return { success: true };
  }

  // Acción del jugador: Double Down
  playerDouble(playerId) {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.playerId !== playerId) {
      return { success: false, message: 'No es tu turno' };
    }

    if (!currentPlayer.canDouble) {
      return { success: false, message: 'No puedes doblar' };
    }

    const player = this.room.players.get(playerId);
    if (player.bankroll < currentPlayer.bet) {
      return { success: false, message: 'Fondos insuficientes' };
    }

    // Doblar apuesta
    player.bankroll -= currentPlayer.bet;
    currentPlayer.bet *= 2;
    this.room.gameState.spots[currentPlayer.spotNumber].bet = currentPlayer.bet;

    // Repartir una carta y terminar turno
    const card = this.dealCard();
    currentPlayer.cards.push(card);
    currentPlayer.value = this.calculateHandValue(currentPlayer.cards);
    
    // Actualizar spot
    this.room.gameState.spots[currentPlayer.spotNumber].cards = currentPlayer.cards;
    this.room.gameState.spots[currentPlayer.spotNumber].value = currentPlayer.value;

    if (currentPlayer.value > 21) {
      currentPlayer.status = 'BUST';
      this.gameResults[currentPlayer.spotNumber] = { result: 'BUST', payout: 0 };
    } else {
      currentPlayer.status = 'STAND';
    }

    this.nextPlayer();
    
    return { success: true, card };
  }

  // Obtener jugador actual
  getCurrentPlayer() {
    if (this.currentPlayerIndex >= this.activePlayers.length) {
      return null;
    }
    return this.activePlayers[this.currentPlayerIndex];
  }

  // Siguiente jugador
  nextPlayer() {
    this.currentPlayerIndex++;
    this.findNextPlayer();
  }

  // Turno del dealer
  playDealerTurn() {
    // Repartir segunda carta si no la tiene
    if (this.dealerCards.length === 1) {
      this.dealerCards.push(this.dealCard());
    }

    // Dealer debe pedir hasta 17
    while (this.calculateHandValue(this.dealerCards) < 17) {
      this.dealerCards.push(this.dealCard());
    }

    this.room.gameState.dealerCards = this.dealerCards;
    this.room.gameState.dealerValue = this.calculateHandValue(this.dealerCards);

    this.gamePhase = 'FINISHED';
    this.processResults();
  }

  // Procesar resultados
  processResults() {
    const dealerValue = this.room.gameState.dealerValue;
    const dealerBust = dealerValue > 21;

    for (let player of this.activePlayers) {
      if (this.gameResults[player.spotNumber]) {
        continue; // Ya procesado (blackjack, bust, etc.)
      }

      let result, payout;
      
      if (dealerBust) {
        result = 'WIN';
        payout = player.bet * 2;
      } else if (player.value > dealerValue) {
        result = 'WIN';
        payout = player.bet * 2;
      } else if (player.value === dealerValue) {
        result = 'PUSH';
        payout = player.bet;
      } else {
        result = 'LOSE';
        payout = 0;
      }

      this.gameResults[player.spotNumber] = { result, payout };
    }

    // Actualizar bankrolls
    for (let spotNum in this.gameResults) {
      const spot = this.room.gameState.spots[spotNum];
      const player = this.room.players.get(spot.playerId);
      if (player) {
        player.bankroll += this.gameResults[spotNum].payout;
      }
    }

    // Limpiar apuestas
    for (let spotNum of [1, 2, 3]) {
      this.room.gameState.spots[spotNum].bet = 0;
      this.room.gameState.spots[spotNum].cards = [];
      this.room.gameState.spots[spotNum].value = 0;
    }

    // Preparar para siguiente ronda
    setTimeout(() => {
      this.gamePhase = 'WAITING';
      this.room.broadcastGameState();
    }, 5000); // 5 segundos para ver resultados
  }

  // Obtener estado del juego
  getGameState() {
    return {
      phase: this.gamePhase,
      currentPlayerIndex: this.currentPlayerIndex,
      activePlayers: this.activePlayers,
      dealerCards: this.dealerCards,
      dealerValue: this.calculateHandValue(this.dealerCards),
      runningCount: this.runningCount,
      cardsPlayed: this.cardsPlayed,
      deckRemaining: this.deck.length,
      results: this.gameResults
    };
  }
}

module.exports = BlackjackGame;