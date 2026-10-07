/*
 * LEVEL_PLAY.JS - Drawing and playing levels in the full game's format
 *
 * Player-made levels are one 1920 x 1080 screen of 60 px tiles (32 x 18), the
 * full game's size, and run on the full game's physics (levelkit.js) at its
 * fixed 60 steps a second. They are drawn in this prototype's own looks: the
 * full game's gray, neon and paper styles become CLASSIC, NEON and SKETCH.
 *
 * While one is played the level fills the screen's width, under a strip that
 * holds its name and the deaths. game.js hands over to updateCustomPlay() and
 * drawCustomPlay() whenever customLevelSession is set.
 */

// The full game's styles, drawn in this prototype's looks (drawStyledPlatform & co. in game.js)
const LK_LOOK = { gray: 'default', neon: 'neon', paper: 'sketch' };
const LK_STYLE_NAMES = { gray: 'CLASSIC', neon: 'NEON', paper: 'SKETCH' };
// Where the level sits on the 1200 x 720 screen while it is played: the whole width, under the strip
const PLAY_VIEW = { s: GAME_WIDTH / LK.W, x: 0, y: GAME_HEIGHT - LK.H * GAME_WIDTH / LK.W };
// The keys a hint's {move}, {jump}... stand for (the full game draws them as keycaps)
const LK_KEYS = { move: '← →', jump: 'SPACE', door: '↓', ok: 'ENTER', back: 'ESC', updown: '↑ ↓', leftright: '← →' };
const LK_SPIKE_ROT = { '^': 0, '>': Math.PI / 2, 'v': Math.PI, '<': -Math.PI / 2 };

function lkRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
}
const lkSeg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const lkPromptText = s => String(s).replace(/\{(\w+)\}/g, (m, k) => LK_KEYS[k] || k).replace(/\{([^{}]+)\}/g, '$1');

/* ===== drawing a level (world space: 1920 x 1080) ===== */

function lkDrawBackground(st) {
  const W = LK.W, H = LK.H;
  if (st === 'neon') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0a1a');
    g.addColorStop(1, '#1a0a2a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // the same grid as the neon chapter, 40 screen pixels apart
    ctx.strokeStyle = 'rgba(100, 100, 255, 0.1)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let x = 0; x < W; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y < H; y += 64) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  } else if (st === 'paper') {
    ctx.fillStyle = '#f5f5dc';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    for (let i = 0; i < 520; i++) ctx.fillRect((i * 37 * 1.6) % W, (i * 53 * 1.6) % H, 3, 3);
  } else {
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, W, H);
  }
}

// Gravity zones: cyan pulls up, magenta pulls down; a flip zone shows where it would send you right now, and fades
// while it cools down. Chevrons run the way gravity goes.
function lkDrawZones(L, st, t) {
  const paper = st === 'paper';
  for (const z of L.zones) {
    const g = z.g || (L.pgs > 0 ? -1 : 1);
    const col = g < 0 ? (paper ? '#1a8fb0' : '#44ddff') : (paper ? '#b0208f' : '#ff44dd');
    const pulse = 0.5 + 0.5 * Math.sin(t * 5 + z.x * 0.01);
    ctx.save();
    if (z.g === 0 && L.time < z.cdUntil) ctx.globalAlpha = 0.45;
    ctx.fillStyle = lkRgba(col, (paper ? 0.1 : 0.14) + 0.1 * pulse);
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(z.x, z.y, z.w, z.h);
    ctx.clip();
    const sp = 70, off = ((t * 160) % sp) * g;
    ctx.strokeStyle = lkRgba(col, 0.6);
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let cx = z.x + 30; cx < z.x + z.w; cx += 60) {
      for (let y = Math.floor(z.y / sp) * sp - sp; y < z.y + z.h + sp; y += sp) {
        const yy = y + off;
        ctx.moveTo(cx - 20, yy - 10 * g);
        ctx.lineTo(cx, yy + 10 * g);
        ctx.lineTo(cx + 20, yy - 10 * g);
      }
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = lkRgba(col, 0.85);
    ctx.lineWidth = 3;
    if (!paper) { ctx.shadowColor = col; ctx.shadowBlur = 14; }
    ctx.beginPath();
    if (z.g === 0) {                                   // a flip zone: a dashed frame all round
      ctx.setLineDash([10, 6]);
      ctx.lineDashOffset = -t * 30;
      ctx.rect(z.x + 1.5, z.y + 1.5, z.w - 3, z.h - 3);
    } else {                                           // a column: its sides, where no zone of its kind goes on
      const c = Math.round(z.x / LK.TILE), r = Math.round(z.y / LK.TILE), ch = g < 0 ? 'u' : 'd';
      const same = cc => L.tiles[r] && L.tiles[r][cc] === ch;
      if (!same(c - 1)) { ctx.moveTo(z.x + 1.5, z.y); ctx.lineTo(z.x + 1.5, z.y + z.h); }
      if (!same(c + 1)) { ctx.moveTo(z.x + z.w - 1.5, z.y); ctx.lineTo(z.x + z.w - 1.5, z.y + z.h); }
    }
    ctx.stroke();
    ctx.restore();
  }
}

