// ============================================================
//  STRIKE BOWLING — scenes: Menu → Setup → Game (10 frames)
//  Categories come from js/data.js (same list as nagasakimark/poll).
// ============================================================
'use strict';

const MENU_THEME = { primary: '#3B1C8C', secondary: '#D9CCFF', background: '#EFE8FF', accent: '#FF7A00', buttonColor: '#6A3DE8' };
const TILE_COLORS = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#FF9F43', '#54A0FF', '#8E6CEF', '#FF8FD8', '#00D2D3'];
const BALL_COLORS = ['#ff3b5c', '#2f7bff', '#ffae00', '#1fbf5b'];
const TEAM_COLORS = ['#ff4d6d', '#2f9bff', '#f5a300', '#1fbf5b', '#9b5cff', '#ff7a1a'];
const TEAM_NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];

const MODES = [
  { key: 'pic2word', title: 'Picture → Word', jp: 'え を みて えいご を えらぼう' },
  { key: 'word2pic', title: 'Word → Picture', jp: 'えいご を よんで え を えらぼう' },
  { key: 'jp2en', title: 'Japanese → English', jp: 'にほんご を えいご に しよう' },
  { key: 'battle', title: 'Team Battle', jp: 'すきな ボール で ピン を たおそう！' }
];

// Question shown above the picture in Picture → Word mode
const PIC_QUESTION = {
  feelings: 'How are you?', colors: 'What color?', sports: 'What sport?', prefectures: 'Where is it?',
  days: 'What day?', months: 'What month?', seasons: 'What season?'
};

// ---------------- helpers ----------------
const itemImg = it => (it.image ? Images.get(`img/${it.image}.png`) : null);
function preloadPoll(poll) { poll.items.forEach(it => { if (it.image) Images.load(`img/${it.image}.png`); }); }

