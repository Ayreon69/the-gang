// Vérifications rapides de l'évaluateur et de la résolution d'un casse : `npm test`
const assert = require('assert');
const { evaluate, compare } = require('../lib/hands');
const { Room } = require('../lib/game');

// "Ah Kd 10s" -> cartes
const parse = (str) => str.split(' ').map((t) => {
  const s = t.slice(-1);
  const v = t.slice(0, -1);
  const r = { J: 11, Q: 12, K: 13, A: 14 }[v] || Number(v);
  return { r, s };
});
const name = (str) => evaluate(parse(str)).name;
const cmp = (a, b) => Math.sign(compare(evaluate(parse(a)), evaluate(parse(b))));

assert.strictEqual(name('Ah Kh Qh Jh 10h 2c 3d'), 'Quinte flush royale');
assert.strictEqual(name('5s 4s 3s 2s As Kd Kc'), 'Quinte flush hauteur 5');
assert.strictEqual(name('9c 9d 9h 9s 2c 3d 4h'), 'Carré de 9');
assert.strictEqual(name('Kc Kd Kh 7s 7c 2d 3h'), 'Full aux Rois par les 7');
assert.strictEqual(name('Qc Qd Qh As Ac Ad 2h'), 'Full aux As par les Dames');
assert.strictEqual(name('Ac 9c 7c 4c 2c Kd Kh'), 'Couleur hauteur As');
assert.strictEqual(name('Ad 2c 3h 4s 5d Kc Kh'), 'Suite hauteur 5');
assert.strictEqual(name('10d Jc Qh Ks Ad 2c 2h'), 'Suite hauteur As');
assert.strictEqual(name('Jc Jd Jh 2s 5c 8d Kh'), 'Brelan de Valets');
assert.strictEqual(name('Ac Ad 5h 5s Kc Kd 2h'), 'Double paire As et Rois');
assert.strictEqual(name('Ac Ad 5h 7s 9c'), "Paire d'As");
assert.strictEqual(name('Ac 2d'), 'Hauteur As');
assert.strictEqual(name('8c 8d'), 'Paire de 8');

// Kickers
assert.strictEqual(cmp('Ac Ad Kh 7s 2c 3d 4h', 'As Ah Qh 7d 2s 3c 4d'), 1);
// Égalité parfaite (même board)
assert.strictEqual(cmp('2c 3d Ah Kh Qh Jh 10h', '4c 5d Ah Kh Qh Jh 10h'), 0);
// Double paire : la 3e paire du joueur ne compte pas, le kicker oui
assert.strictEqual(cmp('Ac Ad Kc Kd 5h 5s 2c', 'As Ah Ks Kh Qd 3c 2d'), -1);
// Suite contre roue
assert.strictEqual(cmp('6d 2c 3h 4s 5d Kc Qh', 'Ad 2c 3h 4s 5d Kc Qh'), 1);

// Résolution : ordre correct => casse réussi
const room = new Room('TEST');
const [a, b, c] = ['A', 'B', 'C'].map((n) => room.addPlayer(n));
room.start();
room.community = parse('2c 7d 9h Js 4c');
a.hand = parse('Ac Ad'); // paire d'As
b.hand = parse('3s 3h'); // paire de 3
c.hand = parse('Kc Qd'); // hauteur Roi
a.history = [3, 3, 3, 3];
b.history = [2, 2, 2, 2];
c.history = [1, 1, 1, 1];
room.resolve();
assert.strictEqual(room.showdown.success, true);
assert.strictEqual(room.vaults, 1);

// Ordre inversé => alarme
a.history[3] = 2;
b.history[3] = 3;
room.resolve();
assert.strictEqual(room.showdown.success, false);
assert.strictEqual(room.alarms, 1);

// Égalité : les deux ordres sont acceptés
b.hand = parse('Ah As');
a.history[3] = 2;
b.history[3] = 3;
room.resolve();
assert.strictEqual(room.showdown.success, true);

// Déroulé complet d'un casse via les actions des joueurs
const r2 = new Room('FLOW');
const ps = ['X', 'Y', 'Z'].map((n) => r2.addPlayer(n));
r2.start();
for (let round = 0; round < 4; round++) {
  assert.strictEqual(r2.phase, 'playing');
  ps.forEach((p, i) => r2.takeChip(p.id, i + 1));
  // Un vol remet tout le monde à zéro
  r2.toggleReady(ps[0].id);
  r2.takeChip(ps[1].id, 1);
  assert.strictEqual(ps[0].ready, false);
  assert.strictEqual(r2.chipOf(ps[0].id), null);
  r2.takeChip(ps[0].id, 2);
  ps.forEach((p) => r2.toggleReady(p.id));
  assert.strictEqual(r2.community.length, [3, 4, 5, 5][round]);
}
assert.strictEqual(r2.phase, 'showdown');
assert.deepStrictEqual(ps.map((p) => p.history), [[2, 2, 2, 2], [1, 1, 1, 1], [3, 3, 3, 3]]);
ps.forEach((p) => r2.toggleReady(p.id));
// Joueurs non connectés comptés comme prêts : le casse suivant démarre
assert.strictEqual(r2.phase, 'playing');
assert.strictEqual(r2.heist, 2);

console.log('Tous les tests passent ✔');