// A visible trigger pulses until it fires, then fades to a trace; a hidden one only flashes as it fires. In the
// editor (o.trapColor) every trigger that is on shows, in its trap's color.
function lkDrawTriggers(L, st, t, o) {
  const paper = st === 'paper';
  for (const tr of L.triggers) {
    const since = tr.fired ? L.time - tr.firedT : -1;
    let a;
    if (o.trapColor) a = tr.hidden ? 0.55 : 0.9;
    else if (tr.hidden) a = tr.fired ? 1 - since * 0.9 : 0;
    else a = tr.fired ? Math.max(0.12, 1 - since * 1.4) : 0.3 + 0.14 * Math.sin(t * 6);
    if (a <= 0) continue;
    const c = o.trapColor ? o.trapColor(tr.trap)
      : paper ? (tr.fired ? '#b0102a' : '#161616') : tr.fired ? '#ff3355' : st === 'neon' ? '#44ddff' : '#e0e0e8';
    ctx.save();
    ctx.globalAlpha = a;
    ctx.setLineDash(tr.hidden && o.trapColor ? [5, 9] : [16, 12]);
    ctx.lineDashOffset = -t * 50;
    ctx.lineWidth = 3;
    ctx.strokeStyle = c;
    if (!paper) { ctx.shadowColor = c; ctx.shadowBlur = 12; }
    if (o.trapColor) { ctx.fillStyle = lkRgba(c, 0.08); ctx.fillRect(tr.x, tr.y, tr.w, tr.h); }
    ctx.beginPath();
    if (tr.kind === 'line') { ctx.moveTo(tr.x, tr.y); ctx.lineTo(tr.x, tr.y + tr.h); } else ctx.rect(tr.x, tr.y, tr.w, tr.h);
    ctx.stroke();
    ctx.restore();
  }
}

