// Évaluation des mains de poker (Texas Hold'em) : meilleure combinaison
// parmi 2 à 7 cartes. Une carte = { r: 2..14, s: 's'|'h'|'d'|'c' }.

const RANK_NAME = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'Valet', 12: 'Dame', 13: 'Roi', 14: 'As' };
const RANK_PLURAL = { ...RANK_NAME, 11: 'Valets', 12: 'Dames', 13: 'Rois', 14: 'As' };

const CATEGORY = ['Carte haute', 'Paire', 'Double paire', 'Brelan', 'Suite', 'Couleur', 'Full', 'Carré', 'Quinte flush'];

// "de Rois", "d'As", "de 8"
const of = (r) => (r === 14 ? "d'As" : `de ${RANK_PLURAL[r]}`);
// "aux Rois", "aux As", "aux 8"
const aux = (r) => `aux ${RANK_PLURAL[r]}`;
const parLes = (r) => `par les ${RANK_PLURAL[r]}`;

function groupByRank(cards) {
  const map = new Map();
  for (const c of cards) {
    if (!map.has(c.r)) map.set(c.r, []);
    map.get(c.r).push(c);
  }
  // Tri : groupes les plus nombreux d'abord, puis par rang décroissant
  return [...map.entries()]
    .map(([r, cs]) => ({ r, cards: cs }))
    .sort((a, b) => b.cards.length - a.cards.length || b.r - a.r);
}

// Cherche la meilleure suite (5 rangs consécutifs, As bas autorisé)
function findStraight(cards) {
  const byRank = new Map();
  for (const c of cards) if (!byRank.has(c.r)) byRank.set(c.r, c);
  if (byRank.has(14)) byRank.set(1, byRank.get(14));
  for (let high = 14; high >= 5; high--) {
    const run = [];
    for (let r = high; r > high - 5; r--) {
      if (!byRank.has(r)) break;
      run.push(byRank.get(r));
    }
    if (run.length === 5) return { high, cards: run };
  }
  return null;
}

function make(category, score, best, name) {
  return { category, score: [category, ...score], best, name };
}

function evaluate(input) {
  const cards = [...input].sort((a, b) => b.r - a.r);
  const bySuit = {};
  for (const c of cards) (bySuit[c.s] ||= []).push(c);

  // Quinte flush
  let sf = null;
  for (const s in bySuit) {
    if (bySuit[s].length < 5) continue;
    const st = findStraight(bySuit[s]);
    if (st && (!sf || st.high > sf.high)) sf = st;
  }
  if (sf) {
    const name = sf.high === 14 ? 'Quinte flush royale' : `Quinte flush hauteur ${RANK_NAME[sf.high]}`;
    return make(8, [sf.high], sf.cards, name);
  }

  const groups = groupByRank(cards);
  const kickers = (used, n) => cards.filter((c) => !used.includes(c)).slice(0, n);

  // Carré
  if (groups[0] && groups[0].cards.length === 4) {
    const q = groups[0];
    const k = kickers(q.cards, 1);
    return make(7, [q.r, ...k.map((c) => c.r)], [...q.cards, ...k], `Carré ${of(q.r)}`);
  }

  const trips = groups.filter((g) => g.cards.length === 3);
  const pairs = groups.filter((g) => g.cards.length === 2);

  // Full
  if (trips.length && (trips.length > 1 || pairs.length)) {
    const t = trips[0];
    const candidates = [...trips.slice(1), ...pairs].sort((a, b) => b.r - a.r);
    const p = candidates[0];
    return make(6, [t.r, p.r], [...t.cards, ...p.cards.slice(0, 2)], `Full ${aux(t.r)} ${parLes(p.r)}`);
  }

  // Couleur
  for (const s in bySuit) {
    if (bySuit[s].length >= 5) {
      const best = bySuit[s].slice(0, 5);
      return make(5, best.map((c) => c.r), best, `Couleur hauteur ${RANK_NAME[best[0].r]}`);
    }
  }

  // Suite
  const st = findStraight(cards);
  if (st) return make(4, [st.high], st.cards, `Suite hauteur ${RANK_NAME[st.high]}`);

  // Brelan
  if (trips.length) {
    const t = trips[0];
    const k = kickers(t.cards, 2);
    return make(3, [t.r, ...k.map((c) => c.r)], [...t.cards, ...k], `Brelan ${of(t.r)}`);
  }

  // Double paire
  if (pairs.length >= 2) {
    const [p1, p2] = pairs;
    const k = kickers([...p1.cards, ...p2.cards], 1);
    return make(2, [p1.r, p2.r, ...k.map((c) => c.r)], [...p1.cards, ...p2.cards, ...k],
      `Double paire ${RANK_PLURAL[p1.r]} et ${RANK_PLURAL[p2.r]}`);
  }

  // Paire
  if (pairs.length) {
    const p = pairs[0];
    const k = kickers(p.cards, 3);
    return make(1, [p.r, ...k.map((c) => c.r)], [...p.cards, ...k], `Paire ${of(p.r)}`);
  }

  // Carte haute
  const best = cards.slice(0, 5);
  return make(0, best.map((c) => c.r), best, `Hauteur ${RANK_NAME[best[0].r]}`);
}

// < 0 si a est plus faible que b, 0 si égalité, > 0 si a est plus forte
function compare(a, b) {
  const n = Math.max(a.score.length, b.score.length);
  for (let i = 0; i < n; i++) {
    const d = (a.score[i] ?? 0) - (b.score[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

module.exports = { evaluate, compare, CATEGORY, RANK_NAME };
