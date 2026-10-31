'use strict';

/* ---------- Utilitaires ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const store = {
  get(k, d = null) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ }
  },
  del(k) {
    try { localStorage.removeItem(k); } catch { /* stockage indisponible */ }
  },
};

// La session est gardée par onglet (plusieurs joueurs sur un même navigateur)
// et dans le navigateur (pour revenir après l'avoir fermé).
const sessionStore = {
  get() {
    try {
      const v = sessionStorage.getItem('thegang:session');
      if (v) return JSON.parse(v);
    } catch { /* stockage indisponible */ }
    return store.get('thegang:session');
  },
  set(v) {
    try { sessionStorage.setItem('thegang:session', JSON.stringify(v)); } catch { /* stockage indisponible */ }
    store.set('thegang:session', v);
  },
  del() {
    try { sessionStorage.removeItem('thegang:session'); } catch { /* stockage indisponible */ }
    store.del('thegang:session');
  },
};

// Les cartes suivent l'usage anglais : J, Q, K, A
const SUIT_LABEL = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
const RANK = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const RANK_LABEL = { 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace' };
const COLOR_NAME = { white: 'blancs', yellow: 'jaunes', orange: 'orange', red: 'rouges' };
const cardKey = (c) => `${c.r}${c.s}`;
const of = (name) => (/^[aeiouyhàâéèêîôû]/i.test(name) ? `d'${name}` : `de ${name}`);

const ICON = {
  vault: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="18" height="16" rx="2.5"/><circle cx="12" cy="11" r="4"/><path d="M12 7v1.6M12 13.4V15M8 11h1.6M14.4 11H16M6.5 19v2M17.5 19v2"/></svg>',
  alarm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6.5 18v-5a5.5 5.5 0 0 1 11 0v5"/><rect x="4" y="18" width="16" height="3" rx="1"/><path d="M12 2.5v2M4 6l1.5 1.5M20 6l-1.5 1.5M10 13a2 2 0 0 1 2-2"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v12h14V9"/><path d="M10 21v-7h4v7"/></svg>',
  feedback: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 4"/><circle cx="12" cy="17.6" r=".6" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
  crown: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

/* ---------- Sons (synthétisés, aucun fichier) ---------- */

const Sound = {
  ctx: null,
  on: store.get('thegang:sound', true),
  audio() {
    if (!this.on) return null;
    try {
      this.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  },
  tone(freq, dur, { type = 'sine', vol = 0.12, at = 0, slide = 0 } = {}) {
    const ctx = this.audio();
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  },
  chip() {
    this.tone(1800, 0.05, { type: 'triangle', vol: 0.08 });
    this.tone(2600, 0.04, { type: 'triangle', vol: 0.05, at: 0.025 });
  },
  deal() {
    for (let i = 0; i < 3; i++) this.tone(420 - i * 40, 0.07, { type: 'triangle', vol: 0.05, at: i * 0.07, slide: 0.6 });
  },
  ready() {
    this.tone(660, 0.08, { vol: 0.07 });
    this.tone(990, 0.12, { vol: 0.07, at: 0.07 });
  },
  success() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.1, at: i * 0.1 }));
  },
  alarm() {
    for (let i = 0; i < 4; i++) this.tone(i % 2 ? 620 : 880, 0.22, { type: 'square', vol: 0.04, at: i * 0.22 });
  },
};

/* ---------- État local ---------- */

const S = {
  state: null,
  session: sessionStore.get(), // { code, token }
  name: store.get('thegang:name', ''),
  codeInput: '',
  connected: false,
  modal: null, // 'rules' | 'menu'
  replaced: false,
  seenCards: new Set(),
  showdownKey: null, // casse dont l'abattage est affiché, et depuis quand
  showdownAt: 0,
  gameOverKey: null,
  gameOverAt: 0,
  confetti: '',
};

const params = new URLSearchParams(location.search);
let urlCode = (params.get('salon') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || null;

/* ---------- Connexion ---------- */

const socket = io();

socket.on('connect', () => {
  S.connected = true;
  if (S.session) rejoin();
  else render();
  renderBanner();
});
socket.on('disconnect', () => {
  S.connected = false;
  renderBanner();
});
socket.on('state', onState);
socket.on('toast', onToast);
socket.on('kicked', () => {
  leaveLocally();
  toast("L'hôte t'a retiré du salon.", 'warn');
});
socket.on('replaced', () => {
  S.replaced = true;
  render();
});

function rejoin() {
  const sess = S.session;
  if (urlCode && urlCode !== sess.code) {
    // Lien d'invitation vers un autre salon : on oublie l'ancien
    clearSession();
    render();
    return;
  }
  socket.emit('join', { code: sess.code, token: sess.token }, (res) => {
    if (res?.error) {
      clearSession();
      urlCode = null;
      history.replaceState(null, '', location.pathname);
      render();
      toast(res.error, 'warn');
    }
  });
}

function clearSession() {
  S.session = null;
  sessionStore.del();
}

function leaveLocally() {
  clearSession();
  S.state = null;
  S.modal = null;
  urlCode = null;
  history.replaceState(null, '', location.pathname);
  render();
}

function handleJoin(res) {
  if (res?.error) return toast(res.error, 'warn');
  S.session = { code: res.code, token: res.token };
  sessionStore.set(S.session);
}

function emit(event, payload) {
  const args = payload === undefined ? [event] : [event, payload];
  socket.emit(...args, (res) => {
    if (res?.error) toast(res.error, 'warn');
  });
}

function onState(st) {
  const prev = S.state;
  S.state = st;
  S.replaced = false;
  urlCode = st.code;
  if (new URLSearchParams(location.search).get('salon') !== st.code) history.replaceState(null, '', `?salon=${st.code}`);
  playTransitions(prev, st);
  render();
}

function onToast(t) {
  const st = S.state;
  if (!st) return;
  Sound.chip();
  if (t.by === st.meId) return;
  if (t.type === 'steal' && t.from === st.meId) {
    const who = st.players.find((p) => p.id === t.by)?.name ?? 'Quelqu\'un';
    toast(`${who} t'a pris ton jeton !`, 'warn');
  } else {
    toast(t.text);
  }
}

function playTransitions(prev, st) {
  if (!prev || prev.code !== st.code) return;
  if (st.phase === 'playing' && (prev.phase !== 'playing' || st.heist !== prev.heist)) Sound.deal();
  else if (st.community.length > prev.community.length) Sound.deal();
  else if (st.phase === 'playing' && st.round === prev.round) {
    const me = st.players.find((p) => p.id === st.meId);
    const meBefore = prev.players.find((p) => p.id === st.meId);
    if (me?.ready && !meBefore?.ready) Sound.ready();
  }
  if (st.phase === 'showdown' && prev.phase === 'playing') {
    const delay = (st.showdown.results.length * 0.55 + 0.3) * 1000;
    setTimeout(() => (st.showdown.success ? Sound.success() : Sound.alarm()), delay);
  }
}

/* ---------- Notifications ---------- */

function toast(text, type = '') {
  const root = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = text;
  root.append(el);
  while (root.children.length > 4) root.firstChild.remove();
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3000);
}