// A trap spike: the full game's triangle, out of its tile toward its direction; a slow one pushes out on a shaft.
function lkTriPath(s, d, k) {
  const tx = s.ox + s.dx * d, ty = s.oy + s.dy * d, len = s.len * (k || 1);
  const bx = tx - s.dx * len, by = ty - s.dy * len, px = -s.dy * s.wid / 2, py = s.dx * s.wid / 2;
  ctx.moveTo(tx, ty);
  ctx.lineTo(bx + px, by + py);
  ctx.lineTo(bx - px, by - py);
  ctx.closePath();
}
function lkSpikePaint(st, moving) {
  if (st === 'neon') return { fill: '#ff0055', edge: '#ff44aa', glow: '#ff0055' };
  if (st === 'paper') return { fill: moving ? '#ff0000' : '#dd0000', edge: '#000000' };
  return { fill: moving ? '#ff0000' : '#dd0000', edge: '#aa0000' };
}
function lkDrawSpikes(L, st, t) {
  for (const s of L.spikes) {
    const d = LK.spikeD(s, t);
    if (d <= 0) continue;
    const moving = s.launch != null && t >= s.launch + s.delay && d < s.travel, paint = lkSpikePaint(st, moving);
    ctx.save();
    if (s.shaft && d > s.len) {
      const bx = s.ox + s.dx * (d - s.len), by = s.oy + s.dy * (d - s.len), px = -s.dy * 9, py = s.dx * 9;
      ctx.beginPath();
      ctx.moveTo(s.ox + px, s.oy + py); ctx.lineTo(bx + px, by + py); ctx.lineTo(bx - px, by - py); ctx.lineTo(s.ox - px, s.oy - py);
      ctx.closePath();
      ctx.fillStyle = st === 'paper' ? 'rgba(22,22,22,.25)' : st === 'neon' ? '#401238' : '#4a4a55';
      ctx.fill();
    }
    if (moving && s.speed > 1200) {                     // a fast one leaves a streak
      ctx.strokeStyle = st === 'paper' ? 'rgba(22,22,22,.45)' : 'rgba(255,90,120,.5)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(s.ox + s.dx * Math.max(0, d - 420), s.oy + s.dy * Math.max(0, d - 420));
      ctx.lineTo(s.ox + s.dx * (d - s.len * 0.5), s.oy + s.dy * (d - s.len * 0.5));
      ctx.stroke();
    }
    if (paint.glow) { ctx.shadowColor = paint.glow; ctx.shadowBlur = moving ? 26 : 14; }
    ctx.beginPath();
    lkTriPath(s, d);
    ctx.fillStyle = paint.fill;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = paint.edge;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}
// Spikes in plain sight, turned the way they point; sliding spikes, wherever they are now.
function lkDrawHazards(L, look) {
  for (const h of L.hazards) {
    ctx.save();
    ctx.translate(h.x + 30, h.y + 30);
    ctx.rotate(LK_SPIKE_ROT[h.ch]);
    drawStyledSpike({ x: -30, y: -10, width: 60, height: 40, moving: false }, look);
    ctx.restore();
  }
  ctx.shadowBlur = 0;
}
function lkDrawSlides(L, st, look, t) {
  for (const s of L.slides) {
    const k = LK.slideK(s, t), x = s.x + s.mx * k, y = s.y + s.my * k, moving = k > 0 && k < 1;
    if (moving) {
      const len = Math.hypot(s.mx, s.my) || 1, ux = s.mx / len, uy = s.my / len;
      ctx.strokeStyle = st === 'paper' ? 'rgba(22,22,22,.5)' : 'rgba(255,90,120,.55)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (const o of [-14, 0, 14]) {
        ctx.moveTo(x + 30 - uy * o, y + 44 + ux * o);
        ctx.lineTo(x + 30 - uy * o - ux * 140, y + 44 + ux * o - uy * 140);
      }
      ctx.stroke();
    }
    drawStyledSpike({ x, y: y + 20, width: 60, height: 40, moving }, look);
  }
  ctx.shadowBlur = 0;
}

