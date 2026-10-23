const express = require('express');
const http = require('http');
const os = require('os');
const path = require('path');
const { Server } = require('socket.io');
const { Room } = require('./lib/game');

const PORT = process.env.PORT || 3000;
const ROOM_TTL = 1000 * 60 * 60 * 6; // un salon sans activité disparaît au bout de 6 h
const HOST_GRACE = 1000 * 30; // délai avant de confier le rôle d'hôte à un autre joueur

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.send('ok'));

const server = http.createServer(app);
const io = new Server(server);
const rooms = new Map();

function newCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  do {
    code = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function cleanName(name) {
  const n = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!n) throw new Error('Choisis un pseudo.');
  return n;
}

function broadcast(room) {
  room.lastActivity = Date.now();
  for (const p of room.players) {
    if (p.socketId) io.to(p.socketId).emit('state', room.view(p.id));
  }
}

function notify(room, event) {
  if (!event) return;
  const name = (id) => room.player(id)?.name ?? '?';
  const of = (n) => (/^[aeiouyhàâéèêîôû]/i.test(n) ? `d'${n}` : `de ${n}`);
  const stars = '★'.repeat(event.value);
  let text;
  if (event.type === 'steal') text = `${name(event.by)} a pris le jeton ${stars} ${of(name(event.from))}`;
  else if (event.type === 'take') text = `${name(event.by)} a pris le jeton ${stars}`;
  else if (event.type === 'return') text = `${name(event.by)} a reposé le jeton ${stars}`;
  if (text) io.to(room.code).emit('toast', { text, type: event.type, by: event.by, from: event.from });
}

io.on('connection', (socket) => {
  let room = null;
  let me = null;

  const fail = (ack, err) => typeof ack === 'function' && ack({ error: err.message || String(err) });

  function attach(r, p, ack) {
    if (room && room !== r) socket.leave(room.code);
    room = r;
    me = p;
    // Un même joueur ouvert dans deux onglets : le dernier prend la main
    if (p.socketId && p.socketId !== socket.id) io.to(p.socketId).emit('replaced');
    p.socketId = socket.id;
    p.connected = true;
    socket.join(r.code);
    if (typeof ack === 'function') ack({ code: r.code, token: p.token, playerId: p.id });
    broadcast(r);
  }

  // Les actions de jeu passent toutes par ici
  function act(fn) {
    return (...args) => {
      const ack = typeof args[args.length - 1] === 'function' ? args.pop() : null;
      if (!room || !me || !room.player(me.id)) return fail(ack, new Error("Tu n'es dans aucun salon."));
      try {
        fn(...args);
        broadcast(room);
        if (ack) ack({ ok: true });
      } catch (err) {
        fail(ack, err);
      }
    };
  }

  socket.on('create', ({ name } = {}, ack) => {
    try {
      const r = new Room(newCode());
      rooms.set(r.code, r);
      attach(r, r.addPlayer(cleanName(name)), ack);
    } catch (err) {
      fail(ack, err);
    }
  });

  socket.on('join', ({ code, name, token } = {}, ack) => {
    try {
      const r = rooms.get(String(code ?? '').trim().toUpperCase());
      if (!r) throw new Error("Ce salon n'existe pas (ou plus).");
      const existing = r.playerByToken(token);
      if (existing) return attach(r, existing, ack);
      if (token && !name) throw new Error('Session expirée.');
      attach(r, r.addPlayer(cleanName(name)), ack);
    } catch (err) {
      fail(ack, err);
    }
  });

  socket.on('start', act(() => {
    if (room.hostId !== me.id) throw new Error("Seul l'hôte peut lancer la partie.");
    room.start();
  }));

  socket.on('settings', act((settings = {}) => {
    if (room.hostId !== me.id) throw new Error("Seul l'hôte peut changer les options.");
    if (typeof settings.hints === 'boolean') room.settings.hints = settings.hints;
  }));

  socket.on('takeChip', act((value) => {
    notify(room, room.takeChip(me.id, Number(value)));
  }));

  socket.on('ready', act(() => room.toggleReady(me.id)));

  socket.on('kick', act((playerId) => {
    if (room.hostId !== me.id) throw new Error("Seul l'hôte peut retirer un joueur.");
    const target = room.player(playerId);
    if (!target || target.id === me.id) return;
    if (target.socketId) io.to(target.socketId).emit('kicked');
    room.removePlayer(target.id);
  }));

  socket.on('backToLobby', act(() => {
    if (room.hostId !== me.id) throw new Error("Seul l'hôte peut faire ça.");
    room.phase = 'lobby';
    room.resetScore();
    for (const p of room.players) p.hand = [];
  }));

  socket.on('leave', (ack) => {
    if (room && me) {
      const r = room;
      socket.leave(r.code);
      r.removePlayer(me.id);
      room = null;
      me = null;
      if (r.players.length === 0) rooms.delete(r.code);
      else broadcast(r);
    }
    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('disconnect', () => {
    if (!room || !me || me.socketId !== socket.id) return;
    me.socketId = null;
    me.connected = false;
    // Un hôte absent ne doit pas bloquer le salon, mais on lui laisse le temps
    // de revenir (simple rechargement de page)
    if (room.hostId === me.id) {
      const r = room;
      const p = me;
      setTimeout(() => {
        if (p.connected || r.hostId !== p.id || !r.player(p.id)) return;
        const other = r.players.find((q) => q.connected);
        if (other) {
          r.hostId = other.id;
          broadcast(r);
        }
      }, HOST_GRACE);
    }
    room.checkContinue();
    broadcast(room);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) {
    if (now - r.lastActivity > ROOM_TTL && r.players.every((p) => !p.connected)) rooms.delete(code);
  }
}, 1000 * 60 * 10);

server.listen(PORT, () => {
  console.log(`\n  The Gang tourne sur http://localhost:${PORT}`);
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) console.log(`  Sur le même Wi-Fi : http://${a.address}:${PORT}`);
    }
  }
  console.log('');
});