function renderBanner() {
  $('#netbanner').hidden = S.connected || !(S.state || S.session);
}

/* ---------- Composants ---------- */

// Les cartes sont dessinées en SVG, dans un repère de 250 × 350 : nettes à toutes les tailles
const GOLD = '#d9a441';
const suitIcon = (s, cx, cy, size, flip = false, fill = '') => `<use href="#suit-${s}" x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}"${flip ? ` transform="rotate(180 ${cx} ${cy})"` : ''}${fill ? ` fill="${fill}"` : ''}/>`;
const rankText = (rank, x, y, size) => `<text class="c-rank" x="${x}" y="${y}" font-size="${size}" text-anchor="middle"${String(rank).length > 1 ? ` textLength="${size}" lengthAdjust="spacingAndGlyphs"` : ''}>${rank}</text>`;

// Emplacement des motifs de 2 à 10 : colonnes gauche, milieu, droite
const pipSpots = (() => {
  const [L, M, R] = [88, 125, 162];
  const pair = (...ys) => ys.flatMap((y) => [[L, y], [R, y]]);
  return {
    2: [[M, 70], [M, 280]],
    3: [[M, 70], [M, 175], [M, 280]],
    4: pair(70, 280),
    5: [...pair(70, 280), [M, 175]],
    6: pair(70, 175, 280),
    7: [...pair(70, 175, 280), [M, 122]],
    8: [...pair(70, 175, 280), [M, 122], [M, 228]],
    9: [...pair(70, 140, 210, 280), [M, 175]],
    10: [...pair(70, 140, 210, 280), [M, 105], [M, 245]],
  };
})();

// Buste des figures : la moitié haute, retournée ensuite pour la moitié basse
function courtBust(rank, robe) {
  const skin = '#f4d3ae';
  const line = '#2a1a14';
  const body = `<path d="M62 172c0-30 28-42 44-48h38c16 6 44 18 44 48z" fill="${robe}"/>
    <path d="M106 124l19 42 19-42" fill="#f6efe0" stroke="${GOLD}" stroke-width="4" stroke-linejoin="round"/>
    <rect x="114" y="104" width="22" height="24" fill="#dfb78f"/>
    <ellipse cx="125" cy="90" rx="22" ry="26" fill="${skin}"/>
    <circle cx="116" cy="87" r="2.6" fill="${line}"/><circle cx="134" cy="87" r="2.6" fill="${line}"/>`;
  const mouth = '<path d="M119 102q6 4 12 0" fill="none" stroke="#a8433f" stroke-width="2.4" stroke-linecap="round"/>';
  if (rank === 13) {
    return `${body}
      <path d="M103 92c0 32 44 32 44 0-5 11-13 8-22 8s-17 3-22-8z" fill="#ece5d6"/>${mouth}
      <path d="M100 72V44l13 15 12-20 12 20 13-15v28z" fill="${GOLD}" stroke="#a8741a" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="125" cy="64" r="4" fill="#c1121f"/><circle cx="109" cy="66" r="2.5" fill="#f6efe0"/><circle cx="141" cy="66" r="2.5" fill="#f6efe0"/>`;
  }
  if (rank === 12) {
    return `<path d="M97 96c-5-40 61-40 56 0 4 20 7 32-1 38H98c-8-6-5-18-1-38z" fill="#9a4f22"/>${body}
      <path d="M103 88c2-22 42-22 44 0-12-13-32-13-44 0z" fill="#9a4f22"/>${mouth}
      <path d="M106 128q19 22 38 0" fill="none" stroke="${GOLD}" stroke-width="3"/><circle cx="125" cy="140" r="4.5" fill="#c1121f" stroke="${GOLD}" stroke-width="1.5"/>
      <path d="M105 72l5-17 8 9 7-18 7 18 8-9 5 17z" fill="${GOLD}" stroke="#a8741a" stroke-width="2" stroke-linejoin="round"/>`;
  }
  return `${body}
    <path d="M102 104c-4-26 2-38 23-38s27 12 23 38c-2-10-3-16-6-20h-34c-3 4-4 10-6 20z" fill="#6b3a1e"/>${mouth}
    <path d="M150 64c18-10 26-26 18-34-8 14-18 20-26 28z" fill="${GOLD}"/>
    <ellipse cx="125" cy="66" rx="31" ry="12" fill="${robe}" stroke="${GOLD}" stroke-width="2.5"/>`;
}