// Ground, fakes (they look exactly like ground until the square falls through one), crumbling blocks, and the lies
// once they are found: an invisible block shows faintly once touched, a fake found out turns into a dashed ghost.
// In the editor (edit) every lie shows.
function lkDrawBlocks(L, st, look, t, edit) {
  const g = L.tiles, T = LK.TILE;
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c < g[r].length; c++) {
      const ch = g[r][c];
      if (ch === '#' || (ch === 'F' && (edit || !L.cell[r][c].exposed))) drawStyledPlatform(c * T, r * T, T, T, look, ch === 'F');
    }
  }
  ctx.shadowBlur = 0;
  for (const b of L.blocks) {
    if (b.type !== 'crumble') continue;
    const back = !b.collapsed ? 1 : L.crumbleRespawn ? lkSeg(L.time - b.collapseT, L.crumbleRespawn - 0.5, L.crumbleRespawn) : 0;
    if (back <= 0) continue;
    const state = b.collapsed ? 'respawning' : b.touchT != null ? 'crumbling' : 'solid';
    drawStyledCrumblingPlatform({ x: b.x, y: b.y, width: b.w, height: b.h, state, timer: b.touchT != null ? L.time - b.touchT : 0, alpha: back }, look);
  }
  const paper = st === 'paper', neon = st === 'neon';
  for (const b of L.blocks) {
    if (b.type === 'invisible') {
      const a = edit ? Math.max(0.65, b.rev) : b.rev * (b.flashT != null && L.time - b.flashT < 0.6 ? 1 : 0.45);
      if (a <= 0.01) continue;
      const glass = paper ? '#161616' : '#44ddff';
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = lkRgba(glass, 0.12);
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = lkRgba(glass, 0.25);
      for (let y = b.y + 3; y < b.y + b.h; y += 6) ctx.fillRect(b.x, y, b.w, 1.5);
      ctx.setLineDash([10, 7]);
      ctx.strokeStyle = glass;
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
      ctx.restore();
    } else if (b.type === 'fake') {
      const a = b.exposed && !edit ? 0.3 + 0.7 * b.rev : edit ? 0.9 : 0;
      if (a <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = paper ? 'rgba(176,16,42,.06)' : neon ? 'rgba(255,68,221,.08)' : 'rgba(255,51,85,.07)';
      if (!edit) ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.setLineDash([12, 8]);
      ctx.lineDashOffset = -t * 60;
      ctx.lineWidth = 3;
      ctx.strokeStyle = paper ? '#b0102a' : neon ? '#ff44dd' : '#ff3355';
      ctx.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
      ctx.restore();
    }
  }
}

// The exit, and the decoys that look exactly like it: once one has killed, it stays marked (always, in the editor).
function lkDrawDoor(d, look) {
  ctx.save();
  ctx.translate(d.x + d.w / 2, d.y + d.h / 2);
  if (d.inv) ctx.rotate(Math.PI);
  drawStyledDoor({ x: -d.w / 2, y: -d.h / 2, width: d.w, height: d.h }, look);
  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.setLineDash([]);
}
function lkDrawDecoys(L, st, look, t, edit) {
  for (const d of L.decoys) {
    lkDrawDoor(d, look);
    if (!(d.sprung || d.exposed || edit)) continue;
    ctx.save();
    ctx.globalAlpha = edit ? 0.8 : 1;
    ctx.strokeStyle = st === 'paper' ? '#b0102a' : '#ff3355';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -t * 30;
    ctx.strokeRect(d.x - 3, d.y - 3, d.w + 6, d.h + 6);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(d.x + 8, d.y + 20); ctx.lineTo(d.x + d.w - 8, d.y + d.h - 20);
    ctx.moveTo(d.x + d.w - 8, d.y + 20); ctx.lineTo(d.x + 8, d.y + d.h - 20);
    ctx.stroke();
    ctx.restore();
  }
}

// Hints on the level. Each shows only within its min / max deaths; all: show every one (the editor), fainter if it waits.
function lkTextFont(st, px) {
  return 'bold ' + Math.round(px) + 'px ' + (st === 'paper' ? '"Comic Sans MS", "Segoe Print", "Bradley Hand", cursive' : 'Arial, sans-serif');
}
function lkDrawText(def, st, deaths, all) {
  const col = st === 'paper' ? '#161616' : st === 'neon' ? '#bfeaff' : '#e8e8ee';
  for (const x of def.text || []) {
    const waits = x.min != null || x.max != null;
    if (!all && ((x.min != null && deaths < x.min) || (x.max != null && deaths > x.max))) continue;
    ctx.save();
    ctx.globalAlpha = all && waits ? 0.4 : (x.op == null ? 0.85 : x.op);
    ctx.font = lkTextFont(st, x.size || 60);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (st === 'neon') { ctx.shadowColor = 'rgba(68,221,255,.4)'; ctx.shadowBlur = 18; }
    ctx.fillStyle = col;
    ctx.fillText(lkPromptText(x.s), x.x, x.y);
    ctx.restore();
  }
}

