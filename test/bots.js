// Ajoute des joueurs robots dans un salon pour tester seul :
//   node test/bots.js CODE [nombre=2] [url=http://localhost:3000]
const { io } = require('socket.io-client');
const { evaluate } = require('../lib/hands');

const [code, count = '2', url = 'http://localhost:3000'] = process.argv.slice(2);
if (!code) {
  console.log('Usage : node test/bots.js CODE [nombre] [url]');
  process.exit(1);
}

const NAMES = ['Bonnie', 'Clyde', 'Arsène', 'Danny', 'Rusty'];
const later = (fn) => setTimeout(fn, 400 + Math.random() * 1200);

// Estimation grossière de la force d'une main, entre 0 et 1
function strength(cards) {
  const ev = evaluate(cards);
  return Math.min(1, (ev.score[0] + (ev.score[1] - 2) / 13) / 5);
}

for (let i = 0; i < Number(count); i++) {
  const socket = io(url);
  let busy = false;
  socket.on('connect', () => {
    socket.emit('join', { code, name: NAMES[i] }, (res) => {
      if (res.error) console.log(`${NAMES[i]} : ${res.error}`);
      else console.log(`${NAMES[i]} a rejoint ${code}`);
    });
  });
  socket.on('state', (st) => {
    if (busy) return;
    const me = st.players.find((p) => p.id === st.meId);
    if (!me) return;
    if (st.phase === 'playing') {
      const n = st.players.length;
      if (!me.chip) {
        const wanted = Math.round(strength([...me.cards, ...st.community]) * (n - 1)) + 1;
        const free = Object.keys(st.chips).map(Number).filter((v) => !st.chips[v]);
        const pick = free.sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted))[0];
        busy = true;
        later(() => { busy = false; socket.emit('takeChip', pick); });
      } else if (!me.ready) {
        busy = true;
        later(() => { busy = false; socket.emit('ready'); });
      }
    } else if (st.phase === 'showdown' && !me.ready) {
      busy = true;
      setTimeout(() => { busy = false; socket.emit('ready'); }, 4000);
    }
  });
  socket.on('kicked', () => process.exit(0));
}