function cardArt(c, mini) {
  const rank = RANK[c.r] || c.r;
  if (mini) return `${rankText(rank, 76, 112, 104)}${suitIcon(c.s, 166, 254, 142)}`;

  const rankSize = c.r === 10 ? 44 : c.r > 10 && c.r < 14 ? 50 : 56;
  const corner = `${rankText(rank, 35, 62, rankSize)}${suitIcon(c.s, 35, 88, 36)}`;
  const corners = `${corner}<g transform="rotate(180 125 175)">${corner}</g>`;
  let middle;
  if (c.r === 14) {
    const studs = [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<circle cx="125" cy="87" r="4" fill="${GOLD}" transform="rotate(${a} 125 175)"/>`).join('');
    middle = `<circle cx="125" cy="175" r="78" fill="none" stroke="${GOLD}" stroke-width="3"/><circle cx="125" cy="175" r="69" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="3 6"/>${studs}${suitIcon(c.s, 125, 175, 102)}`;
  } else if (c.r > 10) {
    const red = c.s === 'h' || c.s === 'd';
    const half = `${suitIcon(c.s, 78, 60, 30, false, '#f6efe0')}${courtBust(c.r, red ? '#1c2540' : '#a81e36')}`;
    middle = `<rect x="56" y="34" width="138" height="282" rx="9" fill="${red ? '#8f1730' : '#1c2540'}" stroke="${GOLD}" stroke-width="3"/>
      <rect x="63" y="41" width="124" height="268" rx="5" fill="none" stroke="${GOLD}" stroke-width="1.2" opacity=".55"/>
      ${half}<g transform="rotate(180 125 175)">${half}</g>
      <rect x="56" y="171" width="138" height="8" fill="${GOLD}"/>
      <circle cx="125" cy="175" r="19" fill="#f6efe0" stroke="${GOLD}" stroke-width="3"/>${suitIcon(c.s, 125, 175, 22)}`;
  } else {
    middle = pipSpots[c.r].map(([x, y]) => suitIcon(c.s, x, y, 50, y > 175)).join('');
  }
  return `<rect x="9" y="9" width="232" height="332" rx="15" fill="none" stroke="${GOLD}" stroke-width="2" opacity=".5"/>${corners}${middle}`;
}

function card(c, { size = '', key = '', hl = null } = {}) {
  const red = c.s === 'h' || c.s === 'd';
  const cls = ['card', size, red ? 'red' : '', hl === true ? 'hl' : '', hl === false ? 'dim' : ''].join(' ');
  const label = `${RANK_LABEL[c.r] || c.r} of ${SUIT_LABEL[c.s]}`;
  return `<div class="${cls}" role="img" aria-label="${label}" ${key ? `data-card="${key}"` : ''}><svg viewBox="0 0 250 350" fill="currentColor" aria-hidden="true">${cardArt(c, size === 'sm')}</svg></div>`;
}

const cardBack = (size = '', key = '') => `<div class="card back ${size}" ${key ? `data-card="${key}"` : ''}></div>`;

const stars = (n) => Array.from({ length: n }, (_, i) => `<span class="star" style="--a:${(360 / n) * i}deg">★</span>`).join('');

// Jeton de casino : couleur de l'étape + valeur
function chip(value, color, { size = '', key = '', action = '', title = '', ghost = false } = {}) {
  const tag = action ? 'button' : 'div';
  const attrs = [
    key ? `data-chip="${key}"` : '',
    action ? `data-action="${action}" data-value="${value}"` : '',
    title ? `title="${esc(title)}" aria-label="${esc(title)}"` : '',
  ].join(' ');
  return `<${tag} class="chip chip-${color} ${size} ${ghost ? 'ghost' : ''}" ${attrs}>
    ${size === 'xs' || size === 'sm' ? '' : `<span class="stars">${stars(value)}</span>`}
    <span class="num">${value}</span>
  </${tag}>`;
}

const avatar = (p, size = '') => `<span class="avatar ${size}" style="--pc:${p.color}">${esc((p.name || '?').trim().charAt(0).toUpperCase())}</span>`;

function historyChips(p, st, size = 'xs') {
  return `<div class="history" aria-label="Jetons des étapes précédentes">${st.rounds.map((r, i) => {
    const v = p.history[i];
    return v ? chip(v, r.color, { size, title: `${r.name} : ${v}` }) : `<span class="chip-ghost ${size}"></span>`;
  }).join('')}</div>`;
}

function iconButton(action, icon, label, extra = '') {
  return `<button class="icon-btn ${extra}" data-action="${action}" title="${label}" aria-label="${label}">${icon}</button>`;
}

function scoreboard(st) {
  const icons = (n, icon, cls) => Array.from({ length: st.target }, (_, i) => `<span class="score-icon ${cls} ${i < n ? 'on' : ''}">${icon}</span>`).join('');
  return `<div class="scoreboard">
    <div class="score-group" title="Coffres ouverts : ${st.vaults}/${st.target}">${icons(st.vaults, ICON.vault, 'vault')}</div>
    <span class="score-sep"></span>
    <div class="score-group" title="Alarmes : ${st.alarms}/${st.target}">${icons(st.alarms, ICON.alarm, 'alarm')}</div>
  </div>`;
}

function topbar(st) {
  return `<header class="topbar">
    <div class="brand"><span class="logo-sm">The Gang</span>${st ? `<span class="room-pill">Salon <b>${st.code}</b></span>` : ''}</div>
    ${st && st.phase !== 'lobby' ? scoreboard(st) : '<span></span>'}
    <div class="tools">
      ${iconButton('sound', Sound.on ? ICON.soundOn : ICON.soundOff, Sound.on ? 'Couper le son' : 'Activer le son')}
      ${iconButton('rules', ICON.help, 'Règles du jeu')}
      ${st ? iconButton('menu', ICON.menu, 'Options') : ''}
    </div>
  </header>`;
}

/* ---------- Écrans ---------- */

function viewHome() {
  const joining = urlCode;
  const decor = ['♠', '♥', '♦', '♣', '★', '♠', '♥', '♦', '♣', '★', '♠', '♥']
    .map((s, i) => `<span class="float-suit ${s === '♥' || s === '♦' ? 'red' : ''}" style="left:${(i * 37 + 5) % 96}%;top:${(i * 53 + 7) % 92}%;font-size:${44 + ((i * 29) % 70)}px;animation-delay:${-i * 1.7}s">${s}</span>`).join('');
  return `<main class="home">
    <div class="home-decor" aria-hidden="true">${decor}</div>
    <div class="home-links"><a class="all-games" href="https://akhis-games.onrender.com">${ICON.home} Tous les jeux</a><a class="all-games" href="https://akhis-games.onrender.com/feedback.html?jeu=gang">${ICON.feedback} Feedback</a></div>
    <div class="home-card">
      <div class="hero" aria-hidden="true">
        <div class="hero-cards">${card({ r: 14, s: 's' }, { size: 'lg' })}${card({ r: 13, s: 'h' }, { size: 'lg' })}</div>
        <div class="hero-chips">${chip(1, 'white')}${chip(3, 'yellow')}${chip(5, 'red')}</div>
      </div>
      <p class="kicker">Poker coopératif</p>
      <h1 class="logo">The Gang</h1>
      <p class="tagline">Classez vos mains sans dire un mot.<br>Trois casses réussis et l'équipe repart fortune faite.</p>

      <label class="field">
        <span>Ton pseudo</span>
        <input id="name" maxlength="16" autocomplete="nickname" placeholder="Ex : Le Professeur" value="${esc(S.name)}">
      </label>

      ${joining ? `
        <button class="btn btn-primary btn-xl" data-action="joinUrl">Rejoindre le salon <b>${joining}</b></button>
        <button class="btn btn-link" data-action="forgetUrl">Créer un autre salon</button>
      ` : `
        <button class="btn btn-primary btn-xl" data-action="create">Créer un salon</button>
        <div class="divider"><span>ou rejoindre des amis</span></div>
        <div class="join-row">
          <input id="code" class="code-input" maxlength="4" placeholder="CODE" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(S.codeInput)}">
          <button class="btn btn-secondary" data-action="join">Rejoindre</button>
        </div>
      `}
      <button class="btn btn-link" data-action="rules">Comment jouer ?</button>
    </div>
  </main>`;
}

function viewLoading() {
  return `<main class="center-screen"><div class="spinner"></div><p>Connexion au salon…</p></main>`;
}

function viewReplaced() {
  return `<main class="center-screen">
    <h2>Partie ouverte ailleurs</h2>
    <p>Tu as ouvert le jeu dans un autre onglet ou sur un autre appareil.</p>
    <button class="btn btn-primary" data-action="reload">Reprendre ici</button>
  </main>`;
}

function viewLobby() {
  const st = S.state;
  const isHost = st.hostId === st.meId;
  const host = st.players.find((p) => p.id === st.hostId);
  const n = st.players.length;
  const canStart = n >= st.minPlayers;
  const roster = st.players.map((p) => `
    <li class="roster-item ${p.connected ? '' : 'is-off'}">
      ${avatar(p)}
      <span class="roster-name">${esc(p.name)}${p.id === st.meId ? ' <small>(toi)</small>' : ''}</span>
      ${p.id === st.hostId ? `<span class="badge badge-host">${ICON.crown} Hôte</span>` : ''}
      ${!p.connected ? '<span class="badge">Hors ligne</span>' : ''}
      ${isHost && p.id !== st.meId ? `<button class="icon-btn small" data-action="kick" data-id="${p.id}" title="Retirer ${esc(p.name)}" aria-label="Retirer ${esc(p.name)}">${ICON.close}</button>` : ''}
    </li>`).join('');
  const emptySeats = Array.from({ length: st.maxPlayers - n }, () => '<li class="roster-item empty"><span class="avatar empty">+</span><span class="roster-name">Place libre</span></li>').join('');

  return `<main class="lobby">
    ${topbar(st)}
    <section class="lobby-card">
      <div class="lobby-head">
        <p class="kicker">Planque de l'équipe</p>
        <div class="room-code" aria-label="Code du salon">${st.code.split('').map((l) => `<span>${l}</span>`).join('')}</div>
        <p class="muted">Envoie ce code ou le lien à tes amis.</p>
        <button class="btn btn-secondary" data-action="copyLink">${ICON.link} Copier le lien d'invitation</button>
      </div>

      <div class="lobby-body">
        <h3>L'équipe <span class="muted">${n}/${st.maxPlayers}</span></h3>
        <ul class="roster">${roster}${emptySeats}</ul>

        <label class="toggle ${isHost ? '' : 'disabled'}">
          <input type="checkbox" data-action="toggleHints" ${st.settings.hints ? 'checked' : ''} ${isHost ? '' : 'disabled'}>
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
          <span><b>Aide</b> — afficher le nom de ma combinaison<br><small class="muted">Pratique pour débuter. Seul l'hôte peut changer ce réglage.</small></span>
        </label>

        ${isHost
          ? `<button class="btn btn-primary btn-xl" data-action="start" ${canStart ? '' : 'disabled'}>Lancer le casse</button>
             <p class="muted center">${canStart ? 'Idéal à 3 joueurs ou plus.' : `Il faut au moins ${st.minPlayers} joueurs (3 à 6 conseillés).`}</p>`
          : `<div class="waiting"><span class="dots"><i></i><i></i><i></i></span> En attente que ${esc(host?.name ?? "l'hôte")} lance la partie</div>`}
      </div>
    </section>
  </main>`;
}

// Position des adversaires autour de la table (en % du calque des sièges)
function seatPos(i, total) {
  const half = { 1: 0, 2: 48, 3: 70, 4: 88, 5: 100 }[total] ?? 100;
  const deg = total === 1 ? 90 : 90 + half - ((2 * half) / (total - 1)) * i;
  const a = (deg * Math.PI) / 180;
  return { x: 50 + 50 * Math.cos(a), y: 50 - 50 * Math.sin(a) };
}

function seat(p, i, total, st) {
  const pos = seatPos(i, total);
  const round = st.rounds[st.round];
  const playing = st.phase === 'playing';
  const status = !p.connected ? 'Déconnecté' : playing ? (p.ready ? 'A validé' : p.chip ? 'Hésite…' : 'Choisit…') : '';
  const cards = p.cards
    ? p.cards.map((c, j) => card(c, { size: 'sm', key: `f${st.heist}-${p.id}-${j}` })).join('')
    : [0, 1].map((j) => cardBack('sm', `b${st.heist}-${p.id}-${j}`)).join('');
  const slot = playing
    ? (p.chip
      ? chip(p.chip, round.color, { key: `${st.heist}-${st.round}-${p.chip}`, action: 'chip', title: `Prendre le jeton ${p.chip} ${of(p.name)}` })
      : '<span class="slot-empty">?</span>')
    : (p.history[3] ? chip(p.history[3], 'red') : '<span class="slot-empty">?</span>');
  return `<div class="seat ${p.ready && playing ? 'is-ready' : ''} ${p.connected ? '' : 'is-off'}" style="--x:${pos.x}%;--y:${pos.y}%;--pc:${p.color}">
    <div class="seat-plate">
      ${avatar(p)}
      <div class="seat-meta">
        <div class="seat-name">${esc(p.name)}${p.id === st.hostId ? `<span class="crown">${ICON.crown}</span>` : ''}</div>
        <div class="seat-status">${p.ready && playing ? `${ICON.check} ` : ''}${status}</div>
      </div>
    </div>
    <div class="seat-row">
      <div class="seat-cards">${cards}</div>
      <div class="chip-slot">${slot}</div>
    </div>
    ${historyChips(p, st)}
  </div>`;
}

function viewGame() {
  const st = S.state;
  const me = st.players.find((p) => p.id === st.meId);
  const idx = st.players.indexOf(me);
  const others = [...st.players.slice(idx + 1), ...st.players.slice(0, idx)];
  const round = st.rounds[st.round];
  const playing = st.phase === 'playing';
  const n = st.players.length;
  const readyCount = st.players.filter((p) => p.ready).length;

  const steps = st.rounds.map((r, i) => {
    const state = !playing || i < st.round ? 'done' : i === st.round ? 'active' : '';
    return `<li class="step ${state}"><span class="step-dot chip-${r.color}"></span>${r.name}</li>`;
  }).join('');

  const slotLabels = ['Flop', 'Flop', 'Flop', 'Turn', 'River'];
  const community = [0, 1, 2, 3, 4].map((i) => (st.community[i]
    ? card(st.community[i], { key: `c${st.heist}-${i}` })
    : `<div class="card-slot"><span>${slotLabels[i]}</span></div>`)).join('');

  let centerChips = '';
  if (playing) {
    const row = Array.from({ length: n }, (_, k) => {
      const v = k + 1;
      const owner = st.chips[v];
      if (!owner) return chip(v, round.color, { key: `${st.heist}-${st.round}-${v}`, action: 'chip', title: `Prendre le jeton ${v}` });
      const who = st.players.find((p) => p.id === owner);
      const mine = owner === st.meId;
      return `<button class="chip-ghost-btn" data-action="chip" data-value="${v}" title="${mine ? 'Ton jeton' : `Pris par ${esc(who?.name ?? '?')} — cliquer pour le lui prendre`}">
        <span class="chip-ghost">${v}</span>${who ? avatar(who, 'mini') : ''}
      </button>`;
    }).join('');
    centerChips = `<div class="center-chips">
      <div class="center-label"><span class="step-dot chip-${round.color}"></span>${round.name} · jetons ${COLOR_NAME[round.color]}</div>
      <div class="chips-row">${row}</div>
      <div class="scale"><span>main la plus faible</span><span>la plus forte</span></div>
    </div>`;
  }

  // Zone du joueur
  let help;
  const waitingFor = st.players.filter((p) => !p.ready || !p.chip).map((p) => p.name);
  if (!playing) help = '';
  else if (!me.chip) help = `Prends le jeton qui correspond à ta main : <b>1</b> = la plus faible, <b>${n}</b> = la plus forte. Tu peux aussi le prendre à un autre joueur.`;
  else if (!me.ready) help = 'Tu es satisfait du classement ? Valide ta position. Clique sur ton jeton pour le reposer.';
  else help = waitingFor.length ? `En attente de ${waitingFor.map(esc).join(', ')}…` : 'Tout le monde est d\'accord !';

  const mySlot = playing
    ? (me.chip
      ? chip(me.chip, round.color, { size: 'lg', key: `${st.heist}-${st.round}-${me.chip}`, action: 'chip', title: 'Reposer mon jeton au centre' })
      : '<span class="slot-empty lg">Ton<br>jeton</span>')
    : (me.history[3] ? chip(me.history[3], 'red', { size: 'lg' }) : '');

  const myCards = (me.cards || []).map((c, j) => card(c, { size: 'lg', key: `h${st.heist}-${j}` })).join('');

  return `<main class="game phase-${st.phase}">
    ${topbar(st)}
    <nav class="rounds"><span class="heist-label">Casse n°${st.heist}</span><ol>${steps}</ol></nav>

    <section class="table table-${n - 1}">
      <div class="felt"></div>
      <div class="seats">${others.map((p, i) => seat(p, i, others.length, st)).join('')}</div>
      <div class="board">
        <div class="community">${community}</div>
        ${centerChips}
      </div>
    </section>

    <section class="me ${me.ready && playing ? 'is-ready' : ''}" style="--pc:${me.color}">
      <div class="me-cards">${myCards}</div>
      <div class="me-info">
        <div class="me-name">${avatar(me)} <b>${esc(me.name)}</b> <small class="muted">(toi)</small></div>
        ${st.hint ? `<div class="hint"><span>Ta main</span><b>${esc(st.hint)}</b></div>` : ''}
        ${historyChips(me, st, 'sm')}
      </div>
      <div class="me-chip"><div class="chip-slot lg">${mySlot}</div></div>
      <div class="me-actions">
        ${playing ? `
          <button class="btn btn-ready ${me.ready ? 'is-on' : ''}" data-action="ready" ${me.chip ? '' : 'disabled'}>
            ${me.ready ? `${ICON.check} Validé` : 'Valider ma position'}
          </button>
          <div class="ready-count"><div class="bar"><i style="width:${(readyCount / n) * 100}%"></i></div>${readyCount}/${n} ont validé</div>` : ''}
        <p class="help">${help}</p>
      </div>
    </section>

    ${st.phase === 'showdown' ? viewShowdown(st) : ''}
    ${st.phase === 'gameover' ? viewGameOver(st) : ''}
  </main>`;
}

function viewShowdown(st) {
  const sd = st.showdown;
  const step = 0.55;
  const end = sd.results.length * step + 0.2;
  const key = `${st.code}-${st.heist}`;
  if (S.showdownKey !== key) {
    S.showdownKey = key;
    S.showdownAt = Date.now();
  }
  // La révélation ne se joue qu'une fois, même si l'écran est redessiné entre-temps
  const animate = Date.now() - S.showdownAt < (end + 2) * 1000;
  const rows = sd.results.map((r, i) => {
    const best = new Set(r.best.map(cardKey));
    const [lo, hi] = r.expected;
    const expected = r.ok ? 'Bien placé' : `Aurait dû prendre le ${lo === hi ? lo : `${lo} ou le ${hi}`}`;
    return `<li class="reveal ${r.ok ? 'ok' : 'bad'}" style="--d:${i * step}s">
      ${chip(r.chip, 'red', { size: 'md' })}
      <div class="rv-who">${avatar(r)}<span>${esc(r.name)}${r.playerId === st.meId ? ' <small class="muted">(toi)</small>' : ''}</span></div>
      <div class="rv-cards">${r.hand.map((c) => card(c, { size: 'sm', hl: best.has(cardKey(c)) })).join('')}</div>
      <div class="rv-hand"><b>${esc(r.handName)}</b><small>${expected}</small></div>
      <div class="rv-mark">${r.ok ? ICON.check : ICON.cross}</div>
    </li>`;
  }).join('');
  const me = st.players.find((p) => p.id === st.meId);
  const ready = st.players.filter((p) => p.ready).length;
  const connected = st.players.filter((p) => p.connected).length;
  const label = sd.gameOver ? 'Voir le résultat final' : 'Casse suivant';

  return `<div class="overlay">
    <div class="modal showdown ${animate ? 'animate' : ''}" style="--end:${end}s">
      <p class="kicker">Abattage — casse n°${st.heist}</p>
      <div class="community small">${st.community.map((c) => card(c, { size: 'sm' })).join('')}</div>
      <ol class="reveal-list">${rows}</ol>
      <div class="verdict ${sd.success ? 'win' : 'lose'}">
        <span class="verdict-icon">${sd.success ? ICON.vault : ICON.alarm}</span>
        <div>
          <h2>${sd.success ? 'Casse réussi !' : 'Alarme déclenchée !'}</h2>
          <p>${sd.success ? 'Le coffre est ouvert, bien joué l\'équipe.' : 'Le classement n\'était pas le bon…'}</p>
        </div>
        ${scoreboard(st)}
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary ${me.ready ? 'is-on' : ''}" data-action="ready">${me.ready ? `${ICON.check} Prêt` : label}</button>
        <span class="muted">${ready}/${connected} prêts</span>
      </div>
    </div>
  </div>`;
}

function viewGameOver(st) {
  const win = st.showdown?.gameOver === 'win' || st.vaults >= st.target;
  const isHost = st.hostId === st.meId;
  const key = `${st.code}-${st.heist}`;
  if (S.gameOverKey !== key) {
    S.gameOverKey = key;
    S.gameOverAt = Date.now();
    S.confetti = Array.from({ length: 70 }, (_, i) => `<i style="--x:${Math.random() * 100}%;--d:${Math.random() * 1.5}s;--t:${2.5 + Math.random() * 2}s;--c:${['#f5c451', '#e5383b', '#4fc3f7', '#7bd88f', '#fff'][i % 5]};--r:${Math.random() * 360}deg"></i>`).join('');
  }
  const timeline = st.results.map((ok, i) => `<span class="tl-item ${ok ? 'ok' : 'bad'}" title="Casse ${i + 1} : ${ok ? 'réussi' : 'raté'}">${ok ? ICON.vault : ICON.alarm}</span>`).join('');
  const confetti = win && Date.now() - S.gameOverAt < 7000 ? S.confetti : '';
  return `<div class="overlay">
    ${confetti ? `<div class="confetti" aria-hidden="true">${confetti}</div>` : ''}
    <div class="modal gameover ${win ? 'win' : 'lose'}">
      <span class="go-icon">${win ? ICON.vault : ICON.alarm}</span>
      <p class="kicker">${win ? 'Victoire' : 'Défaite'}</p>
      <h2 class="logo">${win ? 'Le coup du siècle !' : 'La main dans le sac !'}</h2>
      <p>${win ? 'Trois coffres ouverts : l\'équipe repart les poches pleines.' : 'Trois alarmes… la police vous attendait à la sortie.'}</p>
      <div class="timeline">${timeline}</div>
      <p class="muted">${st.vaults} casse${st.vaults > 1 ? 's' : ''} réussi${st.vaults > 1 ? 's' : ''} · ${st.alarms} alarme${st.alarms > 1 ? 's' : ''} en ${st.results.length} tentatives</p>
      ${isHost
        ? `<div class="modal-actions"><button class="btn btn-primary btn-xl" data-action="start">Rejouer</button><button class="btn btn-secondary" data-action="lobby">Retour au salon</button></div>`
        : '<div class="waiting"><span class="dots"><i></i><i></i><i></i></span> L\'hôte choisit la suite</div>'}
    </div>
  </div>`;
}

function viewRules() {
  const hands = [
    ['Quinte flush', 'Suite de 5 cartes de la même couleur'],
    ['Carré', '4 cartes de même valeur'],
    ['Full', 'Un brelan + une paire'],
    ['Couleur', '5 cartes de la même couleur'],
    ['Suite', '5 cartes qui se suivent'],
    ['Brelan', '3 cartes de même valeur'],
    ['Double paire', 'Deux paires'],
    ['Paire', '2 cartes de même valeur'],
    ['Carte haute', 'Rien de tout ça : la plus haute carte compte'],
  ];
  return `<div class="overlay" data-action="closeModal">
    <div class="modal rules" data-stop>
      ${iconButton('closeModal', ICON.close, 'Fermer', 'modal-close')}
      <p class="kicker">Comment jouer</p>
      <h2 class="logo">The Gang</h2>
      <ol class="rules-list">
        <li><b>Tous ensemble.</b> Vous gagnez si l'équipe réussit 3 casses avant de déclencher 3 alarmes.</li>
        <li><b>Les cartes.</b> Chacun reçoit 2 cartes secrètes. Cinq cartes communes arrivent en trois fois : le flop (3), le turn (1) puis la river (1). Votre main = la meilleure combinaison de 5 cartes parmi vos 2 cartes et les 5 communes.</li>
        <li><b>Les jetons.</b> À chaque étape, il y a un jeton par joueur, numérotés de 1 à ${S.state?.players.length || 'N'}. Prenez celui qui correspond à la force de votre main : <b>1 = la plus faible</b>, le plus grand = la plus forte.</li>
        <li><b>Prendre, voler, reposer.</b> Cliquez sur un jeton au centre pour le prendre, ou sur celui d'un autre joueur pour le lui prendre (il devra en choisir un autre). Cliquez sur le vôtre pour le reposer.</li>
        <li><b>Valider.</b> L'étape se termine quand tout le monde a un jeton et a validé. Le moindre mouvement de jeton annule les validations.</li>
        <li><b>Silence !</b> Interdit de parler de ses cartes : seuls les jetons communiquent. Les jetons des étapes précédentes restent visibles, servez-vous-en.</li>
        <li><b>L'abattage.</b> Après la river, on révèle les mains dans l'ordre des jetons rouges. Si chaque main est au moins aussi forte que la précédente, le coffre s'ouvre. Sinon, alarme ! Les égalités peuvent être dans n'importe quel ordre.</li>
      </ol>
      <h3>Force des mains <small class="muted">de la plus forte à la plus faible</small></h3>
      <ul class="hand-ranks">${hands.map(([h, d], i) => `<li><span class="rank-n">${hands.length - i}</span><b>${h}</b><span>${d}</span></li>`).join('')}</ul>
      <p class="muted">À combinaison égale, la valeur des cartes départage (l'As est la plus forte), puis les cartes restantes.</p>
    </div>
  </div>`;
}

function viewMenu() {
  const st = S.state;
  const isHost = st.hostId === st.meId;
  const others = st.players.filter((p) => p.id !== st.meId);
  return `<div class="overlay" data-action="closeModal">
    <div class="modal menu" data-stop>
      ${iconButton('closeModal', ICON.close, 'Fermer', 'modal-close')}
      <p class="kicker">Options</p>
      <h2>Salon ${st.code}</h2>
      <button class="btn btn-secondary" data-action="copyLink">${ICON.link} Copier le lien d'invitation</button>
      ${isHost && others.length ? `
        <h3>Joueurs</h3>
        <ul class="roster">${others.map((p) => `<li class="roster-item ${p.connected ? '' : 'is-off'}">
          ${avatar(p)}<span class="roster-name">${esc(p.name)}</span>${p.connected ? '' : '<span class="badge">Hors ligne</span>'}
          <button class="btn btn-small btn-danger-ghost" data-action="kick" data-id="${p.id}">Retirer</button>
        </li>`).join('')}</ul>
        <p class="muted">Retirer un joueur pendant un casse redistribue les cartes de ce casse.</p>` : ''}
      ${isHost && st.phase !== 'lobby' ? '<button class="btn btn-secondary" data-action="lobby">Arrêter la partie et revenir au salon</button>' : ''}
      <button class="btn btn-danger" data-action="leave">Quitter le salon</button>
    </div>
  </div>`;
}

/* ---------- Rendu ---------- */

function saveInputs() {
  const name = $('#name');
  if (name) S.name = name.value;
  const code = $('#code');
  if (code) S.codeInput = code.value;
}

function render() {
  saveInputs();
  const focused = document.activeElement?.id;
  const before = captureChips();
  let html;
  if (S.replaced) html = viewReplaced();
  else if (!S.state) html = S.session ? viewLoading() : `${topbarHome()}${viewHome()}`;
  else if (S.state.phase === 'lobby') html = viewLobby();
  else html = viewGame();
  if (S.modal === 'rules') html += viewRules();
  else if (S.modal === 'menu' && S.state) html += viewMenu();
  const next = document.createElement('div');
  next.innerHTML = html;
  morphChildren($('#app'), next);
  if (focused && $(`#${focused}`) && document.activeElement?.id !== focused) $(`#${focused}`).focus();
  animateChips(before);
  markDealt();
}

// Met à jour le DOM existant au lieu de le remplacer : un clic en cours n'est
// pas perdu quand un autre joueur agit, et les animations ne repartent pas de zéro.
function morphChildren(from, to) {
  const oldNodes = [...from.childNodes];
  const newNodes = [...to.childNodes];
  newNodes.forEach((b, i) => {
    const a = oldNodes[i];
    if (!a) from.appendChild(b);
    else if (!sameNode(a, b)) from.replaceChild(b, a);
    else if (a.nodeType === Node.ELEMENT_NODE) morphElement(a, b);
    else if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue;
  });
  for (let i = newNodes.length; i < oldNodes.length; i++) oldNodes[i].remove();
}

function sameNode(a, b) {
  if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) return false;
  if (a.nodeType !== Node.ELEMENT_NODE) return true;
  return a.dataset.chip === b.dataset.chip && a.dataset.card === b.dataset.card;
}

function morphElement(a, b) {
  const dealing = a.classList.contains('deal') ? a.getAttribute('style') : null;
  for (const { name } of [...a.attributes]) if (!b.hasAttribute(name)) a.removeAttribute(name);
  for (const { name, value } of [...b.attributes]) if (a.getAttribute(name) !== value) a.setAttribute(name, value);
  if (dealing !== null) {
    a.classList.add('deal');
    if (dealing) a.setAttribute('style', dealing);
  }
  if (a.tagName === 'INPUT' && a.type === 'checkbox') a.checked = b.checked;
  morphChildren(a, b);
}

function topbarHome() {
  return `<div class="home-tools">${iconButton('sound', Sound.on ? ICON.soundOn : ICON.soundOff, Sound.on ? 'Couper le son' : 'Activer le son')}</div>`;
}

// Animation FLIP : un jeton qui change de place glisse jusqu'à sa nouvelle position
function captureChips() {
  const m = new Map();
  for (const el of $$('#app [data-chip]')) m.set(el.dataset.chip, el.getBoundingClientRect());
  return m;
}

function animateChips(before) {
  if (!before.size) return;
  for (const el of $$('#app [data-chip]')) {
    const old = before.get(el.dataset.chip);
    if (!old) continue;
    const now = el.getBoundingClientRect();
    const dx = old.left + old.width / 2 - (now.left + now.width / 2);
    const dy = old.top + old.height / 2 - (now.top + now.height / 2);
    const s = old.width / now.width;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(s - 1) < 0.02) continue;
    el.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${s})`, zIndex: 50 }, { transform: 'none', zIndex: 50 }],
      { duration: 450, easing: 'cubic-bezier(.2,.9,.25,1.05)' },
    );
  }
}

// Les cartes jamais vues glissent sur la table
function markDealt() {
  let k = 0;
  for (const el of $$('#app [data-card]')) {
    const key = el.dataset.card;
    if (S.seenCards.has(key)) continue;
    S.seenCards.add(key);
    if (!el.offsetParent) continue;
    el.classList.add('deal');
    el.style.animationDelay = `${k++ * 70}ms`;
  }
}

/* ---------- Actions ---------- */

function readName() {
  const input = $('#name');
  const name = (input?.value ?? S.name).trim();
  if (!name) {
    toast('Choisis d\'abord un pseudo.', 'warn');
    input?.focus();
    return null;
  }
  S.name = name;
  store.set('thegang:name', name);
  return name;
}

function copyLink() {
  const url = `${location.origin}${location.pathname}?salon=${S.state.code}`;
  const done = () => toast('Lien copié ! Envoie-le à tes amis.');
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(done, () => window.prompt('Copie ce lien :', url));
  } else {
    window.prompt('Copie ce lien :', url);
  }
}

const actions = {
  create() {
    const name = readName();
    if (name) socket.emit('create', { name }, handleJoin);
  },
  join() {
    const code = ($('#code')?.value || '').trim().toUpperCase();
    if (code.length !== 4) {
      toast('Le code du salon fait 4 lettres.', 'warn');
      $('#code')?.focus();
      return;
    }
    const name = readName();
    if (name) socket.emit('join', { code, name }, handleJoin);
  },
  joinUrl() {
    const name = readName();
    if (name) socket.emit('join', { code: urlCode, name }, handleJoin);
  },
  forgetUrl() {
    urlCode = null;
    history.replaceState(null, '', location.pathname);
    render();
  },
  rules() {
    S.modal = 'rules';
    render();
  },
  menu() {
    S.modal = 'menu';
    render();
  },
  closeModal() {
    S.modal = null;
    render();
  },
  sound() {
    Sound.on = !Sound.on;
    store.set('thegang:sound', Sound.on);
    if (Sound.on) Sound.chip();
    render();
  },
  copyLink,
  start() {
    S.modal = null;
    emit('start');
  },
  toggleHints(el) {
    emit('settings', { hints: el.checked });
  },
  kick(el) {
    const p = S.state.players.find((q) => q.id === el.dataset.id);
    if (p && window.confirm(`Retirer ${p.name} du salon ?`)) emit('kick', p.id);
  },
  lobby() {
    if (S.state.phase === 'gameover' || window.confirm('Arrêter la partie en cours et revenir au salon ?')) {
      S.modal = null;
      emit('backToLobby');
    }
  },
  leave() {
    if (!window.confirm('Quitter le salon ?')) return;
    socket.emit('leave', () => leaveLocally());
  },
  chip(el) {
    emit('takeChip', Number(el.dataset.value));
  },
  ready() {
    emit('ready');
  },
  reload() {
    location.reload();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  // Un clic dans une fenêtre ne doit pas la fermer
  if (el.dataset.action === 'closeModal' && el.classList.contains('overlay') && e.target.closest('[data-stop]')) return;
  if (el.tagName === 'INPUT' && el.type === 'checkbox') return;
  const fn = actions[el.dataset.action];
  if (fn) {
    e.preventDefault();
    fn(el);
  }
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.matches('input[type=checkbox][data-action]')) actions[el.dataset.action]?.(el);
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'code') {
    const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    if (v !== e.target.value) e.target.value = v;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && S.modal) return actions.closeModal();
  if (e.key !== 'Enter') return;
  const id = e.target.id;
  if (id === 'code') actions.join();
  else if (id === 'name') (urlCode ? actions.joinUrl : actions.create)();
});

render();
