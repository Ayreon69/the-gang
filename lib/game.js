// Règles de The Gang : un salon, ses joueurs, et l'enchaînement des casses.

const crypto = require('crypto');
const { evaluate, compare } = require('./hands');

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;
const TARGET = 3; // 3 casses réussis pour gagner, 3 alarmes pour perdre
const ROUNDS = [
  { key: 'preflop', name: 'Pré-flop', color: 'white', deal: 0 },
  { key: 'flop', name: 'Flop', color: 'yellow', deal: 3 },
  { key: 'turn', name: 'Turn', color: 'orange', deal: 1 },
  { key: 'river', name: 'River', color: 'red', deal: 1 },
];
const COLORS = ['#f5b642', '#4fc3f7', '#ef6f9a', '#7bd88f', '#b48cff', '#ff8a5b'];

const randomId = (bytes = 9) => crypto.randomBytes(bytes).toString('base64url');

function newDeck() {
  const deck = [];
  for (const s of ['s', 'h', 'd', 'c']) for (let r = 2; r <= 14; r++) deck.push({ r, s });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

class Room {
  constructor(code) {
    this.code = code;
    this.players = [];
    this.hostId = null;
    this.phase = 'lobby'; // lobby | playing | showdown | gameover
    this.settings = { hints: true };
    this.lastActivity = Date.now();
    this.resetScore();
  }

  resetScore() {
    this.vaults = 0;
    this.alarms = 0;
    this.heist = 0;
    this.round = 0;
    this.community = [];
    this.deck = [];
    this.chips = {}; // valeur du jeton -> id du joueur (ou null s'il est au centre)
    this.showdown = null;
    this.results = []; // historique des casses : true = réussi
  }

  player(id) {
    return this.players.find((p) => p.id === id);
  }

  playerByToken(token) {
    return token ? this.players.find((p) => p.token === token) : undefined;
  }

  addPlayer(name) {
    if (this.phase !== 'lobby') throw new Error('La partie a déjà commencé.');
    if (this.players.length >= MAX_PLAYERS) throw new Error(`Le salon est plein (${MAX_PLAYERS} joueurs maximum).`);
    let finalName = name;
    for (let n = 2; this.players.some((p) => p.name.toLowerCase() === finalName.toLowerCase()); n++) finalName = `${name} ${n}`;
    const used = new Set(this.players.map((p) => p.color));
    const p = {
      id: randomId(6),
      token: randomId(18),
      name: finalName,
      color: COLORS.find((c) => !used.has(c)) || COLORS[0],
      socketId: null,
      connected: false,
      hand: [],
      history: [],
      ready: false,
    };
    this.players.push(p);
    if (!this.hostId) this.hostId = p.id;
    return p;
  }

  removePlayer(id) {
    const idx = this.players.findIndex((p) => p.id === id);
    if (idx === -1) return;
    this.players.splice(idx, 1);
    if (this.hostId === id) this.hostId = (this.players.find((p) => p.connected) || this.players[0])?.id ?? null;
    if (this.phase === 'lobby') return;
    if (this.players.length < MIN_PLAYERS) {
      this.phase = 'lobby';
      this.resetScore();
    } else if (this.phase === 'playing') {
      // Le nombre de jetons change : on redistribue le casse en cours
      this.heist--;
      this.newHeist();
    } else {
      this.checkContinue();
    }
  }

  start() {
    if (this.players.length < MIN_PLAYERS) throw new Error(`Il faut au moins ${MIN_PLAYERS} joueurs.`);
    this.resetScore();
    this.newHeist();
  }

  newHeist() {
    this.heist++;
    this.deck = newDeck();
    this.community = [];
    this.round = 0;
    this.showdown = null;
    for (const p of this.players) {
      p.hand = [this.deck.pop(), this.deck.pop()];
      p.history = [];
    }
    this.resetChips();
    this.phase = 'playing';
  }

  resetChips() {
    this.chips = {};
    for (let v = 1; v <= this.players.length; v++) this.chips[v] = null;
    this.clearReady();
  }

  clearReady() {
    for (const p of this.players) p.ready = false;
  }

  chipOf(id) {
    for (const [v, owner] of Object.entries(this.chips)) if (owner === id) return Number(v);
    return null;
  }

  // Prendre un jeton au centre, le voler à un autre joueur, ou reposer le sien.
  // Renvoie une description de l'action pour les notifications.
  takeChip(id, value) {
    if (this.phase !== 'playing') return null;
    if (!(value in this.chips)) return null;
    const owner = this.chips[value];
    const mine = this.chipOf(id);
    let event;
    if (owner === id) {
      this.chips[value] = null;
      event = { type: 'return', by: id, value };
    } else {
      if (mine !== null) this.chips[mine] = null;
      this.chips[value] = id;
      event = owner ? { type: 'steal', by: id, from: owner, value } : { type: 'take', by: id, value };
    }
    // Les positions ont changé : tout le monde doit revalider
    this.clearReady();
    return event;
  }

  toggleReady(id) {
    const p = this.player(id);
    if (!p) return;
    if (this.phase === 'playing') {
      if (this.chipOf(id) === null) return;
      p.ready = !p.ready;
      this.checkRoundEnd();
    } else if (this.phase === 'showdown') {
      p.ready = !p.ready;
      this.checkContinue();
    }
  }

  // Après l'abattage, on passe à la suite quand tous les joueurs connectés sont prêts
  checkContinue() {
    if (this.phase !== 'showdown') return;
    if (!this.players.every((q) => q.ready || !q.connected)) return;
    if (this.showdown.gameOver) {
      this.phase = 'gameover';
      this.clearReady();
    } else {
      this.newHeist();
    }
  }

  checkRoundEnd() {
    const allSet = this.players.every((p) => this.chipOf(p.id) !== null && p.ready);
    if (!allSet) return;
    for (const p of this.players) p.history[this.round] = this.chipOf(p.id);
    this.round++;
    if (this.round < ROUNDS.length) {
      for (let i = 0; i < ROUNDS[this.round].deal; i++) this.community.push(this.deck.pop());
      this.resetChips();
    } else {
      this.round = ROUNDS.length - 1;
      this.chips = {};
      this.resolve();
    }
  }

  resolve() {
    const evals = this.players.map((p) => ({ p, ev: evaluate([...p.hand, ...this.community]) }));
    const results = evals.map(({ p, ev }) => {
      // Plage de jetons correcte : égalités autorisées dans un sens ou dans l'autre
      const weaker = evals.filter((o) => compare(o.ev, ev) < 0).length;
      const equal = evals.filter((o) => compare(o.ev, ev) === 0).length;
      const chip = p.history[ROUNDS.length - 1];
      const lo = weaker + 1;
      const hi = weaker + equal;
      return {
        playerId: p.id,
        name: p.name,
        color: p.color,
        chip,
        hand: p.hand,
        handName: ev.name,
        best: ev.best,
        expected: [lo, hi],
        ok: chip >= lo && chip <= hi,
      };
    });
    results.sort((a, b) => a.chip - b.chip);
    const success = results.every((r) => r.ok);
    if (success) this.vaults++;
    else this.alarms++;
    this.results.push(success);
    let gameOver = null;
    if (this.vaults >= TARGET) gameOver = 'win';
    else if (this.alarms >= TARGET) gameOver = 'lose';
    this.showdown = { results, success, gameOver };
    this.phase = 'showdown';
    this.clearReady();
  }

  // État envoyé à un joueur : il ne voit que ses propres cartes avant l'abattage
  view(id) {
    const me = this.player(id);
    const reveal = this.phase === 'showdown' || this.phase === 'gameover';
    let hint = null;
    if (me && this.settings.hints && me.hand.length && this.phase !== 'lobby') {
      hint = evaluate([...me.hand, ...this.community]).name;
    }
    return {
      code: this.code,
      phase: this.phase,
      hostId: this.hostId,
      meId: id,
      settings: this.settings,
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      target: TARGET,
      vaults: this.vaults,
      alarms: this.alarms,
      heist: this.heist,
      results: this.results,
      round: this.round,
      rounds: ROUNDS.map(({ key, name, color }) => ({ key, name, color })),
      community: this.community,
      chips: this.chips,
      hint,
      showdown: reveal ? this.showdown : null,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        connected: p.connected,
        ready: p.ready,
        history: p.history,
        chip: this.chipOf(p.id),
        cards: p.id === id || reveal ? p.hand : null,
      })),
    };
  }
}

module.exports = { Room, MIN_PLAYERS, MAX_PLAYERS, ROUNDS };
