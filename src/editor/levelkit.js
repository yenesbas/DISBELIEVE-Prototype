/*
 * LEVELKIT.JS - The full game's level format and physics, for player-made levels
 *
 * Levels built in this prototype's editor go into the full DISBELIEVE game, so
 * they are kept in the game's own level format (format 3) and played with the
 * game's own physics: what works here works there, frame for frame.
 *
 * Everything lives in one object, LK, so none of it clashes with game.js (the
 * prototype's own chapters keep their own engine). Nothing in here touches the
 * DOM, so it also runs in Node.
 *
 * It is a copy, kept in step by hand, of the full game's src/core.js (the
 * numbers), src/world.js (the physics) and src/levelfile.js (the format):
 * when the physics or the format change there, change them here too.
 *
 * A level (one 1920 x 1080 screen of 60 px tiles, 32 x 18):
 *   name, style ('gray' | 'neon' | 'paper')
 *   tiles     { kind: [[c, r, w, h], ...] } rectangles of tiles, kinds as in TILE_KINDS:
 *             solid fake invisible crumble spikeUp spikeRight spikeDown spikeLeft gravityUp gravityDown
 *   start [c, r]   door [c, r]   decoys [[c, r], ...] (they look like the door and kill)
 *   traps     [{ spikes, slides, triggers }, ...]: what fires together, and what fires it
 *             spikes   [{ c, r, dir, speed, delay?, travel? }] hidden until fired: shoot out of tile (c, r)
 *                      toward dir (right downRight down downLeft left upLeft up upRight) at speed px/s,
 *                      delay s after the trigger, travel tiles far (left out: until they hit something solid)
 *             slides   [{ c, r, move: [dc, dr], time }] spikes in plain sight that dash move tiles in time s
 *             triggers [{ c, r, w, h, show?, off? }] tile rects that fire the trap when touched; w 0 is a line
 *                      to cross; show: drawn before it fires; off: kept, but never fires. May be fractional.
 *   flips     [{ c, r, w, h, cool }] flip gravity whichever way it is, cool s apart
 *   text      [{ x, y, s, size, min?, max? }] hints in px (centre), shown only within min / max deaths
 *   crumbleRespawn?  seconds until a fallen crumbling block is back (0 / left out: never)
 *
 * Share codes are the level's JSON as URL-safe base64, exactly as the full
 * game makes and reads them.
 */
'use strict';