// Everything but the square. o: { edit (the editor: every lie and trigger shows), trapColor (the editor's trap colors),
// deaths (which hints show), noText }
function drawLevelScene(L, def, st, t, o) {
  o = o || {};
  const look = LK_LOOK[st] || 'default';
  lkDrawBackground(st);
  if (!o.noText) lkDrawText(def, st, o.deaths || 0, !!o.edit);
  lkDrawZones(L, st, t);
  lkDrawTriggers(L, st, t, o);
  lkDrawSpikes(L, st, t);
  lkDrawHazards(L, look);
  lkDrawSlides(L, st, look, t);
  lkDrawBlocks(L, st, look, t, !!o.edit);
  if (L.door) lkDrawDoor(L.door, look);
  lkDrawDecoys(L, st, look, t, !!o.edit);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
}

/* ===== playing a level ===== */
// The level being played: its object (def) and style, the built Level (L), the square (p) and its simulation; t is
// real time in whole steps (acc: the part of a step not simulated yet); a near miss (slowT) slows the simulation down
// for a moment, as in the full game.
let LKP = null;

function startLevelPlay(def) {
  const st = LK.LEVEL_STYLES.includes(def.style) ? def.style : 'neon';
  LKP = { def, st, L: LK.buildLevel(def), t: 0, acc: 0, slowT: -9, ts: 1, respawnT: null, doorT: null,
    deadAt: null, sndT: -1, parts: [] };
  lkSpawn(true);
}

// The full game holds input back for a few frames after the square appears.
function lkSpawn(first) {
  const P = LKP, L = P.L, s = L.spawn;
  L.reset();
  P.p = new LK.Player(s.x, s.y, { spawnT: P.t + LK.spawnDelay(P.st, first) });
  P.sim = new LK.Sim(L, P.p, (time, p) => P.t < p.spawnT + LK.STEP / 2 ? {} : { left: keys.left, right: keys.right, jump: keys.space }, P.st, lkEvent);
  P.sim.t = P.t;
  P.prev = { x: s.x, y: s.y };
  trailHistory = [];
}

// What the simulation's events do here: sounds, deaths, the door.
function lkEvent(ev, d) {
  const P = LKP, p = P.p;
  switch (ev) {
    case 'jump': playSound('jump'); break;
    case 'spikeFire':
    case 'slide':
      if (P.sndT !== P.t) { P.sndT = P.t; playSound('spike'); }   // one sound for a trap's spikes firing together
      break;
    case 'near': P.slowT = P.t; break;
    case 'flip':
      for (let i = 0; i < 24; i++) {
        P.parts.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, vx: (Math.random() - 0.5) * 320, vy: (Math.random() - 0.5) * 320,
          life: 1, color: p.gs < 0 ? '#44ddff' : '#ff44dd' });
      }
      break;
    case 'hit':
      if (!p.alive) break;
      p.alive = false;
      P.respawnT = P.t + 0.38;
      P.deadAt = { x: p.x, y: p.y, t: P.t };
      deaths++;
      levelDeaths++;
      playSound('death');
      updateStats();
      break;
    case 'door':
      p.alive = false;                                   // safe once through the door
      P.doorT = P.t;
      break;
  }
}

