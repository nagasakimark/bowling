// ============================================================
//  KIRBY BOWLING — scenes: Menu → Setup → Game (5 frames by default)
//  Categories come from js/data.js (same list as nagasakimark/poll).
// ============================================================
'use strict';

const MENU_THEME = { primary: '#A0185E', secondary: '#FFC9E3', background: '#FFF0F7', accent: '#FF7A00', buttonColor: '#FF4F9F' };
const TILE_COLORS = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#FF9F43', '#54A0FF', '#8E6CEF', '#FF8FD8', '#00D2D3'];
const BALL_COLORS = ['#ff5fa2', '#3a7bff', '#e8a800', '#28b552', '#a256ff', '#ff7a1a'];   // Kirby ball colours
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

// ---------------- Kirby assets (from the original Kirby Bowling PowerPoint) ----------------
const K = f => `kirby/${f}`;
const KIMG = {
  idle: K('kirby.png'), happy: K('happy.png'), sad: K('sad.png'), angry: K('angry.png'), double: K('double.png'),
  mk: K('metaknight.png'), mkDash: K('metaknight-dash.png'), boom: K('explosion.png'), light: K('light.png'),
  sweat: K('sweat.png'), sign: K('sign.png')
};
const ballSrc = i => K(`ball${i % 6}.png`);
function preloadKirby() {
  Object.values(KIMG).forEach(s => Images.load(s));
  for (let i = 0; i < 6; i++) Images.load(ballSrc(i));
}
Sound.files = {
  strike: K('strike.mp3'), roll: K('roll.mp3'), slash: K('slash.mp3'), impact: K('impact.mp3'), crowd: K('crowd.mp3'),
  next: K('next.mp3'), poke: K('poke.mp3'), pk: K('v-pkflash.mp3'), gaow: K('v-gaow.mp3'),
  ohahh: K('v-ohahh.mp3'), eeyee: K('v-eeyee.mp3'), graaah: K('v-graaah.mp3'),
  uhawa: K('v-uhawa.mp3'), uheeha: K('v-uheeha.mp3'), yaaa: K('v-yaaa.mp3'),
  haragong: K('v-haragong.mp3'), awe: K('v-awe.mp3'), chitzu: K('v-chitzu.mp3')
};

// Background music streams from <audio> (no big decode on Chromebooks)
const Music = {
  tracks: { title: K('bgm-title.mp3'), game: K('bgm-game.mp3'), end: K('bgm-end.mp3') },
  vol: 0.3, k: 1, el: null, name: null,
  play(name) {
    if (this.name === name && this.el) { this.kick(); return; }
    this.stop();
    const a = new Audio(this.tracks[name]);
    a.loop = name !== 'end';
    this.el = a; this.name = name;
    this.sync();
    this.kick();
  },
  kick() { if (this.el && this.el.paused) { const p = this.el.play(); if (p && p.catch) p.catch(() => {}); } },
  stop() {
    const a = this.el;
    this.el = null; this.name = null;
    if (!a) return;
    let v = a.volume;
    const iv = setInterval(() => { v -= 0.05; if (v <= 0) { clearInterval(iv); a.pause(); } else a.volume = v; }, 40);
  },
  sync() { if (this.el) this.el.volume = Sound.muted ? 0 : this.vol * this.k; },
  duck(k, dur) {
    this.k = k; this.sync();
    clearTimeout(this.duckT);
    this.duckT = setTimeout(() => { this.k = 1; this.sync(); }, dur * 1000);
  }
};
// browsers only allow music after the first tap/key
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => Music.kick(), true));