const LK = (function () {
  /* ===== the full game's constants (its src/core.js) ===== */
  const W = 1920, H = 1080;
  const FPS = 60, STEP = 1 / FPS;            // fixed simulation timestep
  const PHYS = { g: 2600, jump: 1000, run: 440, accel: 5200, maxFall: 1600, size: 40 };
  const CRUMBLE_TIME = 0.6;
  const TILE = 60, COLS = 32, ROWS = 18;    // one level = one 1920 x 1080 screen of 60 px tiles

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const approach = (v, to, d) => v < to ? Math.min(v + d, to) : Math.max(v - d, to);
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  /* ===== the world: blocks, spikes, the player's physics (its src/world.js) =====
     The simulation only emits events (land, jump, hit, flip, door...); whoever runs it decides how they look. */
  const B = (x, y, w, h, type = 'solid', o = {}) =>
    Object.assign({ x, y, w, h, type, touchT: null, collapsed: false, rev: 0, exposed: false }, o);
  const isSolid = b => !!b && (b.type === 'solid' || b.type === 'invisible' || (b.type === 'crumble' && !b.collapsed));
  // g: -1 pulls up, 1 pulls down, 0 toggles gravity on every entry (`cool` seconds between flips)
  const Zone = (x, y, w, h, g, cool = 0) => ({ x, y, w, h, g, cool, cdUntil: 0, inside: false });
  // 8 aim directions, index * 45 deg (0 = right, 2 = down, 4 = left, 6 = up)
  const DIRS = [...Array(8)].map((_, i) => [Math.round(Math.cos(i * Math.PI / 4) * 1e4) / 1e4, Math.round(Math.sin(i * Math.PI / 4) * 1e4) / 1e4]);
  const SPEEDS = [150, 900, 2400], SPEED_NAMES = ['Creep', 'Fast', 'Snap'];
  // How long input is held back after a spawn, in whole simulation frames (the paper page needs time to draw itself).
  const SPAWN_FRAMES = { first: 12, paper: 43, respawn: 10 };
  const spawnDelay = (style, first) => (first ? (style === 'paper' ? SPAWN_FRAMES.paper : SPAWN_FRAMES.first) : SPAWN_FRAMES.respawn) * STEP;

  function Spike(ox, oy, dx, dy, o = {}) {
    return Object.assign({ ox, oy, dx, dy, speed: 1500, delay: 0, travel: 600, len: 50, wid: 40,
      launch: null, snd: false, lethal: true, shaft: false, near: false, auto: false }, o);
  }
  const spikeD = (s, t) => s.launch == null ? 0 : clamp((t - s.launch - s.delay) * s.speed, 0, s.travel);
  function spikeTip(s, t) { const d = spikeD(s, t); return { x: s.ox + s.dx * d, y: s.oy + s.dy * d, d }; }
  function spikePts(s, t) {
    const tip = spikeTip(s, t); if (tip.d <= 0) return [];
    const px = -s.dy, py = s.dx, pts = [[tip.x, tip.y]];
    for (const k of [.3, .6]) pts.push([tip.x - s.dx * s.len * k, tip.y - s.dy * s.len * k]);
    const bx = tip.x - s.dx * s.len * .9, by = tip.y - s.dy * s.len * .9, hw = s.wid * .42;
    pts.push([bx + px * hw, by + py * hw], [bx - px * hw, by - py * hw]);
    return pts;
  }
  // Sliding spikes: a spike strip that sits in plain sight and, once its trigger is touched, dashes a fixed
  // distance in its time, through anything in the way.
  const slideK = (s, t) => s.launch == null ? 0 : clamp((t - s.launch) / s.dur, 0, 1);
  function slideHitbox(s, t) { const k = slideK(s, t); return { x: s.x + 8 + s.mx * k, y: s.y + 26 + s.my * k, w: 44, h: 34 }; }
  function spikeHits(s, p, t) {
    const m = 3;
    for (const [x, y] of spikePts(s, t)) if (x > p.x + m && x < p.x + p.w - m && y > p.y + m && y < p.y + p.h - m) return true;
    return false;
  }

  class Player {
    constructor(x, y, o) {
      Object.assign(this, { x, y, w: PHYS.size, h: PHYS.size, vx: 0, vy: 0, gs: 1, grounded: false, alive: true, jumpHeld: false, dir: 1,
        trail: [], sq: 0, spawnT: -1, visible: true, landed: false, jumped: false, rising: false, buf: 0, coy: 0,
        wall: 0, inp: {} }, o || {});
    }
    step(dt, inp, L) {
      this.landed = this.jumped = false; this.inp = inp;
      if (!this.alive) return;
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      this.vx = approach(this.vx, dir * PHYS.run, PHYS.accel * dt);
      // jump buffer + coyote time make the controls forgiving without changing the arc
      if (inp.jump && !this.jumpHeld) this.buf = .12; else this.buf -= dt;
      this.coy = this.grounded ? .09 : this.coy - dt;
      if (this.buf > 0 && this.coy > 0) {
        this.vy = -PHYS.jump * this.gs; this.grounded = false; this.jumped = true; this.rising = true; this.sq = -1; this.buf = 0; this.coy = 0;
      }
      if (this.rising && !inp.jump && this.vy * this.gs < 0) { this.vy *= .45; this.rising = false; }   // variable jump height
      if (this.vy * this.gs >= 0) this.rising = false;
      this.jumpHeld = !!inp.jump;
      this.vy = clamp(this.vy + PHYS.g * this.gs * dt, -PHYS.maxFall, PHYS.maxFall);
      this.x += this.vx * dt; this.wall = 0;
      for (const b of L.blocks) if (isSolid(b) && overlap(this, b)) {
        if (this.vx > 0) { this.x = b.x - this.w; this.wall = 1; } else if (this.vx < 0) { this.x = b.x + b.w; this.wall = -1; }
        this.vx = 0;
      }
      if (this.x < 0) { this.x = 0; this.vx = 0; this.wall = -1; }            // the map's edges are walls
      if (this.x > L.w - this.w) { this.x = L.w - this.w; this.vx = 0; this.wall = 1; }
      if (this.wall && this.wall !== dir) this.wall = 0;                     // only "pushing" when steering into it
      const was = this.grounded; this.grounded = false;
      this.impact = 0;
      this.y += this.vy * dt;
      for (const b of L.blocks) if (isSolid(b) && overlap(this, b)) {
        if (this.vy > 0) { this.y = b.y - this.h; if (this.gs > 0) this.grounded = true; }
        else { this.y = b.y + b.h; if (this.gs < 0) this.grounded = true; }
        this.impact = Math.abs(this.vy); this.vy = 0;
      }
      if (this.grounded && !was) { this.landed = true; this.sq = Math.min(1, .45 + this.impact / 1600); }
      if (Math.abs(this.vx) > 10) this.dir = Math.sign(this.vx);
      this.sq *= Math.pow(.0001, dt);
      this.trail.push({ x: this.x, y: this.y }); if (this.trail.length > 14) this.trail.shift();
    }
  }

  // A zero-width trigger is a line to cross; touching it counts.
  const touches = (p, tr) => tr.w > 0 ? overlap(p, tr)
    : p.x < tr.x && p.x + p.w >= tr.x && p.y <= tr.y + tr.h && p.y + p.h >= tr.y;

  class Level {
    constructor(o) {
      // killTop: dying above this y; crumbleRespawn: seconds until a collapsed crumble rebuilds itself (0 = never,
      // until you respawn); lookN: counts the fakes found out, so a drawing of the blocks knows to redo itself
      Object.assign(this, { blocks: [], zones: [], triggers: [], spikes: [], slides: [], hazards: [], decoys: [], door: null, time: 0, cell: null,
        spawn: { x: 100, y: 800 }, lie: null, killTop: -110, crumbleRespawn: 0, pgs: 1, cols: COLS, rows: ROWS, w: W, h: H, lookN: 0 }, o);
    }
    reset() {                                    // back to the start state; discovered lies stay exposed
      this.time = 0; this.lie = null; this.pgs = 1;
      for (const b of this.blocks) if (b.type === 'crumble') { b.collapsed = false; b.touchT = null; }
      for (const s of this.spikes) { s.launch = null; s.snd = false; s.near = false; }
      for (const s of this.slides) { s.launch = null; s.snd = false; }
      for (const tr of this.triggers) tr.fired = false;
      for (const z of this.zones) { z.inside = false; z.cdUntil = 0; }
      for (const d of this.decoys) d.sprung = false;
      if (this.door) this.door.reached = false;
    }
    raycast(s) {                                 // spikes stop where they hit something solid
      for (let d = 5; d < 2600; d += 5) {
        const x = s.ox + s.dx * d, y = s.oy + s.dy * d;
        if (x < -80 || x > this.w + 80 || y < -80 || y > this.h + 80) return d;
        const r = Math.floor(y / TILE), c = Math.floor(x / TILE), b = this.cell[r] && this.cell[r][c];
        if (b && b !== s.home && isSolid(b)) return d;
      }
      return 2600;
    }
    update(dt, p, sim) {
      const t = (this.time += dt);
      if (p.alive && p.grounded) for (const b of this.blocks) {
        if (b.type !== 'crumble' || b.collapsed || b.touchT != null) continue;
        const touching = p.gs > 0 ? Math.abs(p.y + p.h - b.y) < .5 : Math.abs(p.y - (b.y + b.h)) < .5;
        if (touching && p.x < b.x + b.w && p.x + p.w > b.x) { b.touchT = t; sim.emit('crumbleTouch', b); }
      }
      for (const b of this.blocks) {
        if (b.type !== 'crumble') continue;
        if (!b.collapsed && b.touchT != null && t - b.touchT >= CRUMBLE_TIME) {
          b.collapsed = true; b.collapseT = t; this.lie = { cause: 'crumble', t }; sim.emit('collapse', b);
        } else if (b.collapsed && this.crumbleRespawn && t - b.collapseT >= this.crumbleRespawn) { b.collapsed = false; b.touchT = null; }
      }
      if (p.alive) {
        const halo = { x: p.x - 1, y: p.y - 1, w: p.w + 2, h: p.h + 2 };
        for (const b of this.blocks) {
          if (b.type === 'fake' && !b.exposed && overlap(p, b)) { b.exposed = true; this.lie = { cause: 'fake', t }; this.lookN++; sim.emit('expose', b); }
          if (b.type === 'invisible' && !b.exposed && overlap(halo, b)) { b.exposed = true; b.flashT = t; sim.emit('reveal', b); }
        }
      }
      for (const b of this.blocks) if (b.exposed) b.rev = Math.min(1, b.rev + dt * 5);
      for (const tr of this.triggers) if (!tr.fired && p.alive && touches(p, tr)) {
        tr.fired = true; tr.firedT = t;
        for (const s of tr.spikes) { s.launch = t; if (s.auto) s.travel = this.raycast(s); }
        for (const s of tr.slides || []) s.launch = t;
        sim.emit('trigger', tr);
      }
      for (const s of this.slides) {
        if (s.launch != null && !s.snd) { s.snd = true; sim.emit('slide', s); }
        if (p.alive && overlap(p, slideHitbox(s, t))) sim.emit('hit', { src: s, cause: s.launch == null ? 'spikes' : 'trap' });
      }
      for (const s of this.spikes) {
        if (s.launch != null && !s.snd && t >= s.launch + s.delay) { s.snd = true; sim.emit('spikeFire', s); }
        if (!p.alive) continue;
        if (s.lethal && spikeHits(s, p, t)) { sim.emit('hit', { src: s, cause: 'trap' }); continue; }
        if (!s.near && s.speed >= 900 && s.launch != null) {           // near miss -> slow motion
          const d = spikeD(s, t);
          if (d > 0 && d < s.travel) {
            const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
            for (const [x, y] of spikePts(s, t)) if (Math.hypot(x - cx, y - cy) < 46) { s.near = true; sim.emit('near', s); break; }
          }
        }
      }
      if (p.alive) for (const h of this.hazards) if (overlap(p, h.hit)) { sim.emit('hit', { src: h, cause: 'spikes' }); break; }
      if (p.alive) for (const d of this.decoys) if (!d.sprung && overlap(p, d)) {
        d.sprung = d.exposed = true; d.t = t; sim.emit('hit', { src: d, cause: 'decoy' });   // exposed survives respawns
      }
      for (const z of this.zones) {
        const inside = p.alive && overlap(p, z);
        if (inside && !z.inside) {
          if (z.g === 0) {                                              // toggle zone: flip whichever way you are, then cool down
            if (t >= z.cdUntil) { p.gs = -p.gs; p.vy *= .5; p.grounded = false; z.cdUntil = t + z.cool; sim.emit('flip', z); }
          } else if (p.gs !== z.g) { p.gs = z.g; p.grounded = false; sim.emit('flip', z); }
        }
        z.inside = inside;
      }
      this.pgs = p.gs;
      if (this.door && p.alive && !this.door.reached && overlap(p, this.door)) { this.door.reached = true; this.door.t = t; sim.emit('door', this.door); }
      if (p.alive && (p.y > this.h + 60 || p.y < this.killTop)) {      // fell out of the world - blame the last lie if it was recent
        const lie = this.lie && t - this.lie.t < 2.5 ? this.lie.cause : 'fall';
        sim.emit('hit', { src: null, cause: lie });
      }
    }
  }

  class Sim {
    constructor(L, p, script, style, hook) { this.L = L; this.p = p; this.script = script || (() => ({})); this.style = style || 'gray'; this.hook = hook || null; this.t = 0; }
    step(dt) {
      this.t += dt;
      const inp = this.script(this.t, this.p, this) || {};
      this.p.step(dt, inp, this.L);
      if (this.p.landed) this.emit('land', this.p);
      if (this.p.jumped) this.emit('jump', this.p);
      this.L.update(dt, this.p, this);
    }
    emit(ev, d) { if (this.hook) this.hook(ev, d, this); }
  }

  /* ---- a playable Level from a level object: its tiles become a grid of map characters first.
     Map chars: . empty  # solid  F fake  I invisible  C crumble  ^ > v < static spikes
                u gravity-up zone  d gravity-down zone  P start  D door  X decoy door ---- */
  function buildLevel(def) {
    const g = levelGrid(def), ROWS = g.length, COLS = g[0].length;
    const at = (c, r) => (r >= 0 && r < ROWS && c >= 0 && c < COLS) ? g[r][c] : '.';
    const cell = [...Array(ROWS)].map(() => Array(COLS).fill(null));
    const blocks = [], hazards = [], zones = [], decoys = [];
    let spawn = { x: 70, y: 800 }, door = null;
    // greedy-merge runs of solid / fake / invisible into rectangles
    const used = [...Array(ROWS)].map(() => Array(COLS).fill(false));
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = g[r][c];
      if (used[r][c] || !'#FI'.includes(ch)) continue;
      let w = 1; while (c + w < COLS && g[r][c + w] === ch && !used[r][c + w]) w++;
      let h = 1;
      outer: while (r + h < ROWS) { for (let k = 0; k < w; k++) if (g[r + h][c + k] !== ch || used[r + h][c + k]) break outer; h++; }
      const type = ch === '#' ? 'solid' : ch === 'F' ? 'fake' : 'invisible';
      const b = B(c * TILE, r * TILE, w * TILE, h * TILE, type);
      for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) { used[y][x] = true; cell[y][x] = b; }
      blocks.push(b);
    }
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = g[r][c], x = c * TILE, y = r * TILE;
      if (ch === 'C') { const b = B(x, y, TILE, TILE, 'crumble'); blocks.push(b); cell[r][c] = b; }
      else if ('^>v<'.includes(ch)) {
        const hit = ch === '^' ? { x: x + 8, y: y + 26, w: 44, h: 34 } : ch === 'v' ? { x: x + 8, y, w: 44, h: 34 }
          : ch === '>' ? { x, y: y + 8, w: 34, h: 44 } : { x: x + 26, y: y + 8, w: 34, h: 44 };
        hazards.push({ x, y, ch, hit });
      }
      else if (ch === 'P') spawn = { x: x + 10, y: y + TILE - 40 };
      else if (ch === 'D' || ch === 'X') {
        const floor = '#C'.includes(at(c, r + 1)) || !'#C'.includes(at(c, r - 1));
        const d = { x: x + 5, y: floor ? y + TILE - 90 : y, w: 50, h: 90, inv: !floor };
        if (ch === 'D') door = d; else decoys.push(d);
      }
      else if ((ch === 'u' || ch === 'd') && at(c, r - 1) !== ch) {          // vertical run -> one zone column
        let h = 1; while (at(c, r + h) === ch) h++;
        zones.push(Zone(x, y, TILE, h * TILE, ch === 'u' ? -1 : 1));
      }
    }
    // A trap is what fires together (trap spikes and sliding spikes) and what fires it: each of its triggers that is on
    // fires all of it. Everything a trap makes keeps the trap's index (the editor colors by it).
    const spikes = [], slides = [], triggers = [];
    (def.traps || []).forEach((tp, i) => {
      const sp = (tp.spikes || []).map(s => {
        const [dx, dy] = DIRS[dirIndex(s.dir)], m = Math.max(Math.abs(dx), Math.abs(dy)), cx = s.c * TILE + 30, cy = s.r * TILE + 30, speed = s.speed || 900;
        return Spike(cx + dx * 30 / m, cy + dy * 30 / m, dx, dy, { speed, delay: s.delay || 0, travel: (s.travel || 0) * TILE, auto: !s.travel,
          home: cell[s.r] && cell[s.r][s.c], shaft: speed < 400, trap: i });
      });
      const sl = (tp.slides || []).map(s => ({ x: s.c * TILE, y: s.r * TILE, mx: s.move[0] * TILE, my: s.move[1] * TILE, dur: s.time, launch: null, snd: false, trap: i }));
      spikes.push(...sp); slides.push(...sl);
      for (const t of tp.triggers || []) if (!t.off)
        triggers.push({ x: t.c * TILE, y: t.r * TILE, w: t.w * TILE, h: t.h * TILE, kind: t.w ? 'box' : 'line', hidden: !t.show, spikes: sp, slides: sl, trap: i });
    });
    for (const z of def.flips || []) zones.push(Zone(z.c * TILE, z.r * TILE, z.w * TILE, z.h * TILE, 0, z.cool == null ? .5 : z.cool));
    return new Level({ blocks, zones, triggers, spikes, slides, hazards, decoys, door, spawn, cell, tiles: g, cols: COLS, rows: ROWS, w: COLS * TILE, h: ROWS * TILE,
      killTop: def.killTop == null ? -110 : def.killTop * TILE, crumbleRespawn: def.crumbleRespawn || 0 });
  }

  /* ===== the level format (the full game's src/levelfile.js) ===== */
  const LEVEL_FORMAT = 3;
  // n: the name in the editor. ch: the character buildLevel's map uses for it.
  const TILE_KINDS = [
    { id: 'solid', ch: '#', n: 'Solid' }, { id: 'fake', ch: 'F', n: 'Fake' }, { id: 'invisible', ch: 'I', n: 'Invisible' },
    { id: 'crumble', ch: 'C', n: 'Crumble' }, { id: 'spikeUp', ch: '^', n: 'Spikes up' }, { id: 'spikeRight', ch: '>', n: 'Spikes right' },
    { id: 'spikeDown', ch: 'v', n: 'Spikes down' }, { id: 'spikeLeft', ch: '<', n: 'Spikes left' },
    { id: 'gravityUp', ch: 'u', n: 'Gravity up' }, { id: 'gravityDown', ch: 'd', n: 'Gravity down' }
  ];
  const DIR_NAMES = ['right', 'downRight', 'down', 'downLeft', 'left', 'upLeft', 'up', 'upRight'];
  const LEVEL_STYLES = ['gray', 'neon', 'paper'];
  const dirIndex = d => typeof d === 'number' ? d & 7 : Math.max(0, DIR_NAMES.indexOf(d));

  /* ---- tiles: a level's rectangles <-> a grid of map characters ---- */
  // Start, door and decoys go over the tiles: a tile can't share a cell with one of them.
  function levelGrid(lv) {
    const g = [...Array(ROWS)].map(() => Array(COLS).fill('.'));
    const put = (c, r, ch) => { if (r >= 0 && r < ROWS && c >= 0 && c < COLS) g[r][c] = ch; };
    for (const k of TILE_KINDS) for (const [c, r, w = 1, h = 1] of (lv.tiles && lv.tiles[k.id]) || [])
      for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) put(x, y, k.ch);
    for (const [c, r] of lv.decoys || []) put(c, r, 'X');
    if (lv.door) put(lv.door[0], lv.door[1], 'D');
    if (lv.start) put(lv.start[0], lv.start[1], 'P');
    return g;
  }
  // The cells of one character as rectangles, the biggest first (so a floor stays one floor), listed top to bottom.
  function tileRects(g, ch) {
    const rows = g.length, cols = g[0].length, left = g.map(row => row.map(x => x === ch)), out = [];
    for (;;) {
      let best = null;
      const hgt = Array(cols).fill(0);                               // largest rectangle in a histogram, row by row
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) hgt[c] = left[r][c] ? hgt[c] + 1 : 0;
        for (let c = 0; c < cols; c++) {
          if (!hgt[c]) continue;
          let h = hgt[c];
          for (let e = c; e < cols && hgt[e]; e++) {
            h = Math.min(h, hgt[e]);
            const w = e - c + 1, a = w * h, top = r - h + 1;
            if (!best || a > best.a || (a === best.a && (w > best.w || (w === best.w && (top < best.r || (top === best.r && c < best.c))))))
              best = { c, r: top, w, h, a };
          }
        }
      }
      if (!best) break;
      for (let y = best.r; y < best.r + best.h; y++) for (let x = best.c; x < best.c + best.w; x++) left[y][x] = false;
      out.push([best.c, best.r, best.w, best.h]);
    }
    return out.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  }
  // A grid back to a level's tiles, start, door and decoys.
  function gridParts(g) {
    const tiles = {}, find = ch => { const o = []; g.forEach((row, r) => row.forEach((x, c) => { if (x === ch) o.push([c, r]); })); return o; };
    for (const k of TILE_KINDS) { const rs = tileRects(g, k.ch); if (rs.length) tiles[k.id] = rs; }
    const P = find('P'), D = find('D'), X = find('X'), o = { tiles };
    if (P.length) o.start = P[P.length - 1];
    if (D.length) o.door = D[D.length - 1];
    if (X.length) o.decoys = X;
    return o;
  }

  /* ---- tidying: the keys in a fixed order, empty lists left out ---- */
  const LEVEL_KEYS = ['id', 'name', 'style', 'bonus', 'size', 'tiles', 'start', 'door', 'decoys', 'traps', 'flips', 'text', 'view', 'killTop', 'crumbleRespawn'];
  function tidyLevel(lv) {
    const o = {};
    for (const k of LEVEL_KEYS.concat(Object.keys(lv).filter(k => !LEVEL_KEYS.includes(k)))) {
      const v = lv[k];
      if (v == null || v === false || (Array.isArray(v) && !v.length)) continue;
      o[k] = v;
    }
    if (o.tiles) { const t = {}; for (const k of TILE_KINDS) if (o.tiles[k.id] && o.tiles[k.id].length) t[k.id] = o.tiles[k.id]; o.tiles = t; }
    if (o.traps) o.traps = o.traps.map(tp => {
      const t = {};
      for (const k of ['spikes', 'slides', 'triggers']) if (tp[k] && tp[k].length) t[k] = tp[k].map(x => Object.fromEntries(Object.entries(x).filter(([, v]) => v != null && v !== false)));
      return t;
    });
    return o;
  }

  /* ---- cleaning: anything from outside (a share code, a file, an old save) is made safe to build ---- */
  function cleanLevel(o) {
    if (!o || typeof o !== 'object') return null;
    const num = (v, a, b, d) => { v = +v; return Number.isFinite(v) ? clamp(v, a, b) : d; };
    const int = (v, a, b, d) => Math.round(num(v, a, b, d));
    const list = (v, n) => Array.isArray(v) ? v.slice(0, n) : [];
    const [cols, rows] = [COLS, ROWS];
    const cell = v => Array.isArray(v) ? [int(v[0], 0, cols - 1, 0), int(v[1], 0, rows - 1, 0)] : null;
    const lv = { id: String(o.id || '★').slice(0, 40), name: String(o.name || 'Untitled').slice(0, 40),
      style: LEVEL_STYLES.includes(o.style) ? o.style : 'neon', bonus: !!o.bonus, tiles: {} };
    for (const k of TILE_KINDS) {
      const rs = list(o.tiles && o.tiles[k.id], 600).filter(Array.isArray).map(a => {
        const c = int(a[0], 0, cols - 1, 0), r = int(a[1], 0, rows - 1, 0);
        return [c, r, int(a[2] == null ? 1 : a[2], 1, cols - c, 1), int(a[3] == null ? 1 : a[3], 1, rows - r, 1)];
      });
      if (rs.length) lv.tiles[k.id] = rs;
    }
    lv.start = cell(o.start); lv.door = cell(o.door); lv.decoys = list(o.decoys, 40).map(cell).filter(Boolean);
    const trig = t => ({ c: num(t.c, -100, 100, 0), r: num(t.r, -100, 100, 0), w: num(t.w, 0, 200, 1), h: num(t.h, 0, 200, 1),
      show: !!t.show, off: !!t.off });
    lv.traps = list(o.traps, 120).filter(t => t && typeof t === 'object').map(tp => ({
      spikes: list(tp.spikes, 60).filter(Boolean).map(s => {
        const x = { c: int(s.c, 0, cols - 1, 0), r: int(s.r, 0, rows - 1, 0), dir: DIR_NAMES[dirIndex(s.dir)], speed: num(s.speed, 30, 5000, 900) };
        if (+s.delay) x.delay = num(s.delay, 0, 10, 0);
        if (+s.travel) x.travel = num(s.travel, .1, 60, 1);
        return x;
      }),
      slides: list(tp.slides, 60).filter(Boolean).map(s => ({ c: int(s.c, 0, cols - 1, 0), r: int(s.r, 0, rows - 1, 0),
        move: [num((s.move || [])[0], -60, 60, 0), num((s.move || [])[1], -60, 60, 0)], time: num(s.time, .02, 20, .2) })),
      triggers: list(tp.triggers, 20).filter(Boolean).map(trig)
    }));
    lv.flips = list(o.flips, 60).filter(Boolean).map(z => ({ c: int(z.c, 0, cols - 1, 0), r: int(z.r, 0, rows - 1, 0), w: int(z.w, 1, cols, 1), h: int(z.h, 1, rows, 1),
      cool: num(z.cool, 0, 20, .5) }));
    lv.text = list(o.text, 30).filter(x => x && x.s != null).map(x => {
      const t = { x: num(x.x, -500, 2500, 960), y: num(x.y, -500, 1600, 540), s: String(x.s).slice(0, 160), size: num(x.size, 8, 400, 60) };
      if (x.op != null) t.op = num(x.op, 0, 1, 1);
      if (x.min != null) t.min = int(x.min, 0, 1e6, 0);
      if (x.max != null) t.max = int(x.max, 0, 1e6, 0);
      return t;
    });
    if (o.view) lv.view = { x: num(o.view.x, -20, 60, 16), y: num(o.view.y, -20, 40, 9), zoom: num(o.view.zoom, .25, 4, 1) };
    if (o.killTop != null) lv.killTop = num(o.killTop, -40, 40, -2);
    if (o.crumbleRespawn) lv.crumbleRespawn = num(o.crumbleRespawn, 0, 60, 0);
    return tidyLevel(lv);
  }

  /* ---- share codes: the level's JSON as URL-safe base64, as the full game makes them ---- */
  const toB64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  function encodeLevel(lv) {
    const o = Object.assign({ format: LEVEL_FORMAT }, tidyLevel(lv)); delete o.id;
    return toB64(JSON.stringify(o));
  }
  // A code or a link with #lvl=... in it; null if it can't be read.
  function decodeLevel(str) {
    try {
      let s = String(str).trim(); const i = s.indexOf('lvl='); if (i >= 0) s = s.slice(i + 4);
      s = s.replace(/[^A-Za-z0-9\-_+/]/g, '').replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
      const o = JSON.parse(decodeURIComponent(escape(atob(s))));
      const lv = o && o.format >= 3 ? cleanLevel(o) : null;
      if (lv) lv.id = '★';
      return lv;
    } catch (e) { return null; }
  }
  /* ---- checks: what stops a level from working, and what is probably a mistake ---- */
  // [{ bad: true when it can't be played, text, c, r (the cell it is about, if any) }]
  function checkLevel(lv) {
    const out = [];
    if (!lv.start) out.push({ bad: true, text: 'There is no start. Place one with the Start tool.' });
    if (!lv.door) out.push({ bad: true, text: 'There is no door. Place one with the Door tool.' });
    (lv.traps || []).forEach((tp, i) => {
      const n = (tp.spikes || []).length + (tp.slides || []).length, on = (tp.triggers || []).filter(t => !t.off).length;
      const where = tp.spikes && tp.spikes[0] || tp.slides && tp.slides[0] || tp.triggers && tp.triggers[0] || {};
      if (!n) out.push({ text: `Trap ${i + 1} has a trigger but nothing for it to fire.`, c: Math.floor(where.c), r: Math.floor(where.r) });
      else if (!on) out.push({ text: `Trap ${i + 1} never fires: ${(tp.triggers || []).length ? 'its trigger is off' : 'it has no trigger'}.`, c: Math.floor(where.c), r: Math.floor(where.r) });
    });
    return out;
  }

  /* ===== levels from this prototype's first editor (20 x 12 maps) ===== */
  // The old map goes into the bottom left corner of the bigger screen (its floor stays the floor, its left edge
  // the screen's edge). Spikes there were strips in plain sight that dashed when crossed: they become sliding
  // spikes, each with its own trigger; a spike that never moved becomes spikes in plain sight. Old physics were a
  // little different, so an old level wants a test play after this.
  const OLD_COLS = 20, OLD_ROWS = 12, OLD_TOP = ROWS - OLD_ROWS;
  const OLD_STYLE = { default: 'gray', neon: 'neon', sketch: 'paper' };
  const OLD_DIRS = {
    right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1],
    upRight: [Math.SQRT1_2, -Math.SQRT1_2], upLeft: [-Math.SQRT1_2, -Math.SQRT1_2],
    downRight: [Math.SQRT1_2, Math.SQRT1_2], downLeft: [-Math.SQRT1_2, Math.SQRT1_2]
  };
  const isOldLevel = o => !!o && typeof o === 'object' && Array.isArray(o.map) && !o.tiles;
  function fromOldLevel(o) {
    if (!isOldLevel(o)) return null;
    const g = [...Array(ROWS)].map(() => Array(COLS).fill('.'));
    const round = v => Math.round(v * 1e4) / 1e4;
    const at = (c, r) => { const row = o.map[r]; return typeof row === 'string' && c < row.length ? row[c] : '.'; };
    const traps = [], zoneCells = [];
    let spike = 0, crumble = false;
    for (let r = 0; r < OLD_ROWS; r++) for (let c = 0; c < OLD_COLS; c++) {
      const ch = at(c, r), R = r + OLD_TOP;
      if ('#FI'.includes(ch)) g[R][c] = ch;
      else if (ch === 'E') { g[R][c] = 'C'; crumble = true; }
      else if (ch === 'S') g[R][c] = 'P';
      else if (ch === 'D') g[R][c] = 'D';
      else if (ch === 'G' || ch === 'g') zoneCells.push([c, r]);
      else if (/[0-9^]/.test(ch)) {
        const i = spike++, tiles = ch === '^' ? 2 : +ch;
        if (!tiles) { g[R][c] = '^'; continue; }
        const [dx, dy] = OLD_DIRS[(o.spikeDirections || [])[i]] || OLD_DIRS.right;
        const sp = +(o.spikeSpeeds || [])[i];
        const speed = Number.isFinite(sp) && sp > 0 ? clamp(sp, .5, 20) : 5;
        // the old trigger, in old pixels: a rect from spikeTriggerAreas, or a line from spikeTriggers / spikeTriggerLengths
        const x = c * TILE, y = r * TILE, top = y + 20, area = (o.spikeTriggerAreas || [])[i];
        let tr;
        if (area && typeof area === 'object') tr = { x: x + (+area.x || 0), y: y + (+area.y || 0), w: Math.max(0, +area.w || 0), h: Math.max(0, +area.h || 0) };
        else {
          const off = Number.isFinite(+(o.spikeTriggers || [])[i]) && (o.spikeTriggers || [])[i] != null ? +o.spikeTriggers[i] : -0.5;
          const len = +(o.spikeTriggerLengths || [])[i];
          tr = !len ? { x: x - off * TILE, y: 0, w: 0, h: OLD_ROWS * TILE, full: true }
            : len > 0 ? { x: x - off * TILE, y: top - len, w: 0, h: len } : { x: x - off * TILE, y: top, w: 0, h: -len };
        }
        const trigger = tr.full ? { c: round(tr.x / TILE), r: 0, w: 0, h: ROWS }
          : { c: round(tr.x / TILE), r: round(tr.y / TILE + OLD_TOP), w: round(tr.w / TILE), h: round(Math.max(tr.h, 1) / TILE) };
        traps.push({ slides: [{ c, r: R, move: [round(dx * tiles), round(dy * tiles)], time: round(1 / speed) }], triggers: [trigger] });
      }
    }
    // connected gravity tiles were one zone, as big as their bounding box
    const seen = new Set(), flips = [], key = (c, r) => c + ',' + r, cells = new Set(zoneCells.map(([c, r]) => key(c, r)));
    for (const [c0, r0] of zoneCells) {
      if (seen.has(key(c0, r0))) continue;
      const box = { c0, c1: c0, r0, r1: r0 }, todo = [[c0, r0]];
      while (todo.length) {
        const [c, r] = todo.pop();
        if (seen.has(key(c, r))) continue;
        seen.add(key(c, r));
        box.c0 = Math.min(box.c0, c); box.c1 = Math.max(box.c1, c); box.r0 = Math.min(box.r0, r); box.r1 = Math.max(box.r1, r);
        for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) if (cells.has(key(nc, nr)) && !seen.has(key(nc, nr))) todo.push([nc, nr]);
      }
      flips.push({ c: box.c0, r: box.r0 + OLD_TOP, w: box.c1 - box.c0 + 1, h: box.r1 - box.r0 + 1, cool: .5 });
    }
    return cleanLevel(Object.assign({ name: o.name, style: OLD_STYLE[o.visualStyle] || 'gray', traps, flips,
      crumbleRespawn: crumble ? 3.5 : null }, gridParts(g)));
  }

  return {
    W, H, FPS, STEP, PHYS, CRUMBLE_TIME, TILE, COLS, ROWS, clamp, overlap,
    DIRS, SPEEDS, SPEED_NAMES, spawnDelay, Spike, spikeD, spikeTip, spikePts, slideK, slideHitbox,
    Player, Level, Sim, buildLevel,
    LEVEL_FORMAT, TILE_KINDS, DIR_NAMES, LEVEL_STYLES, dirIndex, levelGrid, tileRects, gridParts,
    tidyLevel, cleanLevel, encodeLevel, decodeLevel, checkLevel, isOldLevel, fromOldLevel
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = LK;