function drawItem(ctx, it, cx, cy, size) {
  const img = itemImg(it);
  if (img) {
    const k = Math.min(size / img.naturalWidth, size / img.naturalHeight);
    ctx.drawImage(img, cx - img.naturalWidth * k / 2, cy - img.naturalHeight * k / 2, img.naturalWidth * k, img.naturalHeight * k);
  } else if (it.icon) {
    ctx.save();
    ctx.font = `${Math.round(size * 0.8)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.icon, cx, cy + size * 0.05);
    ctx.restore();
  }
}

// "I like apples." but "I want to go to Tokyo."
function wordIn(key, it) { return ['prefectures', 'days', 'months'].includes(key) ? it.en : it.en.toLowerCase(); }
function sentence(key, it) { return `${POLLS[key].prompt.en} ${wordIn(key, it)}.`; }

// Scrolling polka-dot background (same look as the poll app)
const Polka = { tiles: new Map(), shade: null, shadeKey: '' };
function polkaPattern(ctx, theme, k) {
  const s = 56;
  const key = theme.secondary + '@' + k.toFixed(3);
  let e = Polka.tiles.get(key);
  if (!e) {
    const tw = Math.max(1, Math.round(s * k)), th = 2 * tw;
    const c = document.createElement('canvas'); c.width = tw; c.height = th;
    const g = c.getContext('2d');
    g.scale(tw / s, th / (2 * s));
    g.fillStyle = theme.secondary;
    for (const [x, y] of [[0, 0], [s, 0], [0, 2 * s], [s, 2 * s], [s / 2, s], [-s / 2, s], [s * 1.5, s]]) {
      g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill();
    }
    e = { pat: ctx.createPattern(c, 'repeat') };
    if (Polka.tiles.size > 12) Polka.tiles.delete(Polka.tiles.keys().next().value);
    Polka.tiles.set(key, e);
  }
  return e;
}
function drawPolka(ctx, theme, t) {
  const v = Engine.view();
  ctx.fillStyle = theme.background;
  ctx.fillRect(v.x, v.y, v.w, v.h);
  const s = 56, off = (t * 14) % s;
  const m = ctx.getTransform();
  const k = Math.hypot(m.a, m.b);
  const e = polkaPattern(ctx, theme, k);
  const X0 = m.a * v.x + m.e, Y0 = m.d * v.y + m.f;
  const W2 = Math.round(v.w * m.a), H2 = Math.round(v.h * m.d);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  e.pat.setTransform(new DOMMatrix([1, 0, 0, 1, Math.round(X0 + off * k), Math.round(Y0 + off * k)]));
  ctx.fillStyle = e.pat;
  ctx.fillRect(Math.round(X0), Math.round(Y0), W2, H2);
  const sk = W2 + 'x' + H2;
  if (Polka.shadeKey !== sk) {
    const c = document.createElement('canvas'); c.width = Math.max(1, W2); c.height = Math.max(1, H2);
    const g = c.getContext('2d');
    g.scale(m.a, m.d); g.translate(-v.x, -v.y);
    const gr = g.createRadialGradient(640, 360, 300, 640, 360, 900);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(1, 'rgba(0,0,0,0.12)');
    g.fillStyle = gr;
    g.fillRect(v.x, v.y, v.w, v.h);
    Polka.shade = c; Polka.shadeKey = sk;
  }
  ctx.drawImage(Polka.shade, Math.round(X0), Math.round(Y0));
  ctx.restore();
}

function drawCard(ctx, x, y, w, h, o = {}) {
  const r = o.r ?? 22;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  rr(ctx, x, y + 9, w, h, r); ctx.fill();
  ctx.fillStyle = o.base || '#d9d2ea';
  rr(ctx, x, y + 5, w, h, r); ctx.fill();
  ctx.fillStyle = o.fill || '#fff';
  rr(ctx, x, y, w, h, r); ctx.fill();
  if (o.border) {
    ctx.strokeStyle = o.border;
    ctx.lineWidth = o.lw || 4;
    rr(ctx, x, y, w, h, r); ctx.stroke();
  }
  ctx.restore();
}

// ---------------- bowling art (all drawn in code) ----------------
// Pin outline, base at (0,0), top at (0,-1)
function pinPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-0.12, 0);
  ctx.bezierCurveTo(-0.22, -0.1, -0.25, -0.34, -0.17, -0.5);
  ctx.bezierCurveTo(-0.1, -0.62, -0.07, -0.66, -0.075, -0.74);
  ctx.bezierCurveTo(-0.12, -0.86, -0.09, -1, 0, -1);
  ctx.bezierCurveTo(0.09, -1, 0.12, -0.86, 0.075, -0.74);
  ctx.bezierCurveTo(0.07, -0.66, 0.1, -0.62, 0.17, -0.5);
  ctx.bezierCurveTo(0.25, -0.34, 0.22, -0.1, 0.12, 0);
  ctx.closePath();
}
function drawPin(ctx, x, y, h, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale(h, h);
  if (!o.noShadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(0.03, 0, 0.2, 0.05, 0, 0, TAU); ctx.fill();
  }
  pinPath(ctx);
  const g = ctx.createLinearGradient(-0.25, 0, 0.25, 0);
  g.addColorStop(0, '#d8d8e6'); g.addColorStop(0.35, '#ffffff'); g.addColorStop(1, '#b9b9cc');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = o.stripe || '#e8213f';
  ctx.fillRect(-0.3, -0.7, 0.6, 0.035);
  ctx.fillRect(-0.3, -0.645, 0.6, 0.035);
  ctx.restore();
  ctx.lineWidth = 0.028;
  ctx.strokeStyle = '#3a2f5c';
  pinPath(ctx); ctx.stroke();
  ctx.restore();
}

function drawBall(ctx, x, y, r, color, rot = 0, o = {}) {
  if (!(r >= 1)) return;
  ctx.save();
  ctx.translate(x, y);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (!o.noShadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(r * 0.12, r * 0.9, r * 0.95, r * 0.28, 0, 0, TAU); ctx.fill();
  }
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, shade(color, 0.55)); g.addColorStop(0.45, color); g.addColorStop(1, shade(color, -0.55));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  // swirl
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  ctx.rotate(rot);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = r * 0.18;
  ctx.beginPath(); ctx.arc(-r * 0.4, r * 0.2, r * 0.8, -0.9, 0.7); ctx.stroke();
  // finger holes
  ctx.fillStyle = shade(color, -0.75);
  const holes = o.item ? [[0.62, -0.5, 0.09], [0.76, -0.3, 0.09], [0.55, -0.66, 0.08]] : [[0.28, -0.32, 0.13], [0.5, -0.08, 0.13], [0.16, 0.12, 0.16]];
  holes.forEach(([hx, hy, hr]) => {
    ctx.beginPath(); ctx.ellipse(hx * r, hy * r, hr * r, hr * r * 0.85, 0.4, 0, TAU); ctx.fill();
  });
  ctx.restore();
  // picture badge on the ball (Team Battle)
  if (o.item && r > 8) {
    const br = r * 0.68;
    ctx.save();
    ctx.translate(-r * 0.06, r * 0.08);
    ctx.rotate(o.spin || 0);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, br, 0, TAU); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, br - 2, 0, TAU); ctx.clip();
    drawItem(ctx, o.item, 0, 0, br * 1.75);
    ctx.restore();
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.strokeStyle = shade(color, -0.35);
    ctx.beginPath(); ctx.arc(0, 0, br, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.48, r * 0.26, r * 0.14, -0.6, 0, TAU); ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.strokeStyle = shade(color, -0.7);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.restore();
}

// "Pinny" — the bowling-pin host
function drawPinny(ctx, x, y, h, mood, t) {
  ctx.save();
  ctx.translate(x, y);
  let sx = 1, sy = 1, rot = 0;
  if (mood === 'happy') { const b = Math.abs(Math.sin(t * 9)); ctx.translate(0, -b * 26); sy = 1 + b * 0.04; sx = 1 - b * 0.03; }
  else if (mood === 'sad') { rot = -0.12 + Math.sin(t * 2) * 0.02; sy = 0.96; }
  else { rot = Math.sin(t * 2.2) * 0.04; sy = 1 + Math.sin(t * 4.4) * 0.015; }
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  drawPin(ctx, 0, 0, h, { stripe: '#ff3b8a' });
  // arms
  ctx.strokeStyle = '#3a2f5c'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  const a = mood === 'happy' ? 1.0 + Math.sin(t * 18) * 0.4 : mood === 'sad' ? -1.0 : -0.35 + Math.sin(t * 3) * 0.15;
  [-1, 1].forEach(s => {
    const sx0 = s * h * 0.15, sy0 = -h * 0.42, L = h * 0.16;
    const ex2 = sx0 + s * Math.cos(a) * L, ey2 = sy0 - Math.sin(a) * L;
    ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(ex2, ey2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex2, ey2, 7, 0, TAU); ctx.fill(); ctx.stroke();
  });
  // face
  const fy = -h * 0.36, ex = h * 0.06;
  ctx.fillStyle = '#2a2140';
  ctx.strokeStyle = '#2a2140';
  ctx.lineWidth = 4;
  if (mood === 'happy') {
    [-1, 1].forEach(s => { ctx.beginPath(); ctx.arc(s * ex, fy + 4, 7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); });
  } else {
    const blink = mood !== 'sad' && (t % 3.4) > 3.25;
    [-1, 1].forEach(s => {
      ctx.beginPath();
      ctx.ellipse(s * ex, fy, 6.5, blink ? 1.2 : 9.5, 0, 0, TAU); ctx.fill();
      if (!blink) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * ex + 2, fy - 3.5, 2.6, 0, TAU); ctx.fill(); ctx.fillStyle = '#2a2140'; }
    });
    if (mood === 'sad') {
      [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(s * (ex + 9), fy - 12); ctx.lineTo(s * (ex - 6), fy - 19); ctx.stroke(); });
    }
  }
  ctx.fillStyle = 'rgba(255,110,150,0.55)';
  [-1, 1].forEach(s => { ctx.beginPath(); ctx.ellipse(s * ex * 1.85, fy + 13, 8, 5, 0, 0, TAU); ctx.fill(); });
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (mood === 'happy') { ctx.fillStyle = '#c2185b'; ctx.arc(0, fy + 16, 10, 0, Math.PI); ctx.fill(); }
  else if (mood === 'sad') { ctx.arc(0, fy + 26, 8, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  else { ctx.arc(0, fy + 13, 7, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
  if (mood === 'sad') { // sweat drop
    ctx.fillStyle = '#7fd3ff';
    ctx.beginPath(); ctx.moveTo(h * 0.15, fy - 22); ctx.quadraticCurveTo(h * 0.15 + 9, fy - 6, h * 0.15, fy - 4); ctx.quadraticCurveTo(h * 0.15 - 9, fy - 6, h * 0.15, fy - 22); ctx.fill();
  }
  ctx.restore();
}

// ---------------- settings ----------------
const Settings = {
  mode: 'pic2word', teams: 1, bteams: 4, frames: 10, kana: false,
  load() {
    try {
      const s = JSON.parse(localStorage.getItem('strikebowling') || '{}');
      if (s.muted) Sound.setMuted(true);
      if (MODES.some(m => m.key === s.mode)) this.mode = s.mode;
      if (s.teams === 1 || s.teams === 2) this.teams = s.teams;
      if (s.bteams >= 2 && s.bteams <= 6) this.bteams = s.bteams;
      if ([3, 5, 10].includes(s.frames)) this.frames = s.frames;
      this.kana = !!s.kana;
    } catch (e) {}
  },
  save() {
    try { localStorage.setItem('strikebowling', JSON.stringify({ muted: Sound.muted, mode: this.mode, teams: this.teams, bteams: this.bteams, frames: this.frames, kana: this.kana })); } catch (e) {}
  }
};
function toggleFullscreen() {
  try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {}
}
function toggleMute() { Sound.setMuted(!Sound.muted); Settings.save(); }
function cornerButtons(color) {
  return [
    new Button({ x: 1164, y: 44, w: 54, circle: true, color, icon: Icons.sound, onClick: toggleMute }),
    new Button({ x: 1228, y: 44, w: 54, circle: true, color, icon: Icons.fullscreen, onClick: toggleFullscreen })
  ];
}
function commonKeys(e) {
  if (e.key === 'm' || e.key === 'M') toggleMute();
  if (e.key === 'f' || e.key === 'F') toggleFullscreen();
}

// ---------------- bowling sounds (synthesized) ----------------
const BowlSfx = {
  roll(dur) {
    Sound.noise(dur, { filter: 'lowpass', freq: 220, slide: 120, q: 0.6, vol: 0.45, attack: 0.15 });
    Sound.tone(55, dur, { type: 'sine', vol: 0.18, attack: 0.15 });
  },
  crash(n = 10) {
    if (n <= 0) return;
    for (let i = 0; i < Math.max(2, Math.round(n * 0.9)); i++) {
      Sound.noise(0.12, { freq: rand(1400, 3400), q: 3, vol: 0.35, delay: i * rand(0.02, 0.05) });
      Sound.tone(rand(500, 900), 0.08, { type: 'triangle', vol: 0.12, delay: i * 0.04 });
    }
    Sound.thud();
    if (n >= 8) Sound.noise(1.6, { filter: 'highpass', freq: 1800, vol: 0.08, attack: 0.3, delay: 0.25 }); // crowd-ish hiss
  },
  miss() {
    [392, 370, 349, 311].forEach((f, i) => Sound.tone(f, i === 3 ? 0.7 : 0.26, { type: 'triangle', vol: 0.16, delay: 0.1 + i * 0.28, slide: i === 3 ? f * 0.85 : undefined }));
  },
  gutter() { Sound.noise(0.5, { filter: 'lowpass', freq: 500, slide: 200, vol: 0.25 }); },
  reset() { for (let i = 0; i < 4; i++) Sound.tone(1300 + i * 120, 0.04, { type: 'square', vol: 0.04, delay: 0.25 + i * 0.07 }); }
};

// ============================================================ LOADING
const LoadingScene = {
  enter() {
    Promise.race([
      Promise.all(['40px "Luckiest Guy"', '700 40px "Fredoka"', '600 40px "Fredoka"', '500 40px "Fredoka"']
        .map(f => (document.fonts ? document.fonts.load(f) : null)).concat([Images.load(ALLEY.src)])),
      new Promise(r => setTimeout(r, 3000))
    ]).catch(() => {}).then(() => {
      Object.values(POLLS).forEach(p => { const it = p.items[0]; if (it.image) Images.load(`img/${it.image}.png`); });
      // a link like bowling/#colors opens that category's setup directly
      const want = decodeURIComponent(location.hash.slice(1));
      if (POLLS[want]) Engine.go(SetupScene, { key: want }); else Engine.go(MenuScene);
    });
  },
  draw(ctx) {
    drawPolka(ctx, MENU_THEME, Engine.realTime);
    const t = Engine.realTime;
    drawBall(ctx, 640 + Math.sin(t * 3) * 60, 350, 40, '#6A3DE8', t * 6);
    txt(ctx, 'LOADING', 640, 430, { size: 36, fill: MENU_THEME.primary, shadow: false });
  }
};

// ============================================================ MENU (pick a category)
const MenuScene = {
  enter() {
    this.t = 0;
    const keys = Object.keys(POLLS);
    this.tiles = keys.map((key, i) => {
      const poll = POLLS[key];
      const col = i % 4, row = Math.floor(i / 4);
      preloadPoll(poll);
      const tile = { key, poll, x: 640 + (col - 1.5) * 290, y: 300 + row * 140, w: 268, h: 118, appear: 0, spring: new Spring(1, 380, 16), hover: false };
      Tween.to(tile, { appear: 1 }, 0.45, { ease: Ease.outBack, delay: 0.15 + i * 0.04 });
      return tile;
    });
    this.head = { s: 0 };
    Tween.to(this.head, { s: 1 }, 0.6, { ease: Ease.outElastic });
    this.buttons = cornerButtons(MENU_THEME.buttonColor);
    this.leaving = false;
  },
  tileAt(x, y) { return this.tiles.find(t => t.appear > 0.5 && Math.abs(x - t.x) < t.w / 2 && Math.abs(y - t.y) < t.h / 2); },
  isHot(x, y) { return !!this.tileAt(x, y) || this.buttons.some(b => b.hit(x, y)); },
  onDown(x, y) {
    for (const b of this.buttons) if (b.hit(x, y)) { b.press(); return; }
    const tile = this.tileAt(x, y);
    if (tile && !this.leaving) {
      this.leaving = true;
      tile.spring.v = 0.8;
      Sound.blip(7);
      Sound.whoosh(0.35);
      FX.sparkleBurst(tile.x, tile.y, 16, ['#ffffff', tile.poll.theme.secondary, tile.poll.theme.accent]);
      Engine.go(SetupScene, { key: tile.key }, tile.x, tile.y);
    }
  },
  onKey(e) { commonKeys(e); },
  update(dt, realDt) {
    this.t += dt;
    const p = Engine.pointer;
    const hot = this.tileAt(p.x, p.y);
    for (const tl of this.tiles) {
      if (tl === hot && !tl.hover) Sound.hover();
      tl.hover = tl === hot;
      tl.spring.target = tl.hover ? 1.07 : 1;
      tl.spring.update(dt);
    }
    this.buttons.forEach(b => { b.hover = b.hit(p.x, p.y); b.update(realDt, this.t); });
  },
  draw(ctx) {
    const t = this.t;
    drawPolka(ctx, MENU_THEME, t);
    ctx.save();
    ctx.translate(640, 118);
    ctx.scale(this.head.s, this.head.s);
    // little pins knocked by a ball either side of the title
    for (let i = 0; i < 3; i++) drawPin(ctx, -400 + i * 26, 40 - (i === 1 ? 12 : 0), 62, { rot: Math.sin(t * 3 + i) * 0.08 });
    drawBall(ctx, 400, 18, 30, '#ff3b5c', t * 3);
    txt(ctx, 'STRIKE BOWLING', 0, 0, { size: 76, fill: { grad: ['#ffffff', '#ffe27a', '#ffb300'] }, stroke: MENU_THEME.primary, lw: 14, shadow: 'rgba(60,20,120,0.35)', shadowDist: 8 });
    ctx.restore();
    txt(ctx, 'Pick a category!  カテゴリーを えらんでね', 640, 196, { size: 26, font: FONT_ROUND, fill: MENU_THEME.primary, shadow: false });
    for (const tl of this.tiles) this.drawTile(ctx, tl, t);
    txt(ctx, 'In the game:  1–4 roll a ball  ·  ENTER next  ·  Q hide question  ·  K katakana  ·  ESC back  ·  M mute  ·  F fullscreen', 640, 706, {
      size: 15, font: FONT_ROUND, weight: '600', fill: 'rgba(60,20,120,0.5)', shadow: false
    });
    this.buttons.forEach(b => b.draw(ctx));
    Particles.draw(ctx, 'ui');
  },
  drawTile(ctx, tl, t) {
    if (tl.appear <= 0.01) return;
    const th = tl.poll.theme;
    ctx.save();
    ctx.translate(tl.x, tl.y);
    ctx.rotate(tl.hover ? Math.sin(t * 9) * 0.025 : 0);
    const s = tl.spring.v * tl.appear;
    ctx.scale(s, s);
    const w = tl.w, h = tl.h;
    if (tl.hover) Glow.draw(ctx, th.buttonColor, 0, 0, 190, 0.35);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    rr(ctx, -w / 2, -h / 2 + 12, w, h, 26); ctx.fill();
    ctx.fillStyle = shade(th.buttonColor, -0.35);
    rr(ctx, -w / 2, -h / 2 + 7, w, h, 26); ctx.fill();
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, shade(th.buttonColor, 0.3)); g.addColorStop(1, th.buttonColor);
    ctx.fillStyle = g;
    rr(ctx, -w / 2, -h / 2, w, h, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    rr(ctx, -w / 2 + 10, -h / 2 + 7, w - 20, h * 0.3, 14); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-w / 2 + 58, 0, 42, 0, TAU); ctx.fill();
    ctx.strokeStyle = th.secondary; ctx.lineWidth = 5; ctx.stroke();
    const bob = tl.hover ? Math.sin(t * 9) * 3 : 0;
    drawItem(ctx, tl.poll.items[0], -w / 2 + 58, bob, 60);
    const title = tl.poll.title.replace(' (1st Grade)', ' 1').replace(' (2nd Grade)', ' 2').replace('Days of the Week', 'Days');
    txt(ctx, title, 44, 2, { size: 28, font: FONT_ROUND, fill: '#fff', stroke: shade(th.buttonColor, -0.5), lw: 6, maxW: 150 });
    ctx.restore();
  }
};

// ============================================================ SETUP (mode, teams, frames)
const SetupScene = {
  enter(data) {
    this.key = data.key;
    this.poll = POLLS[this.key];
    this.theme = this.poll.theme;
    preloadPoll(this.poll);
    this.t = 0;
    this.leaving = false;
    this.cards = MODES.map((m, i) => {
      const c = { m, x: 640 + (i - 1.5) * 300, y: 322, w: 284, h: 200, appear: 0, spring: new Spring(1, 400, 16), hover: false };
      Tween.to(c, { appear: 1 }, 0.45, { ease: Ease.outBack, delay: 0.1 + i * 0.07 });
      return c;
    });
    const th = this.theme;
    this.frameBtns = [3, 5, 10].map((n, i) => new Button({
      x: 860 + i * 132, y: 522, w: 122, h: 58, label: `${n}`, size: 28, color: '#b8bfcc', textColor: '#fff', val: n,
      onClick: () => { Settings.frames = n; Settings.save(); this.refresh(); }
    }));
    this.startBtn = new Button({ x: 640, y: 640, w: 300, h: 84, label: 'START!', size: 46, color: th.accent, textColor: '#fff', pulse: true, onClick: () => this.start() });
    this.backBtn = new Button({ x: 46, y: 44, w: 58, circle: true, color: th.buttonColor, icon: Icons.back, onClick: () => this.leave() });
    this.corner = cornerButtons(th.buttonColor);
    this.rebuildTeams();
  },
  battle() { return Settings.mode === 'battle'; },
  rebuildTeams() {
    const opts = this.battle() ? [2, 3, 4, 5, 6] : [1, 2];
    const bw = opts.length > 2 ? 76 : 150, gap = 10;
    const tw = opts.length * bw + (opts.length - 1) * gap;
    this.teamBtns = opts.map((n, i) => new Button({
      x: 400 - tw / 2 + bw / 2 + i * (bw + gap), y: 522, w: bw, h: 58, val: n, size: 28, color: '#b8bfcc', textColor: '#fff',
      label: opts.length > 2 ? String(n) : (n === 1 ? '1 TEAM' : '2 TEAMS'),
      onClick: () => { if (this.battle()) Settings.bteams = n; else Settings.teams = n; Settings.save(); this.refresh(); }
    }));
    this.buttons = [...this.teamBtns, ...this.frameBtns, this.startBtn, this.backBtn, ...this.corner];
    this.refresh();
  },
  refresh() {
    const th = this.theme, cur = this.battle() ? Settings.bteams : Settings.teams;
    this.teamBtns.forEach(b => { b.color = b.val === cur ? th.buttonColor : '#b8bfcc'; });
    this.frameBtns.forEach(b => { b.color = b.val === Settings.frames ? th.buttonColor : '#b8bfcc'; });
  },
  pickMode(i) {
    const c = this.cards[i];
    if (Settings.mode === c.m.key) return false;
    Settings.mode = c.m.key; Settings.save();
    Sound.blip(5); c.spring.v = 0.85;
    this.rebuildTeams();
    return true;
  },
  start() {
    if (this.leaving) return;
    this.leaving = true;
    Sound.whoosh(0.35);
    Engine.go(GameScene, { key: this.key }, 640, 640);
  },
  leave() {
    if (this.leaving) return;
    this.leaving = true;
    Engine.go(MenuScene, null, 46, 44);
  },
  cardAt(x, y) { return this.cards.find(c => Math.abs(x - c.x) < c.w / 2 && Math.abs(y - c.y) < c.h / 2); },
  isHot(x, y) { return !!this.cardAt(x, y) || this.buttons.some(b => b.hit(x, y)); },
  onDown(x, y) {
    for (const b of this.buttons) if (b.hit(x, y)) { b.press(); return; }
    const c = this.cardAt(x, y);
    if (c && !this.pickMode(this.cards.indexOf(c))) this.start();
  },
  onKey(e) {
    commonKeys(e);
    if (e.key === 'Escape') this.leave();
    if (e.key === 'Enter' || e.key === ' ') this.start();
    const n = ['1', '2', '3', '4'].indexOf(e.key);
    if (n >= 0) this.pickMode(n);
  },
  update(dt, realDt) {
    this.t += dt;
    const p = Engine.pointer;
    const hot = this.cardAt(p.x, p.y);
    for (const c of this.cards) {
      if (c === hot && !c.hover) Sound.hover();
      c.hover = c === hot;
      c.spring.target = c.hover ? 1.05 : 1;
      c.spring.update(dt);
    }
    this.buttons.forEach(b => { b.hover = b.hit(p.x, p.y); b.update(realDt, this.t); });
  },
  draw(ctx) {
    const th = this.theme, t = this.t;
    drawPolka(ctx, th, t);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(640 - 230, 104, 46, 0, TAU); ctx.fill();
    ctx.strokeStyle = th.secondary; ctx.lineWidth = 6; ctx.stroke();
    drawItem(ctx, this.poll.items[0], 640 - 230, 104, 66);
    txt(ctx, this.poll.title, 660, 98, { size: 58, fill: '#fff', stroke: th.primary, lw: 12, maxW: 520 });
    txt(ctx, 'Choose a game mode', 640, 182, { size: 26, font: FONT_ROUND, fill: th.primary, shadow: false });
    for (const c of this.cards) this.drawModeCard(ctx, c, t);
    txt(ctx, 'TEAMS', 400, 476, { size: 22, font: FONT_ROUND, fill: th.primary, shadow: false });
    txt(ctx, 'FRAMES', 992, 476, { size: 22, font: FONT_ROUND, fill: th.primary, shadow: false });
    this.buttons.forEach(b => b.draw(ctx));
    Particles.draw(ctx, 'ui');
  },
  drawModeCard(ctx, c, t) {
    if (c.appear <= 0.01) return;
    const th = this.theme, sel = Settings.mode === c.m.key;
    ctx.save();
    ctx.translate(c.x, c.y);
    const s = c.spring.v * c.appear;
    ctx.scale(s, s);
    const w = c.w, h = c.h;
    if (sel) Glow.draw(ctx, th.accent, 0, 0, 210, 0.35);
    drawCard(ctx, -w / 2, -h / 2, w, h, { border: sel ? th.accent : th.secondary, lw: sel ? 8 : 4, base: shade(th.secondary, -0.15) });
    const it = this.poll.items[0];
    const L = -70, R = 70, y = -24;
    const word = (x) => txt(ctx, it.en, x, y, { size: 28, font: FONT_ROUND, fill: th.primary, shadow: false, maxW: 120 });
    const arrow = () => txt(ctx, '→', 0, y, { size: 32, font: FONT_ROUND, fill: th.accent, shadow: false });
    if (c.m.key === 'pic2word') { drawItem(ctx, it, L, y, 76); word(R); arrow(); }
    else if (c.m.key === 'word2pic') { word(L); drawItem(ctx, it, R, y, 76); arrow(); }
    else if (c.m.key === 'jp2en') { txt(ctx, it.jp, L, y, { size: 30, font: FONT_JP, weight: '700', fill: th.primary, shadow: false, maxW: 120 }); word(R); arrow(); }
    else this.poll.items.slice(0, 3).forEach((item, i) => drawBall(ctx, (i - 1) * 74, y + (i === 1 ? -8 : 0), 34, BALL_COLORS[i], 0, { item }));
    txt(ctx, c.m.title, 0, 46, { size: 25, font: FONT_ROUND, fill: th.primary, shadow: false, maxW: w - 30 });
    txt(ctx, c.m.jp, 0, 76, { size: 15, font: FONT_JP, weight: '700', fill: shade(th.primary, 0.35), shadow: false, maxW: w - 24 });
    txt(ctx, String(MODES.indexOf(c.m) + 1), -w / 2 + 20, -h / 2 + 22, { size: 18, font: FONT_ROUND, fill: shade(th.secondary, -0.3), shadow: false });
    if (sel) {
      ctx.fillStyle = th.accent;
      ctx.beginPath(); ctx.arc(w / 2 - 18, -h / 2 + 18, 20, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(w / 2 - 27, -h / 2 + 18); ctx.lineTo(w / 2 - 20, -h / 2 + 25); ctx.lineTo(w / 2 - 8, -h / 2 + 10); ctx.stroke();
    }
    ctx.restore();
  }
};

// ============================================================ GAME
// The alley picture covers a 1645x940 area so it fills both 16:9 screens and wide Chromebook screens.
// Lane lines were measured on the picture (at 1280px wide) and converted to game coordinates.
const PIC = 1645 / 1280;
const ALLEY = { src: 'img/alley.jpg', x: -182, y: -150, w: 1645, h: 940 };
const toPy = Y => (Y + 150) / PIC;
const laneCX = Y => -182 + PIC * (647 - 0.035 * (toPy(Y) - 345));
const halfW = Y => Math.max(6, PIC * (88 + 0.985 * (toPy(Y) - 345)));
const gutW = Y => Math.max(2, PIC * (14 + 0.34 * (toPy(Y) - 345)));
const DECK_Y = 286;                  // front edge of the pin deck
const PIT_Y = 188;                   // bottom edge of the pinsetter hood
const PIN_ROWS = [288, 278, 268, 258];   // front → back
const PIN_CLIP = [556, PIT_Y, 182, 240]; // the opening between the pillars
const HOME_Y = 545, CARD_Y = 645;

// Team Battle: how often each pin count (0–10) comes up before any balancing
const PIN_ODDS = [3, 2, 3, 3, 4, 6, 9, 12, 14, 13, 21];
const BATTLE_Q = {
  vegetables: 'What vegetable do you like?', fruits: 'What fruit do you like?', animals: 'What animal do you like?',
  animals2: 'What animal do you like?', colors: 'What color do you like?', sports: 'What sport do you like?',
  prefectures: 'Where do you want to go?', days: 'What day do you like?', months: 'When is your birthday?',
  seasons: 'What season do you like?', seaAnimals: 'What sea animal do you like?', feelings: 'How are you?'
};

const GameScene = {
  enter(data) {
    this.key = data.key;
    this.poll = POLLS[this.key];
    this.theme = this.poll.theme;
    this.items = this.poll.items;
    preloadPoll(this.poll);
    this.mode = Settings.mode;
    this.battle = this.mode === 'battle';
    this.teams = this.battle ? Settings.bteams : Settings.teams;
    this.frames = Settings.frames;
    this.total = this.teams * this.frames;
    this.results = Array.from({ length: this.teams }, () => Array(this.frames).fill(null));
    this.queue = this.battle ? null : this.makeQueue(this.total);
    this.r = -1;
    this.t = 0;
    this.phase = 'start';
    this.leaving = false;
    this.showQ = true;
    this.mood = 'idle';
    this.title = null;
    this.target = null;
    this.bubble = { s: 0 };
    this.answer = { s: 0 };
    this.over = { s: 0 };
    this.pins = [];
    this.balls = [];
    const th = this.theme;
    this.backBtn = new Button({ x: 46, y: 44, w: 58, circle: true, color: th.buttonColor, icon: Icons.back, onClick: () => this.leave() });
    this.nextBtn = new Button({ x: 1140, y: 652, w: 220, h: 78, label: 'NEXT ▶', size: 38, color: th.accent, textColor: '#fff', visible: false, appear: 0, pulse: true, onClick: () => this.next() });
    this.againBtn = new Button({ x: 520, y: 640, w: 260, h: 78, label: 'PLAY AGAIN', size: 34, color: th.buttonColor, textColor: '#fff', visible: false, appear: 0, pulse: true, onClick: () => this.restart() });
    this.newBtn = new Button({ x: 790, y: 640, w: 230, h: 70, label: 'NEW GAME', size: 30, color: '#9aa4b8', textColor: '#fff', visible: false, appear: 0, onClick: () => this.leave() });
    this.kanaBtn = new Button({ x: 1100, y: 44, w: 54, circle: true, color: Settings.kana ? th.accent : '#9aa4b8', label: 'カ', size: 26, font: FONT_JP, textColor: '#fff', onClick: () => this.toggleKana() });
    this.buttons = [this.backBtn, this.nextBtn, this.againBtn, this.newBtn, this.kanaBtn, ...cornerButtons(th.buttonColor)];
    this.setupPins(false);
    this.next();
  },

  // Each item once before any repeats, never the same item twice in a row
  makeQueue(n) {
    const out = [];
    while (out.length < n) {
      const bag = shuffle(this.items);
      if (out.length && bag[0] === out[out.length - 1] && bag.length > 1) [bag[0], bag[1]] = [bag[1], bag[0]];
      out.push(...bag);
    }
    return out.slice(0, n);
  },

  team() { return this.r % this.teams; },
  frame() { return Math.floor(this.r / this.teams); },
  teamColor(i) { return this.teams > 1 ? TEAM_COLORS[i] : this.theme.accent; },
  score(team) { return this.results[team].reduce((a, x) => a + (x === true ? 1 : typeof x === 'number' ? x : 0), 0); },

  show(b) { b.visible = true; Tween.kill(b); Tween.to(b, { appear: 1 }, 0.4, { ease: Ease.outBack }); },
  hide(b) { Tween.kill(b); Tween.to(b, { appear: 0 }, 0.15, { onDone: () => { b.visible = false; } }); },

  toggleKana() {
    Settings.kana = !Settings.kana; Settings.save();
    this.kanaBtn.color = Settings.kana ? this.theme.accent : '#9aa4b8';
    Sound.blip(Settings.kana ? 9 : 3);
  },
  leave() {
    if (this.leaving) return;
    this.leaving = true;
    Engine.go(MenuScene, null, 46, 44);
  },
  restart() {
    if (this.leaving) return;
    this.leaving = true;
    Engine.go(GameScene, { key: this.key }, 520, 640);
  },

  setupPins(drop) {
    this.pins = [];
    PIN_ROWS.forEach((y, j) => {
      const sp = halfW(y) * 0.4, cx = laneCX(y);
      for (let k = 0; k <= j; k++) {
        const pin = { x: cx + (k - j / 2) * sp, y, row: j, h: 0.8 * halfW(y), off: drop ? -150 - j * 20 : 0, vx: 0, vy: 0, g: 0, rot: 0, vr: 0, flying: false, alpha: 1, wob: new Spring(0, 260, 7) };
        if (drop) Tween.to(pin, { off: 0 }, 0.5, { ease: Ease.outBounce, delay: 0.1 + (3 - j) * 0.06 + k * 0.03 });
        this.pins.push(pin);
      }
    });
    this.pins.sort((a, b) => a.y - b.y);   // back rows drawn first
  },

  next() {
    if (this.phase === 'roll') return;
    if (this.r + 1 >= this.total) { this.finish(); return; }
    this.r++;
    this.phase = 'choose';
    this.mood = 'idle';
    this.title = null;
    this.hide(this.nextBtn);
    Tween.kill(this.answer); Tween.to(this.answer, { s: 0 }, 0.15);
    if (this.r > 0) { this.setupPins(true); BowlSfx.reset(); }
    let choices;
    if (this.battle) {
      this.target = null;
      choices = shuffle(this.items).slice(0, Math.min(6, this.items.length));
    } else {
      this.target = this.queue[this.r];
      const others = shuffle(this.items.filter(it => it !== this.target)).slice(0, 3);
      choices = shuffle([this.target, ...others]);
    }
    const n = choices.length, gap = this.battle ? (n > 5 ? 124 : 140) : 172;
    const cx = laneCX(HOME_Y);
    this.balls = choices.map((it, i) => {
      const x = cx + (i - (n - 1) / 2) * gap;
      const b = { i, it, correct: it === this.target, hx: x, x, y: HOME_Y, rot: rand(-0.3, 0.3), color: BALL_COLORS[i % 4], appear: 0, lift: new Spring(0, 300, 16), hover: false, state: 'idle', alpha: 1, cardA: 1, glow: 0, p: 0 };
      if (this.battle) b.color = ['#ff3b5c', '#2f7bff', '#ffae00', '#1fbf5b', '#9b5cff', '#ff7a1a'][i % 6];
      Tween.to(b, { appear: 1 }, 0.45, { ease: Ease.outBack, delay: 0.35 + i * 0.07 });
      return b;
    });
    this.bubble.s = 0;
    Tween.kill(this.bubble);
    if (this.showQ) Tween.to(this.bubble, { s: 1 }, 0.5, { ease: Ease.outBack, delay: 0.15 });
    Sound.boing();
  },

  ballR(b) { return Math.max(1, (this.battle ? 0.145 : 0.12) * halfW(b.y)); },
  ballAt(x, y) {
    if (this.phase !== 'choose') return null;
    return this.balls.find(b => {
      if (b.appear < 0.6) return false;
      if (Math.hypot(x - b.x, y - b.y) < this.ballR(b) + 8) return true;
      if (this.battle) return Math.abs(x - b.hx) < 58 && Math.abs(y - (HOME_Y + 74)) < 22;
      return Math.abs(x - b.hx) < 78 && Math.abs(y - CARD_Y) < 58;
    });
  },
  mascotHit(x, y) { return Math.abs(x - 112) < 70 && y > 420 && y < 640; },
  isHot(x, y) { return !!this.ballAt(x, y) || this.mascotHit(x, y) || this.buttons.some(b => b.hit(x, y)); },

  onDown(x, y) {
    for (const b of this.buttons) if (b.hit(x, y)) { b.press(); return; }
    if (this.mascotHit(x, y)) { this.toggleQuestion(); return; }
    const ball = this.ballAt(x, y);
    if (ball) this.roll(ball);
  },
  onKey(e) {
    commonKeys(e);
    const k = e.key;
    if (k === 'Escape') this.leave();
    else if (k === 'q' || k === 'Q') this.toggleQuestion();
    else if (k === 'k' || k === 'K') this.toggleKana();
    else if (this.phase === 'choose' && /^[1-6]$/.test(k)) { const b = this.balls[+k - 1]; if (b) this.roll(b); }
    else if ((k === 'Enter' || k === ' ' || k === 'ArrowRight') && this.phase === 'result' && this.nextBtn.appear > 0.5) this.next();
    else if (k === 'Enter' && this.phase === 'over') this.restart();
  },
  toggleQuestion() {
    this.showQ = !this.showQ;
    Tween.kill(this.bubble);
    Tween.to(this.bubble, { s: this.showQ ? 1 : 0 }, this.showQ ? 0.4 : 0.18, { ease: this.showQ ? Ease.outBack : Ease.inQuad });
    Sound.blip(this.showQ ? 8 : 2);
  },

  // ---------------- Team Battle: how many pins fall ----------------
  // Looks like plain luck. Underneath, each roll's odds lean a little towards whichever
  // team is behind the pack (and a little away from a runaway leader). The lean grows as
  // the game goes on and is always mixed with noise, so leaders still get strikes and
  // trailing teams still miss. On a team's last roll, totals that would tie another
  // team are taken out, so the final table never has a draw.
  rollPins(team) {
    const T = this.teams;
    const total = this.results.map((_, j) => this.score(j));
    const left = j => this.frames - this.results[j].filter(x => x !== null).length;   // rolls still to come (incl. this one)
    const EXP = 7.2;                                   // average pins per roll
    const proj = j => total[j] + left(j) * EXP;        // where each team is heading
    const others = [...Array(T).keys()].filter(j => j !== team);
    const pOthers = others.map(proj);
    const mean = pOthers.reduce((a, b) => a + b, 0) / pOthers.length;
    const gapMean = mean - proj(team);                 // + = behind the pack
    const gapTop = Math.max(...pOthers) - proj(team);  // + = behind the leader
    const progress = this.r / Math.max(1, this.total - 1);
    let lean = (0.045 * gapMean + 0.03 * Math.max(0, gapTop) + 0.02 * Math.min(0, gapTop)) * (0.45 + 0.9 * progress);
    lean = clamp(lean, -1.1, 1.1) + rand(-0.35, 0.35);
    let w = PIN_ODDS.map((b, n) => b * Math.exp(lean * (n - EXP) / 3));
    if (left(team) === 1) {
      const ok = w.map((x, n) => (others.some(j => total[team] + n === total[j]) ? 0 : x));
      if (ok.some(x => x > 0)) w = ok;
    }
    let s = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let n = 0; n <= 10; n++) { s -= w[n]; if (s <= 0) return n; }
    return 10;
  },

  roll(ball) {
    if (this.phase !== 'choose') return;
    this.phase = 'roll';
    ball.state = 'roll';
    Sound.click();
    this.balls.forEach(b => { if (b !== ball) Tween.to(b, { alpha: 0.35 }, 0.3); });
    const n = this.battle ? this.rollPins(this.team()) : (ball.correct ? 10 : 0);
    if (this.battle) this.target = ball.it;
    const x0 = ball.x, y0 = ball.y;
    const side = x0 < laneCX(y0) - 10 ? -1 : x0 > laneCX(y0) + 10 ? 1 : (Math.random() < 0.5 ? -1 : 1);
    let onDone;
    if (n === 0) {
      const gy = 320, gx = laneCX(gy) + side * (halfW(gy) + gutW(gy) * 0.5);
      ball.path = [[x0, y0], [lerp(x0, laneCX(400), 0.45), 400], [gx, gy]];
      onDone = () => this.gutter(ball, side);
    } else {
      const u = n === 10 ? rand(0.03, 0.1) : n >= 8 ? rand(0.12, 0.22) : n >= 5 ? rand(0.24, 0.42) : n >= 3 ? rand(0.44, 0.6) : rand(0.64, 0.8);
      const ex = laneCX(DECK_Y) + side * u * halfW(DECK_Y);
      ball.path = [[x0, y0], [lerp(x0, ex, 0.7), 400], [ex, DECK_Y + 2]];
      onDone = () => this.hit(ball, n, ex);
    }
    Tween.to(ball.lift, { v: 26 }, 0.18, { ease: Ease.outQuad });
    Timers.after(0.2, () => {
      ball.lift.v = 0;
      Sound.whoosh(0.3);
      BowlSfx.roll(1.1);
      Tween.to(ball, { p: 1 }, 1.0, { ease: Ease.inOutQuad, onDone });
    });
  },

  // after reaching the end of its path the ball carries on into the pit and vanishes
  carryOn(ball, toX, dur = 0.35) {
    const o = { k: 0 };
    ball.carry = { o, fx: ball.x, fy: ball.y, toX };
    ball.path = null;
    Tween.to(o, { k: 1 }, dur, { ease: Ease.linear, onDone: () => { ball.state = 'gone'; } });
  },

  knockPin(p, ex, power) {
    p.flying = true;
    const dir = Math.sign(p.x - ex) || (Math.random() < 0.5 ? -1 : 1);
    p.vx = dir * rand(60, 260) * power + rand(-40, 40);
    p.vy = -rand(150, 420) * power;
    p.g = 380;
    p.vr = dir * rand(6, 13);
  },

  hit(ball, n, ex) {
    const strike = n >= 10;
    this.carryOn(ball, laneCX(PIT_Y) + (ex - laneCX(DECK_Y)) * 0.7);
    // which pins go: the ones nearest where the ball came in, front rows first
    const order = this.pins.map(p => ({ p, d: Math.abs(p.x - ex) / halfW(p.y) + p.row * 0.1 + rand(0, 0.12) })).sort((a, b) => a.d - b.d);
    order.slice(0, n).forEach((o, k) => Timers.after(k * 0.025 + o.p.row * 0.03, () => this.knockPin(o.p, ex, strike ? 1.7 : 1)));
    this.pins.forEach(p => { if (!order.slice(0, n).some(o => o.p === p)) Timers.after(0.12, () => p.wob.kick(rand(-2, 2))); });
    Engine.addShake(0.12 + n * 0.04);
    if (strike) { Engine.hitstop = 0.06; Engine.doFlash(0.3, '#fff6c8'); }
    BowlSfx.crash(n);
    FX.sparkleBurst(ex, 250, 6 + n * 1.6, ['#ffffff', '#ffe27a', this.theme.accent], 'ui', 0.6 + n * 0.07);
    this.results[this.team()][this.frame()] = this.battle ? n : true;
    this.mood = n >= 6 ? 'happy' : n <= 3 ? 'sad' : 'idle';
    Timers.after(0.25, () => {
      if (strike) {
        this.title = new BigTitle('STRIKE!', { x: 640, y: 380, size: 132 });
        Sound.fanfare();
        FX.confettiCannon(380, 720, 1, 50);
        FX.confettiCannon(900, 720, -1, 50);
      } else {
        this.title = new BigTitle(n === 1 ? '1 PIN!' : `${n} PINS!`, { x: 640, y: 380, size: 116, colors: ['#ffffff', '#bff3ff', '#3bb8ff'], outline: '#0d3a66' });
        if (n >= 6) Sound.chime(); else Sound.boing();
      }
    });
    Timers.after(1.2, () => this.showResult());
  },

  gutter(ball, side) {
    this.carryOn(ball, laneCX(PIT_Y) + side * (halfW(PIT_Y) + gutW(PIT_Y) * 0.5), 0.45);
    BowlSfx.gutter();
    this.pins.forEach(p => p.wob.kick(rand(-1.5, 1.5)));
    this.results[this.team()][this.frame()] = this.battle ? 0 : false;
    this.mood = 'sad';
    Timers.after(0.35, () => {
      this.title = new BigTitle(this.battle ? 'GUTTER!' : 'MISS!', { x: 640, y: 380, size: 116, colors: ['#ffffff', '#c9d6ff', '#7d8fd6'], outline: '#1d2b5a' });
      BowlSfx.miss();
    });
    if (!this.battle) {
      const right = this.balls.find(b => b.correct);
      Timers.after(0.9, () => { Tween.to(right, { alpha: 1, glow: 1 }, 0.3); Sound.chime(); });
    }
    Timers.after(1.3, () => this.showResult());
  },

  showResult() {
    this.phase = 'result';
    Tween.kill(this.answer);
    Tween.to(this.answer, { s: 1 }, 0.45, { ease: Ease.outBack });
    this.nextBtn.label = this.r + 1 >= this.total ? 'SCORE ▶' : 'NEXT ▶';
    this.show(this.nextBtn);
  },

  finish() {
    this.phase = 'over';
    this.mood = 'happy';
    this.title = null;
    this.hide(this.nextBtn);
    Tween.to(this.answer, { s: 0 }, 0.15);
    Tween.to(this.bubble, { s: 0 }, 0.15);
    this.balls.forEach(b => Tween.to(b, { appear: 0 }, 0.2));
    Tween.kill(this.over);
    Tween.to(this.over, { s: 1 }, 0.6, { ease: Ease.outBack });
    Timers.after(0.5, () => { this.show(this.againBtn); this.show(this.newBtn); });
    Sound.fanfare();
    Timers.after(0.3, () => { FX.confettiCannon(200, 720, 1, 80); FX.confettiCannon(1080, 720, -1, 80); });
    Timers.after(1.0, () => FX.firework(640, 160, this.theme.accent));
  },

  update(dt, realDt) {
    this.t += dt;
    const p = Engine.pointer;
    const hot = this.ballAt(p.x, p.y);
    for (const b of this.balls) {
      if (b === hot && !b.hover) Sound.hover();
      b.hover = b === hot;
      if (b.state === 'idle') b.lift.target = b.hover ? 14 : 0;
      b.lift.update(dt);
      if (b.state === 'roll' && b.path) {
        const [[ax, ay], [cx, cy], [ex, ey]] = b.path, u = b.p;
        const nx = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * cx + u * u * ex;
        const ny = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * cy + u * u * ey;
        b.rot += (nx - b.x) / Math.max(4, this.ballR(b)) * 0.6;
        b.x = nx; b.y = ny;
        b.cardA = Math.max(0, 1 - u * 3);
      } else if (b.carry) {
        const c = b.carry, k = c.o.k;
        b.x = lerp(c.fx, c.toX, k);
        b.y = lerp(c.fy, PIT_Y - 30, k);
      }
    }
    for (const pin of this.pins) {
      pin.wob.update(dt);
      if (pin.flying) {
        pin.vy += pin.g * dt;
        pin.x += pin.vx * dt;
        pin.y += pin.vy * dt;
        pin.rot += pin.vr * dt;
        pin.alpha = Math.max(0, pin.alpha - dt * 1.1);
      }
    }
    if (this.title) this.title.update(dt);
    this.buttons.forEach(b => { b.hover = b.hit(p.x, p.y); b.update(realDt, this.t); });
  },

  // ---------------- drawing ----------------
  draw(ctx) {
    ScreenLayers.draw(ctx, 'alley' + (Images.get(ALLEY.src) ? 1 : 0), (g, v) => this.paintAlley(g, v));
    const deep = b => b.state !== 'idle' && b.y < DECK_Y;      // ball already past the front pins
    for (const b of this.balls) if (deep(b)) this.drawBallFor(ctx, b);
    ctx.save();
    ctx.beginPath(); ctx.rect(...PIN_CLIP); ctx.clip();
    for (const pin of this.pins) {
      if (pin.alpha <= 0.01) continue;
      drawPin(ctx, pin.x, pin.y + pin.off, pin.h, { rot: pin.rot + pin.wob.v * 0.12, alpha: pin.alpha, noShadow: pin.flying });
    }
    ctx.restore();
    for (const b of this.balls) this.drawCardFor(ctx, b);
    for (const b of this.balls) if (!deep(b)) this.drawBallFor(ctx, b);
    this.drawScoreboard(ctx);
    this.drawFrameBanner(ctx);
    this.drawMascot(ctx);
    this.drawQuestion(ctx);
    this.drawAnswer(ctx);
    if (this.title) this.title.draw(ctx);
    if (this.over.s > 0.01) this.drawOver(ctx);
    Particles.draw(ctx, 'fx');
    this.buttons.forEach(b => b.draw(ctx));
    Particles.draw(ctx, 'ui');
  },

  paintAlley(g, v) {
    g.fillStyle = '#3b2353';
    g.fillRect(v.x, v.y, v.w, v.h);
    const img = Images.get(ALLEY.src);
    if (img) g.drawImage(img, ALLEY.x, ALLEY.y, ALLEY.w, ALLEY.h);
    // soft darkening at the edges so the panels stand out
    const vg = g.createRadialGradient(640, 380, 380, 640, 380, 980);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,0,30,0.4)');
    g.fillStyle = vg;
    g.fillRect(v.x, v.y, v.w, v.h);
  },

  cardSize() { return this.mode === 'word2pic' ? { w: 150, h: 104 } : { w: 160, h: 74 }; },

  drawCardFor(ctx, b) {
    if (b.appear <= 0.01 || b.cardA <= 0.01) return;
    if (this.battle) { this.drawLabelFor(ctx, b); return; }
    const { w, h } = this.cardSize();
    ctx.save();
    ctx.translate(b.hx, CARD_Y);
    const s = b.appear * (1 + b.lift.v * 0.004);
    ctx.scale(s, s);
    ctx.globalAlpha *= b.alpha * b.cardA;
    if (b.glow > 0.01) Glow.draw(ctx, '#7dff9a', 0, 0, 140, b.glow * (0.6 + Math.sin(this.t * 8) * 0.25));
    drawCard(ctx, -w / 2, -h / 2, w, h, { border: b.glow > 0.5 ? '#21c25a' : b.color, lw: b.glow > 0.5 ? 7 : 5, base: shade(b.color, -0.2), r: 18 });
    if (this.mode === 'word2pic') drawItem(ctx, b.it, 0, 0, h - 18);
    else {
      const kana = Settings.kana;
      txt(ctx, b.it.en, 0, kana ? -11 : 1, { size: 32, font: FONT_ROUND, fill: shade(b.color, -0.45), shadow: false, maxW: w - 20 });
      if (kana) txt(ctx, b.it.katakana, 0, 22, { size: 16, font: FONT_JP, weight: '700', fill: '#6a5a90', shadow: false, maxW: w - 16 });
    }
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.arc(-w / 2 + 6, -h / 2 + 6, 15, 0, TAU); ctx.fill();
    txt(ctx, String(b.i + 1), -w / 2 + 6, -h / 2 + 7, { size: 18, font: FONT_ROUND, fill: '#fff', shadow: false });
    ctx.restore();
  },

  // Team Battle: a name plate under each ball
  drawLabelFor(ctx, b) {
    const kana = Settings.kana, w = 116, h = kana ? 48 : 36;
    ctx.save();
    ctx.translate(b.hx, HOME_Y + 74 + (kana ? 6 : 0));
    ctx.scale(b.appear, b.appear);
    ctx.globalAlpha *= b.alpha * b.cardA;
    drawCard(ctx, -w / 2, -h / 2, w, h, { border: b.color, lw: 4, base: shade(b.color, -0.2), r: 14 });
    txt(ctx, b.it.en, 0, kana ? -8 : 1, { size: 21, font: FONT_ROUND, fill: shade(b.color, -0.45), shadow: false, maxW: w - 14 });
    if (kana) txt(ctx, b.it.katakana, 0, 13, { size: 13, font: FONT_JP, weight: '700', fill: '#6a5a90', shadow: false, maxW: w - 12 });
    ctx.restore();
  },

  drawBallFor(ctx, b) {
    if (b.appear <= 0.01 || b.state === 'gone') return;
    const r = this.ballR(b) * b.appear;
    const deep = b.state !== 'idle' && b.y < DECK_Y + 30;
    if (deep) { ctx.save(); ctx.beginPath(); ctx.rect(500, PIT_Y, 300, 600); ctx.clip(); }
    if (b.hover && b.state === 'idle') Glow.draw(ctx, b.color, b.x, b.y - b.lift.v, r * 2, 0.5);
    drawBall(ctx, b.x, b.y - b.lift.v, r, b.color, b.rot, { alpha: b.alpha, item: this.battle ? b.it : null, spin: this.battle ? b.rot * 0.5 : 0 });
    if (this.battle && b.state === 'idle') {
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x - r * 0.78, b.y - b.lift.v - r * 0.78, 14, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      txt(ctx, String(b.i + 1), b.x - r * 0.78, b.y - b.lift.v - r * 0.78 + 1, { size: 16, font: FONT_ROUND, fill: '#fff', shadow: false });
    }
    if (deep) ctx.restore();
  },

  drawFrameBanner(ctx) {
    if (this.phase === 'over') return;
    const team = this.team();
    const label = this.teams > 1 ? `TEAM ${TEAM_NAMES[team]} · FRAME ${this.frame() + 1}/${this.frames}` : `FRAME ${this.frame() + 1} / ${this.frames}`;
    drawRibbon(ctx, 640, 40, this.teams > 1 ? 400 : 300, 52, this.teams > 1 ? TEAM_COLORS[team] : this.theme.buttonColor, label, { size: 26 });
  },

  drawScoreboard(ctx) {
    const th = this.theme;
    const rowH = this.teams > 3 ? 34 : 40;
    const cw = this.frames === 10 ? (this.battle ? 24 : 32) : this.frames === 5 ? 40 : 52;
    const x0 = 1262 - this.frames * cw, y0 = 92;
    const lead = 74;
    ctx.save();
    ctx.fillStyle = 'rgba(10,6,30,0.78)';
    rr(ctx, x0 - lead, y0 - 8, this.frames * cw + lead + 8, this.teams * rowH + 16, 14); ctx.fill();
    ctx.strokeStyle = th.secondary; ctx.lineWidth = 2; ctx.stroke();
    for (let tm = 0; tm < this.teams; tm++) {
      const y = y0 + tm * rowH;
      const col = this.teamColor(tm);
      const cur = this.phase !== 'over' && tm === this.team();
      if (this.teams > 1) {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x0 - lead + 18, y + rowH / 2, rowH * 0.36, 0, TAU); ctx.fill();
        if (cur) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
        txt(ctx, TEAM_NAMES[tm], x0 - lead + 18, y + rowH / 2 + 1, { size: rowH * 0.42, font: FONT_ROUND, fill: '#fff', shadow: false });
      }
      txt(ctx, String(this.score(tm)), x0 - 24, y + rowH / 2 + 1, { size: rowH * 0.66, fill: '#fff', stroke: shade(col, -0.4), lw: 5, shadow: false, maxW: 40 });
      for (let f = 0; f < this.frames; f++) {
        const x = x0 + f * cw;
        const now = cur && f === this.frame();
        ctx.fillStyle = now ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.14)';
        rr(ctx, x + 2, y + 3, cw - 4, rowH - 6, 6); ctx.fill();
        const res = this.results[tm][f];
        const mid = y + rowH / 2 + 1, sz = Math.min(rowH * 0.58, cw * 0.72);
        if (res === true || res === 10) txt(ctx, 'X', x + cw / 2, mid, { size: sz, fill: col, stroke: '#fff', lw: 4, shadow: false });
        else if (res === false || res === 0) txt(ctx, '–', x + cw / 2, mid, { size: sz, font: FONT_ROUND, fill: now ? '#556' : 'rgba(255,255,255,0.6)', shadow: false });
        else if (typeof res === 'number') txt(ctx, String(res), x + cw / 2, mid, { size: sz, font: FONT_ROUND, fill: now ? '#2a2140' : '#fff', shadow: false });
        else if (!now && cw >= 30) txt(ctx, String(f + 1), x + cw / 2, mid, { size: 13, font: FONT_ROUND, fill: 'rgba(255,255,255,0.35)', shadow: false });
      }
    }
    ctx.restore();
  },

  drawMascot(ctx) {
    drawPinny(ctx, 112, 632, 190, this.mood, this.t);
    if (!this.showQ && this.phase === 'choose') drawHand(ctx, 180, 470 + Math.sin(this.t * 5) * 6, 0.7);
  },

  drawQuestion(ctx) {
    const s = this.bubble.s;
    if (s <= 0.01 || this.r < 0) return;
    const th = this.theme, it = this.target;
    const x = 24, y = 92, w = 390, h = 300;
    ctx.save();
    ctx.translate(120, y + h + 20);
    ctx.scale(s, s);
    ctx.translate(-120, -(y + h + 20));
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    rr(ctx, x, y + 8, w, h, 30); ctx.fill();
    const edge = this.battle ? TEAM_COLORS[this.team()] : th.primary;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = edge;
    ctx.lineWidth = 6;
    rr(ctx, x, y, w, h, 30); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(90, y + h - 3); ctx.lineTo(108, y + h + 36); ctx.lineTo(140, y + h - 3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(90, y + h); ctx.lineTo(108, y + h + 36); ctx.lineTo(140, y + h); ctx.stroke();
    const cx = x + w / 2;
    if (this.battle) {
      const col = TEAM_COLORS[this.team()];
      ctx.fillStyle = col;
      rr(ctx, cx - 110, y + 22, 220, 54, 27); ctx.fill();
      txt(ctx, `TEAM ${TEAM_NAMES[this.team()]}`, cx, y + 50, { size: 36, fill: '#fff', stroke: shade(col, -0.45), lw: 6, shadow: false });
      txt(ctx, BATTLE_Q[this.key] || 'What do you like?', cx, y + 118, { size: 30, font: FONT_ROUND, fill: th.primary, shadow: false, maxW: w - 36 });
      const pr = this.poll.prompt.en;
      setFont(ctx, 38, FONT_ROUND, '700');
      const pw = ctx.measureText(pr + ' ').width, bw = 130, tw = pw + bw + 14;
      const lx = cx - tw / 2;
      txt(ctx, pr, lx, y + 190, { size: 38, font: FONT_ROUND, fill: th.primary, shadow: false, align: 'left' });
      const shown = it && this.phase !== 'choose';
      if (shown) txt(ctx, wordIn(this.key, it) + '.', lx + pw, y + 190, { size: 38, font: FONT_ROUND, fill: th.accent, shadow: false, align: 'left', maxW: w - 40 - pw });
      else {
        ctx.strokeStyle = th.accent; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(lx + pw, y + 208); ctx.lineTo(lx + pw + bw, y + 208); ctx.stroke();
        txt(ctx, '.', lx + pw + bw + 8, y + 190, { size: 38, font: FONT_ROUND, fill: th.primary, shadow: false });
      }
      if (Settings.kana) txt(ctx, `${this.poll.prompt.jp} ${shown ? it.katakana : '〜'}`, cx, y + 252, { size: 22, font: FONT_JP, weight: '700', fill: '#6a5a90', shadow: false, maxW: w - 40 });
    } else if (this.mode === 'pic2word') {
      txt(ctx, PIC_QUESTION[this.key] || "What's this?", cx, y + 42, { size: 34, font: FONT_ROUND, fill: th.primary, shadow: false, maxW: w - 40 });
      drawItem(ctx, it, cx, y + 175, 210);
    } else if (this.mode === 'word2pic') {
      if (this.poll.question) txt(ctx, this.poll.question.en, cx, y + 50, { size: 28, font: FONT_ROUND, weight: '600', fill: shade(th.primary, 0.3), shadow: false, maxW: w - 40 });
      txt(ctx, this.poll.prompt.en, cx, y + 125, { size: 40, font: FONT_ROUND, fill: th.primary, shadow: false, maxW: w - 40 });
      txt(ctx, wordIn(this.key, it) + '.', cx, y + 185, { size: 58, font: FONT_ROUND, fill: th.accent, shadow: false, maxW: w - 40 });
      if (Settings.kana) txt(ctx, `${this.poll.prompt.jp} ${it.katakana}`, cx, y + 250, { size: 22, font: FONT_JP, weight: '700', fill: '#6a5a90', shadow: false, maxW: w - 40 });
    } else {
      txt(ctx, 'えいご で なんて いう？', cx, y + 46, { size: 26, font: FONT_JP, weight: '700', fill: shade(th.primary, 0.3), shadow: false, maxW: w - 40 });
      txt(ctx, it.jp, cx, y + 165, { size: 72, font: FONT_JP, weight: '700', fill: th.primary, shadow: false, maxW: w - 50 });
    }
    ctx.restore();
  },

  // After each roll: the full sentence for the ball that was rolled / the right answer
  drawAnswer(ctx) {
    const s = this.answer.s;
    if (s <= 0.01 || !this.target) return;
    const th = this.theme, it = this.target;
    const w = 330, h = 236;
    ctx.save();
    ctx.translate(1084, 448);
    ctx.scale(s, s);
    drawCard(ctx, -w / 2, -h / 2, w, h, { border: th.accent, lw: 6, base: shade(th.secondary, -0.2) });
    drawItem(ctx, it, 0, -h / 2 + 70, 112);
    txt(ctx, sentence(this.key, it), 0, h / 2 - 60, { size: 34, font: FONT_ROUND, fill: th.primary, shadow: false, maxW: w - 30 });
    txt(ctx, `${this.poll.prompt.jp} ${it.katakana}`, 0, h / 2 - 24, { size: 19, font: FONT_JP, weight: '700', fill: '#6a5a90', shadow: false, maxW: w - 30 });
    ctx.restore();
  },

  drawOver(ctx) {
    const th = this.theme, s = this.over.s;
    const v = Engine.view();
    ctx.save();
    ctx.globalAlpha = clamp(s, 0, 1) * 0.6;
    ctx.fillStyle = '#0a0620';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.restore();
    ctx.save();
    ctx.translate(640, 330);
    ctx.scale(s, s);
    drawSunburst(ctx, 0, -120, 420, 0.5, this.t);
    const gold = { grad: ['#fffbd0', '#ffd21f', '#ff8a00'] };
    if (this.teams === 1) {
      drawCard(ctx, -380, -200, 760, 344, { border: th.accent, lw: 8, base: shade(th.secondary, -0.2), r: 36 });
      const sc = this.score(0);
      Icons.trophy(ctx, 0, -110, 0.8);
      txt(ctx, `${sc} STRIKE${sc === 1 ? '' : 'S'}!`, 0, 20, { size: 78, fill: gold, stroke: th.primary, lw: 12 });
      txt(ctx, `out of ${this.frames}`, 0, 84, { size: 30, font: FONT_ROUND, fill: th.primary, shadow: false });
    } else if (!this.battle) {
      drawCard(ctx, -380, -200, 760, 344, { border: th.accent, lw: 8, base: shade(th.secondary, -0.2), r: 36 });
      const a = this.score(0), b = this.score(1);
      txt(ctx, a === b ? "IT'S A TIE!" : `TEAM ${a > b ? 'A' : 'B'} WINS!`, 0, -130, { size: 64, fill: gold, stroke: th.primary, lw: 12 });
      [a, b].forEach((sc, i) => {
        const x = i ? 170 : -170;
        if (a !== b && (i === 0) === (a > b)) drawCrown(ctx, x, -68, 1.3);
        txt(ctx, `TEAM ${TEAM_NAMES[i]}`, x, -24, { size: 34, fill: TEAM_COLORS[i], stroke: '#fff', lw: 6, shadow: false });
        txt(ctx, String(sc), x, 46, { size: 96, fill: TEAM_COLORS[i], stroke: shade(TEAM_COLORS[i], -0.5), lw: 10 });
      });
      txt(ctx, 'VS', 0, 30, { size: 40, font: FONT_ROUND, fill: th.primary, shadow: false });
    } else {
      // ranking table
      const rows = [...Array(this.teams).keys()].map(i => ({ i, sc: this.score(i) })).sort((a, b) => b.sc - a.sc);
      const rh = this.teams > 4 ? 44 : 52, top = -150;
      const ch = 110 + rows.length * rh;
      drawCard(ctx, -330, -246, 660, ch, { border: th.accent, lw: 8, base: shade(th.secondary, -0.2), r: 36 });
      const win = rows[0];
      txt(ctx, `TEAM ${TEAM_NAMES[win.i]} WINS!`, 0, -196, { size: 60, fill: gold, stroke: th.primary, lw: 12 });
      const medals = ['#ffcb05', '#c9d3e3', '#e09a5a'];
      rows.forEach((row, k) => {
        const y = top + k * rh + rh / 2, col = TEAM_COLORS[row.i];
        ctx.fillStyle = k === 0 ? 'rgba(255,203,5,0.18)' : k % 2 ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0)';
        rr(ctx, -300, y - rh / 2 + 3, 600, rh - 6, 12); ctx.fill();
        if (k < 3) { ctx.fillStyle = medals[k]; ctx.beginPath(); ctx.arc(-262, y, rh * 0.34, 0, TAU); ctx.fill(); }
        txt(ctx, String(k + 1), -262, y + 1, { size: rh * 0.42, font: FONT_ROUND, fill: k < 3 ? '#5c3d00' : '#8a8aa0', shadow: false });
        ctx.fillStyle = col;
        rr(ctx, -220, y - rh * 0.34, 200, rh * 0.68, rh * 0.34); ctx.fill();
        txt(ctx, `TEAM ${TEAM_NAMES[row.i]}`, -120, y + 1, { size: rh * 0.5, fill: '#fff', stroke: shade(col, -0.45), lw: 5, shadow: false });
        if (k === 0) drawCrown(ctx, -16, y - 4, 0.9);
        txt(ctx, `${row.sc}`, 180, y + 1, { size: rh * 0.7, fill: col, stroke: shade(col, -0.5), lw: 6, shadow: false });
        txt(ctx, 'pins', 250, y + 4, { size: rh * 0.34, font: FONT_ROUND, fill: '#8a8aa0', shadow: false });
      });
    }
    ctx.restore();
  }
};

function drawCrown(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -22, 0, 14);
  g.addColorStop(0, '#fff3a0'); g.addColorStop(0.5, '#ffcb05'); g.addColorStop(1, '#e09a00');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#8a5a00';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-26, 14); ctx.lineTo(-30, -14); ctx.lineTo(-14, 0); ctx.lineTo(0, -22);
  ctx.lineTo(14, 0); ctx.lineTo(30, -14); ctx.lineTo(26, 14); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------ boot
window.addEventListener('DOMContentLoaded', () => {
  Settings.load();
  Engine.transIcon = 'favicon.png';
  Images.load('favicon.png');
  Engine.init(document.getElementById('game'));
  Engine.setScene(LoadingScene);
});