// A Kirby ball. sx/sy squash it (bottom stays on the floor); item puts a picture badge on it.
function drawKirbyBall(ctx, x, y, r, idx, rot = 0, o = {}) {
  if (!(r >= 1)) return;
  const img = Images.get(ballSrc(idx));
  const sx = o.sx || 1, sy = o.sy || 1;
  ctx.save();
  ctx.translate(x, y);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (!o.noShadow) {
    ctx.fillStyle = 'rgba(40,0,30,0.3)';
    ctx.beginPath(); ctx.ellipse(r * 0.1, r * 0.92, r * 0.95 * sx, r * 0.26, 0, 0, TAU); ctx.fill();
  }
  ctx.save();
  ctx.translate(0, r * (1 - sy));
  ctx.scale(sx, sy);
  ctx.rotate(rot);
  if (img) ctx.drawImage(img, -r, -r, r * 2, r * 2);
  else { ctx.fillStyle = BALL_COLORS[idx % 6]; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); }
  ctx.restore();
  if (o.item && r > 8) {
    const br = r * 0.5, bx = r * 0.68 * sx, by = r * 0.52 + r * (1 - sy);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.arc(bx + 2, by + 3, br, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(bx, by, Math.max(1, br - 2), 0, TAU); ctx.clip();
    drawItem(ctx, o.item, bx, by, br * 1.8);
    ctx.restore();
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.strokeStyle = BALL_COLORS[idx % 6];
    ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

// Kirby the host. mood: idle | ready | watch | happy | sad | angry
function drawKirbyHost(ctx, x, y, size, mood, t, lean = 0) {
  const src = { happy: KIMG.happy, sad: KIMG.sad, angry: KIMG.angry }[mood] || KIMG.idle;
  const img = Images.get(src);
  ctx.save();
  ctx.translate(x, y);
  let sx = 1, sy = 1, rot = lean, dy = 0, dx = 0;
  if (mood === 'happy') { const b = Math.abs(Math.sin(t * 8)); dy = -b * 34; sy = 1 + b * 0.06; sx = 1 - b * 0.05; rot += Math.sin(t * 8) * 0.06; }
  else if (mood === 'ready') { sy = 0.86 + Math.sin(t * 30) * 0.015; sx = 1.1; dx = Math.sin(t * 40) * 1.5; }
  else if (mood === 'watch') { rot += 0.12; sy = 1.02; dx = 6; }
  else if (mood === 'sad') { sy = 0.95 + Math.sin(t * 2) * 0.01; rot += Math.sin(t * 1.6) * 0.03; }
  else if (mood === 'angry') { dx = Math.sin(t * 50) * 3; sy = 1 + Math.sin(t * 9) * 0.03; }
  else { sy = 1 + Math.sin(t * 3.2) * 0.03; sx = 1 - Math.sin(t * 3.2) * 0.02; dy = -Math.abs(Math.sin(t * 1.6)) * 4; }
  ctx.fillStyle = 'rgba(40,0,30,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 0, size * 0.42 * (dy < -10 ? 0.8 : 1), size * 0.09, 0, 0, TAU); ctx.fill();
  ctx.translate(dx, dy);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  if (img) {
    const k = size / Math.max(img.naturalWidth, img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    ctx.drawImage(img, -w / 2, -h, w, h);
  }
  if (mood === 'sad' || mood === 'angry') {
    const sw = Images.get(KIMG.sweat);
    if (sw) {
      const f = Math.floor(t / 0.08) % 25, s = size * 1.7;
      ctx.drawImage(sw, f * 160, 0, 160, 160, -s / 2 + size * 0.08, -size * 0.5 - s / 2 - size * 0.22, s, s);
    }
  }
  ctx.restore();
}

// ---------------- settings ----------------
const Settings = {
  mode: 'pic2word', teams: 1, bteams: 4, frames: 5, kana: false,
  load() {
    try {
      const s = JSON.parse(localStorage.getItem('kirbybowling') || '{}');
      if (s.muted) Sound.setMuted(true);
      if (MODES.some(m => m.key === s.mode)) this.mode = s.mode;
      if (s.teams === 1 || s.teams === 2) this.teams = s.teams;
      if (s.bteams >= 2 && s.bteams <= 6) this.bteams = s.bteams;
      if ([3, 5, 10].includes(s.frames)) this.frames = s.frames;
      this.kana = !!s.kana;
    } catch (e) {}
  },
  save() {
    try { localStorage.setItem('kirbybowling', JSON.stringify({ muted: Sound.muted, mode: this.mode, teams: this.teams, bteams: this.bteams, frames: this.frames, kana: this.kana })); } catch (e) {}
  }
};
function toggleFullscreen() {
  try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {}
}
function toggleMute() { Sound.setMuted(!Sound.muted); Music.sync(); Settings.save(); }
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
        .map(f => (document.fonts ? document.fonts.load(f) : null)).concat([Images.load(ALLEY.src), Images.load(KIMG.idle), Images.load(ballSrc(0))])),
      new Promise(r => setTimeout(r, 3000))
    ]).catch(() => {}).then(() => {
      preloadKirby();
      Object.values(POLLS).forEach(p => { const it = p.items[0]; if (it.image) Images.load(`img/${it.image}.png`); });
      // a link like bowling/#colors opens that category's setup directly
      const want = decodeURIComponent(location.hash.slice(1));
      if (POLLS[want]) Engine.go(SetupScene, { key: want }); else Engine.go(MenuScene);
    });
  },
  draw(ctx) {
    drawPolka(ctx, MENU_THEME, Engine.realTime);
    const t = Engine.realTime;
    drawKirbyBall(ctx, 640 + Math.sin(t * 3) * 60, 350, 42, 0, Math.cos(t * 3) * 1.5);
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
    Music.play('title');
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
    drawKirbyHost(ctx, -400, 52, 110, 'idle', t);
    for (let i = 0; i < 3; i++) drawPin(ctx, 372 + i * 26, 46 - (i === 1 ? 12 : 0), 62, { rot: Math.sin(t * 3 + i) * 0.08 });
    drawKirbyBall(ctx, 312 + Math.sin(t * 1.4) * 8, 22, 26, 0, Math.sin(t * 1.4) * 0.6);
    txt(ctx, 'KIRBY BOWLING', 0, 0, { size: 76, fill: { grad: ['#ffffff', '#ffe27a', '#ffb300'] }, stroke: MENU_THEME.primary, lw: 14, shadow: 'rgba(60,20,120,0.35)', shadowDist: 8 });
    ctx.restore();
    txt(ctx, 'Pick a category!  カテゴリーを えらんでね', 640, 196, { size: 26, font: FONT_ROUND, fill: MENU_THEME.primary, shadow: false });
    for (const tl of this.tiles) this.drawTile(ctx, tl, t);
    txt(ctx, 'In the game:  1–3 roll a ball  ·  ENTER next  ·  Q (or tap Kirby) hide question  ·  K katakana  ·  ESC back  ·  M mute  ·  F fullscreen', 640, 706, {
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
    Music.play('title');
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
    else this.poll.items.slice(0, 3).forEach((item, i) => drawKirbyBall(ctx, (i - 1) * 74, y + (i === 1 ? -8 : 0), 34, i, 0, { item }));
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
const HOME_Y = 470, CARD_TOP = 545;   // 3 big balls; a big card under each one
const NBALLS = 3, BALL_GAP = 240;

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
    this.mk = null; this.boom = null; this.slash = null;
    this.flash = { v: 0 };
    this.setupPins(false);
    Music.play('game');
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
    if (this.r > 0) { this.setupPins(true); BowlSfx.reset(); Sound.play('next'); }
    let choices;
    if (this.battle) {
      this.target = null;
      choices = shuffle(this.items).slice(0, Math.min(NBALLS, this.items.length));
    } else {
      this.target = this.queue[this.r];
      const others = shuffle(this.items.filter(it => it !== this.target)).slice(0, NBALLS - 1);
      choices = shuffle([this.target, ...others]);
    }
    const n = choices.length, gap = BALL_GAP;
    const cx = laneCX(HOME_Y);
    this.balls = choices.map((it, i) => {
      const x = cx + (i - (n - 1) / 2) * gap;
      const b = { i, it, correct: it === this.target, hx: x, x, y: HOME_Y, rot: rand(-0.25, 0.25), color: BALL_COLORS[i % 6], appear: 0, lift: new Spring(0, 300, 16), hover: false, state: 'idle', alpha: 1, cardA: 1, glow: 0, p: 0, sx: 1, sy: 1, back: 0, shake: 0, spin: 0, trail: 0 };
      Tween.to(b, { appear: 1 }, 0.45, { ease: Ease.outBack, delay: 0.35 + i * 0.07 });
      return b;
    });
    this.bubble.s = 0;
    Tween.kill(this.bubble);
    if (this.showQ) Tween.to(this.bubble, { s: 1 }, 0.5, { ease: Ease.outBack, delay: 0.15 });
    Sound.boing();
  },

  ballR(b) { return Math.max(1, 0.205 * halfW(b.y)); },
  ballAt(x, y) {
    if (this.phase !== 'choose') return null;
    return this.balls.find(b => {
      if (b.appear < 0.6) return false;
      if (Math.hypot(x - b.x, y - b.y) < this.ballR(b) + 8) return true;
      const { w, h } = this.cardSize();
      return Math.abs(x - b.hx) < w / 2 && y > CARD_TOP - 6 && y < CARD_TOP + h + 6;
    });
  },
  mascotHit(x, y) { return Math.abs(x - 118) < 85 && y > 470 && y < 660; },
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
    else if (this.phase === 'choose' && /^[1-3]$/.test(k)) { const b = this.balls[+k - 1]; if (b) this.roll(b); }
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
    ball.state = 'windup';
    Sound.play('poke');
    this.balls.forEach(b => { if (b !== ball) Tween.to(b, { alpha: 0.3 }, 0.3); });
    const n = this.battle ? this.rollPins(this.team()) : (ball.correct ? 10 : 0);
    if (this.battle) this.target = ball.it;
    ball.n = n;
    const x0 = ball.x, y0 = ball.y;
    const side = x0 < laneCX(y0) - 10 ? -1 : x0 > laneCX(y0) + 10 ? 1 : (Math.random() < 0.5 ? -1 : 1);
    ball.side = side;
    // where the ball would meet the pins (a miss still aims at them — until Meta Knight turns up)
    const u = n === 0 ? rand(0.05, 0.3) : n === 10 ? rand(0.03, 0.1) : n >= 8 ? rand(0.12, 0.22) : n >= 5 ? rand(0.24, 0.42) : n >= 3 ? rand(0.44, 0.6) : rand(0.64, 0.8);
    ball.ex = laneCX(DECK_Y) + side * u * halfW(DECK_Y);
    ball.path = [[x0, y0], [lerp(x0, ball.ex, 0.7), 400], [ball.ex, DECK_Y + 2]];

    // 1) anticipation: Kirby crouches, the ball hops, squashes down, shivers and charges up
    this.mood = 'ready';
    Tween.to(ball.lift, { v: 24 }, 0.16, { ease: Ease.outQuad });
    Timers.after(0.16, () => {
      Tween.to(ball.lift, { v: 0 }, 0.14, { ease: Ease.inQuad });
      Tween.to(ball, { sx: 1.24, sy: 0.72, back: 18, shake: 1 }, 0.5, { ease: Ease.inOutQuad, delay: 0.12 });
      Sound.tone(200, 0.62, { type: 'triangle', vol: 0.1, slide: 950, delay: 0.12 });
      Timers.after(0.12, () => FX.ring(ball.x, ball.y, '#ffffff', 95, 10, 0.5, 'fx', 4));
    });
    Timers.after(0.82, () => this.launch(ball));
  },

  // 2) launch: stretch, dust, a shout, and off down the lane trailing stars
  launch(ball) {
    ball.state = 'roll';
    ball.shake = 0; ball.back = 0;
    ball.sx = 0.78; ball.sy = 1.32;
    Tween.to(ball, { sx: 1, sy: 1 }, 0.55, { ease: Ease.outElastic });
    this.mood = 'watch';
    Sound.play('gaow', { vol: 0.8 });
    Sound.play('roll', { vol: 0.9 });
    Sound.whoosh(0.3);
    FX.dust(ball.x, ball.y + this.ballR(ball) * 0.8, 12, 'fx');
    Engine.addShake(0.15);
    if (ball.n === 0) {
      Tween.to(ball, { p: 0.55 }, 0.6, { ease: Ease.linear, onDone: () => this.metaKnight(ball) });
      return;
    }
    Tween.to(ball, { p: 0.78 }, 0.72, {
      ease: Ease.linear,
      onDone: () => {
        // 3) tension: everything slows right down just before the pins
        ball.slow = true;
        this.mood = 'ready';
        Sound.drumroll(0.62);
        this.pins.forEach(p => p.wob.kick(rand(-0.6, 0.6)));
        Tween.to(ball, { p: 1 }, 0.62, { ease: Ease.linear, onDone: () => this.hit(ball, ball.n, ball.ex) });
      }
    });
  },

  // A miss: Meta Knight swoops in and slashes the ball into the gutter
  metaKnight(ball) {
    const dash = Math.random() < 0.5;
    const hx = ball.x, hy = ball.y;
    this.mk = { src: dash ? KIMG.mkDash : KIMG.mk, w: dash ? 340 : 280, k: 0, a: [1520, hy - 170], b: [hx + 30, hy - 40], c: [-320, hy - 160] };
    Sound.play(pick(['ohahh', 'eeyee', 'graaah']));
    this.mood = 'ready';
    Tween.to(ball, { p: 0.6 }, 0.42, { ease: Ease.outQuad });
    Tween.to(this.mk, { k: 1 }, 0.82, { ease: Ease.linear, onDone: () => { this.mk = null; } });
    Timers.after(0.2, () => Sound.play('slash'));
    Timers.after(0.41, () => this.swat(ball));
  },
  swat(ball) {
    Engine.hitstop = 0.08;
    Engine.addShake(0.4);
    Sound.play('impact');
    this.slash = { x: ball.x, y: ball.y, k: 0 };
    Tween.to(this.slash, { k: 1 }, 0.32, { onDone: () => { this.slash = null; } });
    FX.sparkleBurst(ball.x, ball.y, 16, ['#ffffff', '#ffe27a', '#7fd3ff'], 'fx', 1.1);
    const gy = 300, gx = laneCX(gy) - (halfW(gy) + gutW(gy) * 0.5);   // Meta Knight flies left, so the ball goes left
    ball.path = [[ball.x, ball.y], [ball.x - 140, ball.y - 6], [gx, gy]];
    ball.p = 0;
    ball.spin = -1;
    Tween.to(ball, { p: 1 }, 0.5, { ease: Ease.outQuad, onDone: () => this.gutter(ball, -1) });
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
    p.teeter = 0; p.trot = 0;
    const dir = Math.sign(p.x - ex) || (Math.random() < 0.5 ? -1 : 1);
    p.vx = dir * rand(60, 260) * power + rand(-40, 40);
    p.vy = -rand(150, 420) * power;
    p.g = 380;
    p.vr = dir * rand(6, 13);
  },

  hit(ball, n, ex) {
    const strike = n >= 10;
    ball.slow = false;
    this.carryOn(ball, laneCX(PIT_Y) + (ex - laneCX(DECK_Y)) * 0.7);
    // which pins go: the ones nearest where the ball came in, front rows first
    const order = this.pins.map(p => ({ p, d: Math.abs(p.x - ex) / halfW(p.y) + p.row * 0.1 + rand(0, 0.12) })).sort((a, b) => a.d - b.d);
    const fall = order.slice(0, n).map(o => o.p);
    // sometimes one pin wobbles on the edge for a moment before deciding
    let teeter = null, teeterFalls = false;
    if (n > 0 && n < 10 && Math.random() < 0.65) {
      teeterFalls = Math.random() < 0.5;
      teeter = teeterFalls ? fall[fall.length - 1] : order[n].p;
    }
    fall.forEach((p, k) => { if (p !== teeter) Timers.after(k * 0.025 + p.row * 0.03, () => this.knockPin(p, ex, strike ? 1.7 : 1)); });
    this.pins.forEach(p => { if (!fall.includes(p) && p !== teeter) Timers.after(0.12, () => p.wob.kick(rand(-2, 2))); });
    Engine.addShake(0.12 + n * 0.04);
    if (n >= 5) {
      this.boom = { x: ex, y: 232, k: 0, w: strike ? 560 : 300 };
      Tween.to(this.boom, { k: 1 }, strike ? 1.0 : 0.6, { ease: Ease.linear, onDone: () => { this.boom = null; } });
    }
    if (strike) {
      Engine.hitstop = 0.09;
      Engine.doFlash(0.35, '#fff0f8');
      Sound.play('strike');
      Music.duck(0.25, 4.5);
      this.flash.v = 1;
      Tween.to(this.flash, { v: 0 }, 2.4, { ease: Ease.inQuad });
    } else {
      BowlSfx.crash(n);
      Sound.play('impact', { vol: 0.5 });
    }
    FX.sparkleBurst(ex, 250, 6 + n * 1.6, ['#ffffff', '#ffe27a', '#ff8fd8'], 'ui', 0.6 + n * 0.07);
    this.results[this.team()][this.frame()] = this.battle ? n : true;

    let wait = strike ? 0.2 : 0.3;
    if (teeter) {
      wait = 1.25;
      teeter.teeterFalls = teeterFalls;
      teeter.teeter = 0.001;
      Tween.to(teeter, { teeter: 1 }, 1.05, {
        ease: Ease.linear,
        onDone: () => {
          teeter.teeter = 0; teeter.trot = 0;
          if (teeterFalls) { this.knockPin(teeter, ex, 0.7); Sound.thud(); }
          else { teeter.wob.kick(1.2); Sound.boing(); }
        }
      });
      Timers.after(0.15, () => { this.mood = 'ready'; });
      for (let i = 0; i < 7; i++) Sound.tone(i % 2 ? 760 : 980, 0.05, { type: 'square', vol: 0.045, delay: 0.2 + i * 0.13 });
    }
    Timers.after(wait, () => {
      this.mood = strike || n >= 7 ? 'happy' : n <= 3 ? 'sad' : 'idle';
      if (strike) {
        this.title = new BigTitle('STRIKE!', { x: 640, y: 380, size: 132 });
        Sound.play('pk');
        FX.confettiCannon(380, 720, 1, 50);
        FX.confettiCannon(900, 720, -1, 50);
      } else {
        this.title = new BigTitle(n === 1 ? '1 PIN!' : `${n} PINS!`, { x: 640, y: 380, size: 116, colors: ['#ffffff', '#ffd6ec', '#ff6fb5'], outline: '#7a1048' });
        if (n >= 7) { Sound.chime(); Sound.play('chitzu', { vol: 0.8 }); }
        else if (n <= 3) Sound.play(pick(['uhawa', 'uheeha']));
        else Sound.boing();
      }
    });
    Timers.after(wait + 1.0, () => this.showResult());
  },

  gutter(ball, side) {
    ball.spin = 0;
    this.carryOn(ball, laneCX(PIT_Y) + side * (halfW(PIT_Y) + gutW(PIT_Y) * 0.5), 0.45);
    BowlSfx.gutter();
    this.pins.forEach(p => p.wob.kick(rand(-1.5, 1.5)));
    this.results[this.team()][this.frame()] = this.battle ? 0 : false;
    this.mood = pick(['sad', 'angry']);
    Sound.play(pick(['uhawa', 'uheeha', 'yaaa']), { delay: 0.1 });
    Timers.after(0.35, () => {
      this.title = new BigTitle(this.battle ? 'GUTTER!' : 'MISS!', { x: 640, y: 380, size: 116, colors: ['#ffffff', '#c9d6ff', '#7d8fd6'], outline: '#1d2b5a' });
      BowlSfx.miss();
    });
    if (!this.battle) {
      const right = this.balls.find(b => b.correct);
      Timers.after(0.9, () => { Tween.to(right, { alpha: 1, glow: 1 }, 0.3); Sound.chime(); });
    }
    Timers.after(1.4, () => this.showResult());
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
    Music.play('end');
    Sound.play('crowd', { vol: 0.45 });
    Sound.play('haragong', { delay: 0.6 });
    Sound.play('chitzu', { delay: 1.5 });
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
        b.rot += Math.hypot(nx - b.x, ny - b.y) / Math.max(4, this.ballR(b)) * 0.55 * (b.side || 1) + b.spin * dt * 22;
        b.x = nx; b.y = ny;
        b.cardA = Math.min(b.cardA, Math.max(0, 1 - u * 3));
        b.trail -= dt;
        if (b.trail <= 0 && b.y > DECK_Y + 10) {
          b.trail = b.slow ? 0.03 : 0.05;
          FX.sparkleBurst(b.x + rand(-6, 6), b.y + rand(-6, 6), 1, ['#fff6b0', '#ffffff', b.color], 'fx', 0.35);
        }
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
      } else if (pin.teeter > 0) {
        const k = pin.teeter, amp = pin.teeterFalls ? 0.12 + 0.4 * k : 0.42 * (1 - k * 0.8);
        pin.trot = Math.sin(k * TAU * 4.5) * amp;
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
      drawPin(ctx, pin.x, pin.y + pin.off, pin.h, { rot: pin.rot + pin.wob.v * 0.12 + (pin.trot || 0), alpha: pin.alpha, noShadow: pin.flying });
    }
    ctx.restore();
    this.drawBoom(ctx);
    this.drawLights(ctx);
    for (const b of this.balls) this.drawCardFor(ctx, b);
    for (const b of this.balls) if (!deep(b)) this.drawBallFor(ctx, b);
    Particles.draw(ctx, 'world');
    this.drawMetaKnight(ctx);
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

  // Cards are big so the back of the classroom can read them
  cardSize() {
    const kana = Settings.kana;
    if (this.battle) return { w: 212, h: kana ? 170 : 160 };
    if (this.mode === 'word2pic') return { w: 212, h: 160 };
    return { w: 212, h: kana ? 108 : 92 };
  },

  drawCardFor(ctx, b) {
    if (b.appear <= 0.01 || b.cardA <= 0.01) return;
    const { w, h } = this.cardSize(), kana = Settings.kana;
    ctx.save();
    ctx.translate(b.hx, CARD_TOP + h / 2);
    const s = b.appear * (1 + b.lift.v * 0.003);
    ctx.scale(s, s);
    ctx.globalAlpha *= b.alpha * b.cardA;
    if (b.glow > 0.01) Glow.draw(ctx, '#7dff9a', 0, 0, 170, b.glow * (0.6 + Math.sin(this.t * 8) * 0.25));
    drawCard(ctx, -w / 2, -h / 2, w, h, { border: b.glow > 0.5 ? '#21c25a' : b.color, lw: b.glow > 0.5 ? 8 : 6, base: shade(b.color, -0.2), r: 20 });
    const ink = shade(b.color, -0.45);
    if (this.battle) {
      drawItem(ctx, b.it, 0, -h / 2 + (kana ? 60 : 64), kana ? 100 : 112);
      txt(ctx, b.it.en, 0, h / 2 - (kana ? 44 : 26), { size: 30, font: FONT_ROUND, fill: ink, shadow: false, maxW: w - 20 });
      if (kana) txt(ctx, b.it.katakana, 0, h / 2 - 16, { size: 18, font: FONT_JP, weight: '700', fill: '#6a5a90', shadow: false, maxW: w - 16 });
    } else if (this.mode === 'word2pic') {
      drawItem(ctx, b.it, 0, 0, h - 22);
    } else {
      txt(ctx, b.it.en, 0, kana ? -14 : 2, { size: 44, font: FONT_ROUND, fill: ink, shadow: false, maxW: w - 24 });
      if (kana) txt(ctx, b.it.katakana, 0, 30, { size: 20, font: FONT_JP, weight: '700', fill: '#6a5a90', shadow: false, maxW: w - 20 });
    }
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.arc(-w / 2 + 8, -h / 2 + 8, 19, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    txt(ctx, String(b.i + 1), -w / 2 + 8, -h / 2 + 9, { size: 22, font: FONT_ROUND, fill: '#fff', shadow: false });
    ctx.restore();
  },

  drawBallFor(ctx, b) {
    if (b.appear <= 0.01 || b.state === 'gone') return;
    const r = this.ballR(b) * b.appear;
    const deep = b.state !== 'idle' && b.state !== 'windup' && b.y < DECK_Y + 30;
    if (deep) { ctx.save(); ctx.beginPath(); ctx.rect(500, PIT_Y, 300, 600); ctx.clip(); }
    let x = b.x, y = b.y - b.lift.v + b.back, sx = b.sx, sy = b.sy, rot = b.rot;
    if (b.shake > 0) x += Math.sin(this.t * 70) * 3.5 * b.shake;
    if (b.state === 'idle') {      // the waiting balls breathe and wobble a little
      const w = Math.sin(this.t * 3 + b.i * 1.3);
      sy *= 1 + w * 0.025; sx *= 1 - w * 0.02;
      rot += Math.sin(this.t * 1.7 + b.i) * 0.06 + (b.hover ? Math.sin(this.t * 12) * 0.08 : 0);
    }
    if (b.hover && b.state === 'idle') Glow.draw(ctx, b.color, x, y, r * 2, 0.5);
    if (b.glow > 0.01) Glow.draw(ctx, '#7dff9a', x, y, r * 2.2, b.glow * 0.6);
    drawKirbyBall(ctx, x, y, r, b.i, rot, { alpha: b.alpha, sx, sy, item: null });
    if (deep) ctx.restore();
  },

  // spotlights over the lane (from the PowerPoint); they flash on a strike
  drawLights(ctx) {
    const img = Images.get(KIMG.light);
    if (!img) return;
    const f = this.flash.v;
    const a = 0.16 + Math.sin(this.t * 2) * 0.04 + f * (0.5 + 0.3 * Math.sin(this.t * 34));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(a, 0, 1);
    [[330, -1], [960, 1]].forEach(([x, s]) => {
      ctx.save();
      ctx.translate(x, -70);
      ctx.rotate(s * (0.18 + Math.sin(this.t * (0.8 + f * 6)) * (0.06 + f * 0.15)));
      ctx.drawImage(img, -270, 0, 540, 490);
      ctx.restore();
    });
    ctx.restore();
  },

  drawBoom(ctx) {
    const e = this.boom, img = Images.get(KIMG.boom);
    if (!e || !img) return;
    const k = e.k, s = 0.35 + Ease.outCubic(Math.min(1, k * 1.6)) * 0.85;
    const w = e.w * s, h = w * img.naturalHeight / img.naturalWidth;
    ctx.save();
    ctx.globalAlpha = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
    ctx.drawImage(img, e.x - w / 2, e.y - h * 0.62, w, h);
    ctx.restore();
  },

  drawMetaKnight(ctx) {
    const m = this.mk;
    if (m) {
      const img = Images.get(m.src);
      const at = k => { const u = clamp(k, 0, 1); return [0, 1].map(j => (1 - u) * (1 - u) * m.a[j] + 2 * (1 - u) * u * m.b[j] + u * u * m.c[j]); };
      if (img) {
        const h = m.w * img.naturalHeight / img.naturalWidth;
        [[m.k - 0.08, 0.18], [m.k - 0.04, 0.35], [m.k, 1]].forEach(([k, al]) => {
          const [x, y] = at(k);
          ctx.save();
          ctx.globalAlpha = al;
          ctx.translate(x, y);
          ctx.rotate(-0.12 + k * 0.2);
          ctx.drawImage(img, -m.w / 2, -h / 2, m.w, h);
          ctx.restore();
        });
      }
    }
    const sl = this.slash;
    if (sl) {
      ctx.save();
      ctx.translate(sl.x, sl.y);
      ctx.rotate(-0.5);
      ctx.globalAlpha = 1 - sl.k;
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      ctx.shadowColor = '#7fd3ff'; ctx.shadowBlur = 18;
      ctx.lineWidth = 12 * (1 - sl.k) + 2;
      ctx.beginPath(); ctx.arc(0, 0, 50 + sl.k * 50, Math.PI * 0.9, Math.PI * 1.9); ctx.stroke();
      ctx.restore();
    }
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
    drawKirbyHost(ctx, 118, 652, 175, this.mood, this.t);
    if (!this.showQ && this.phase === 'choose') drawHand(ctx, 200, 500 + Math.sin(this.t * 5) * 6, 0.7);
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
    // celebrating Kirbys in front of the card
    const dk = Images.get(KIMG.double);
    if (dk) {
      const w = 280, h = w * dk.naturalHeight / dk.naturalWidth, bob = Math.abs(Math.sin(this.t * 4)) * 16;
      ctx.drawImage(dk, 480 - w / 2, 250 - h - bob, w, h);
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
  Engine.transIcon = ballSrc(0);
  Images.load(ballSrc(0));
  Engine.init(document.getElementById('game'));
  Engine.setScene(LoadingScene);
});