function lkTick() {
  const P = LKP, STEP = LK.STEP;
  P.t += STEP;
  const u = P.t - P.slowT;                               // near-miss slow motion
  P.ts = u < 0.06 ? 1 - 0.75 * u / 0.06 : u < 0.42 ? 0.25 : u < 0.6 ? 0.25 + 0.75 * (u - 0.42) / 0.18 : 1;
  if (P.doorT == null) levelTime += STEP;
  P.prev = { x: P.p.x, y: P.p.y };
  const dt = STEP * P.ts;
  P.sim.step(dt);
  if (P.p.alive) {
    trailHistory.push({ x: P.p.x, y: P.p.y, alpha: 1 });
    if (trailHistory.length > 15) trailHistory.shift();
  }
  trailHistory.forEach(pos => { pos.alpha = Math.max(0, pos.alpha - dt * 3); });
  P.parts = P.parts.filter(q => { q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt * 2; return q.life > 0; });
  if (P.respawnT != null && P.t >= P.respawnT) { P.respawnT = null; lkSpawn(false); }
  if (P.doorT != null && P.t > P.doorT + 0.5) completeLevel();
}

// Called by game.js while a player-made level is played.
function updateCustomPlay(deltaTime) {
  const P = LKP;
  if (!P) return;
  P.acc = Math.min(P.acc + deltaTime, LK.STEP * 6);
  while (P.acc >= LK.STEP - 1e-9 && gameState === 'playing') {
    P.acc -= LK.STEP;
    lkTick();
  }
}

// R: the level from the start, deaths and time back to 0 (as for the chapters' levels).
function restartLevelPlay() {
  if (!LKP) return;
  levelDeaths = 0;
  levelTime = 0;
  startLevelPlay(LKP.def);
  updateStats();
}

// The level, the square between its last two steps (so it moves smoothly on any screen), and the strip on top.
function drawCustomPlay() {
  const P = LKP;
  ctx.fillStyle = '#0d0c12';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  if (!P) return;
  const a = clamp01(P.acc / LK.STEP), L = P.L, p = P.p;
  const t = Math.max(0, L.time - (1 - a) * LK.STEP * P.ts);
  const v = PLAY_VIEW;

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.scale(v.s, v.s);
  ctx.beginPath();
  ctx.rect(0, 0, LK.W, LK.H);
  ctx.clip();
  drawLevelScene(L, P.def, P.st, t, { deaths: levelDeaths });

  if (p.alive && P.t >= p.spawnT - 0.2) {
    const keep = player;                                 // the trail is drawn by game.js for a square of player's size
    player = { width: p.w, height: p.h };
    drawPlayerTrail();
    player = keep;
    drawPlayer(P.prev.x + (p.x - P.prev.x) * a, P.prev.y + (p.y - P.prev.y) * a, p.w, p.h);
  }
  for (const q of P.parts) {
    ctx.globalAlpha = Math.max(0, q.life);
    ctx.fillStyle = q.color;
    ctx.fillRect(q.x - 5, q.y - 5, 10, 10);
  }
  ctx.globalAlpha = 1;

  // a death: a red flash and the square's last face
  if (P.deadAt && P.t - P.deadAt.t < 0.38) {
    const k = 1 - (P.t - P.deadAt.t) / 0.38;
    ctx.fillStyle = 'rgba(255, 0, 0, ' + (k * 0.4).toFixed(3) + ')';
    ctx.fillRect(0, 0, LK.W, LK.H);
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 58px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('X_X', P.deadAt.x - 14, P.deadAt.y + 46);
  }
  ctx.restore();

  // the strip: the level's name, the deaths, and what the keys do
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#c8c4d8';
  ctx.fillText(P.def.name || '', 16, v.y / 2);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ff7878';
  ctx.fillText('DEATHS ' + levelDeaths, GAME_WIDTH - 16, v.y / 2);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  if (gameState === 'playing' && typeof drawCustomSessionOverlay === 'function') drawCustomSessionOverlay();
}
