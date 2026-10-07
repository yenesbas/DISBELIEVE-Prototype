/*
 * EDITOR.JS - The in-game level editor
 *
 * Builds levels for the full DISBELIEVE game: its 32 x 18 screen, its level
 * format and every kind of block, spike and zone it has (levelkit.js), so a
 * level made here can go into the full game as it is. The level is drawn with
 * the same code that plays it (level_play.js), so what you build is exactly
 * what you play.
 *
 * Editing: pick a tool in the palette, click or drag on the map; SHIFT+drag
 * fills a rectangle, right-click erases. A trap spike is hidden until its trap
 * fires: press a tile and drag to aim it, then drag the trigger that fires it.
 * Sliding spikes sit in plain sight and dash when their trap fires: press a
 * tile and drag to where they dash, then drag the trigger. Each trap has its
 * own color and number, and a line from each of its triggers to each of its
 * spikes. SELECT picks a trap (click one of its spikes or triggers), a flip
 * zone or a hint: drag to move it, drag a trigger's or a flip zone's corner to
 * size it, and the panel under the palette changes it: a trap's speed, delay,
 * reach and dash, its triggers shown or hidden, on or off, more spikes (they
 * fire together) or another trigger; a flip zone's wait; a hint's words, size
 * and when it shows. SELECT also drags the start, the door and decoy doors.
 */

// ===== LAYOUT (in the 1200 x 720 game space) =====
const ED_TOPBAR_H = 56;      // Level name / style / test / save
const ED_PALETTE_W = 226;    // Tools and the panel on the left
const ED_BOTTOM_Y = 608;     // Status + hint bar starts here
const ED_SCALE = 0.5;        // World (the 1920 x 1080 level) -> editor pixels
const ED_TILE = LK.TILE * ED_SCALE;
const ED_GRID_X = 232;
const ED_GRID_Y = 62;
const ED_GRID_W = LK.W * ED_SCALE;
const ED_GRID_H = LK.H * ED_SCALE;
const ED_PANEL_Y = 372;      // The panel under the palette: the picked thing, or the tool's settings

// ===== TOOLS =====
// The palette: each group is one row of up to 4 tools under its name.
const ED_GROUPS = [
  { n: 'EDIT', col: '#e8ecff', tools: ['select', 'erase'] },
  { n: 'GROUND', col: '#8fa3ff', tools: ['solid', 'fake', 'invisible', 'crumble'] },
  { n: 'SPIKES', col: '#ff4d6d', tools: ['spikes', 'trap', 'slide'] },
  { n: 'GRAVITY', col: '#44ddff', tools: ['gravityUp', 'gravityDown', 'flip'] },
  { n: 'DOORS AND SIGNS', col: '#33ee77', tools: ['start', 'door', 'decoy', 'text'] }
];
// ch: what it paints on the map (levelkit.js's map characters); key: its shortcut
const ED_TOOLS = {
  select: { n: 'Select', key: 'V', hint: 'Click a trap’s spike or trigger, a flip zone or a hint to pick it. Drag to move it, drag a corner to size it, DELETE removes it. Drags the start and the doors too.' },
  erase: { n: 'Erase', key: 'X', ch: '.', hint: 'Click or drag to erase tiles, doors, spikes, flip zones and hints; SHIFT+drag erases a rectangle. Triggers: SELECT, then DELETE.' },
  solid: { n: 'Solid', key: 'B', ch: '#', hint: 'Ground. Drag to paint, SHIFT+drag to fill a rectangle, right-click to erase.' },
  fake: { n: 'Fake', key: 'F', ch: 'F', hint: 'Looks exactly like ground. The square falls straight through it.' },
  invisible: { n: 'Invisible', key: 'I', ch: 'I', hint: 'Empty air that is secretly solid. It shows faintly once touched.' },
  crumble: { n: 'Crumble', key: 'C', ch: 'C', hint: 'Holds for 0.6 s once the square lands on it, then falls. Below: whether it comes back.' },
  spikes: { n: 'Spikes', key: 'K', hint: 'Spikes in plain sight. R turns them.' },
  trap: { n: 'Trap spike', key: 'T', hint: 'A hidden spike: press a tile and drag to aim it (8 ways), then drag the trigger that fires it.' },
  slide: { n: 'Sliding spikes', key: 'L', hint: 'Spikes in plain sight that dash when triggered: press a tile and drag to where they dash, then drag the trigger.' },
  gravityUp: { n: 'Gravity up', key: 'U', ch: 'u', hint: 'Cyan zone: gravity flips up as the square enters it.' },
  gravityDown: { n: 'Gravity down', key: 'N', ch: 'd', hint: 'Magenta zone: gravity turns back down.' },
  flip: { n: 'Flip zone', key: 'G', hint: 'Flips gravity whichever way it is as the square enters it. Drag to draw one.' },
  start: { n: 'Start', key: 'S', ch: 'P', hint: 'Where the square appears. A level has one.' },
  door: { n: 'Door', key: 'D', ch: 'D', hint: 'The exit. Put it on a floor, or under a ceiling to have it upside down.' },
  decoy: { n: 'Decoy door', key: 'O', ch: 'X', hint: 'Looks exactly like the exit. It kills.' },
  text: { n: 'Hint text', key: 'H', hint: 'Click to write a hint on the level. It can show only after some deaths.' }
};
const ED_TOOL_ORDER = ED_GROUPS.flatMap(g => g.tools);
// The choices the panel cycles through. REACHES: how far a trap spike flies, in tiles (0: until it hits something);
// DASHES: how long sliding spikes take to dash; COOLS: a flip zone's wait between flips; RESPAWNS: when fallen crumble
// blocks are back (0: never); SHOWS: when a hint shows, by the deaths in the level so far.
const ED_DELAYS = [0, 0.15, 0.3, 0.5], ED_REACHES = [0, 1, 1.5, 2, 3, 5], ED_DASHES = [0.2, 0.4, 1, 2], ED_COOLS = [0, 0.5, 1, 2];
const ED_RESPAWNS = [0, 1, 2, 3.5, 5];
const ED_TEXT_SIZES = [[40, 'small'], [60, 'medium'], [90, 'big']], ED_SHOWS = [{}, { min: 1 }, { min: 2 }, { min: 3 }, { min: 5 }, { max: 0 }];
// As many as a level file keeps (cleanLevel in levelkit.js)
const ED_MAX = { traps: 120, spikes: 60, slides: 60, triggers: 20, flips: 60, text: 30, decoys: 40 };
// Each trap's color (its spikes, its triggers and the lines between them); on the sketch page, darker inks of the same
const ED_TRAP_COLS = ['#ffcc33', '#ff44dd', '#44ff99', '#ff8844', '#88aaff', '#ff6b8b', '#b388ff', '#4dd0e1', '#c6ff4d', '#ffa77a'];
const ED_TRAP_INKS = ['#b08300', '#c0189c', '#0c9a55', '#cc5a12', '#3a5fd6', '#d0244c', '#7445e0', '#0b8fa3', '#5f8f00', '#c55a2e'];
const edTrapColor = (i, paper) => (paper ? ED_TRAP_INKS : ED_TRAP_COLS)[((i | 0) % 10 + 10) % 10];
const ED_MAX_UNDO = 100;

// ===== EDITOR STATE =====
// rec: the stored record being edited (id, created, stats); map: the level as a grid of map characters (tiles, start,
// door, decoys); traps, flips, text: the level's, as in its file; crumble: its crumbleRespawn; extra: whatever else the
// level has that this editor doesn't change. sel: the part picked: a trap's ({ t: its index, part: 'spike' | 'slide' |
// 'trigger', k }), a flip zone or a hint ({ part: 'flip' | 'text', k }); step 'trigger': the next drag is a trigger for
// sel's trap; join: spikes placed now join sel's trap. The rest are the settings new parts get (indexes into the lists
// above), and the screen's state.
const ED = {
  rec: null, name: '', style: 'neon', map: null, traps: [], flips: [], text: [], crumble: 0, extra: {},
  tool: 'solid', sdir: 0, speed: 1, delay: 0, reach: 0, dash: 0, cool: 1, tsize: 1, tshow: 0, show: false, line: false, aim: 0,
  sel: null, step: null, join: false, drag: null, before: null, hover: null, mouse: { x: 0, y: 0 },
  L: null, lv: null, problems: [], dirty: true, unsaved: false, undo: [], redo: [],
  preview: false, grid: true, help: false, naming: false, returnState: 'customLevels',
  status: '', statusColor: '#88ff88', statusT: 0, blink: 0, time: 0, buttons: [], shift: false, alt: false
};

// ===== MODEL: the level being edited =====

const edClone = o => JSON.parse(JSON.stringify(o));

function edLevel() {
  return LK.tidyLevel(Object.assign({ name: ED.name, style: ED.style }, edClone(ED.extra), LK.gridParts(ED.map),
    { traps: edClone(ED.traps), flips: edClone(ED.flips), text: edClone(ED.text), crumbleRespawn: ED.crumble || null }));
}

function edRecord() {
  return { id: ED.rec.id, level: edLevel(), created: ED.rec.created, stats: ED.rec.stats };
}

function edLoad(rec) {
  const lv = rec.level;
  ED.rec = { id: rec.id, created: rec.created, stats: rec.stats };
  ED.map = LK.levelGrid(lv);
  ED.style = LK.LEVEL_STYLES.includes(lv.style) ? lv.style : 'neon';
  ED.name = lv.name || 'Untitled Level';
  ED.traps = edClone(lv.traps || []).map(tp => Object.assign(tp, { spikes: tp.spikes || [], slides: tp.slides || [], triggers: tp.triggers || [] }));
  ED.flips = edClone(lv.flips || []);
  ED.text = edClone(lv.text || []);
  ED.crumble = lv.crumbleRespawn || 0;
  ED.extra = {};
  for (const k of ['bonus', 'view', 'killTop']) if (lv[k] != null) ED.extra[k] = edClone(lv[k]);
  ED.sel = ED.step = ED.drag = ED.before = null;
  ED.join = false;
  ED.dirty = true;
  ED.unsaved = false;
  ED.undo = [];
  ED.redo = [];
}

// ===== UNDO / REDO =====

const edSnapshot = () => JSON.stringify({ m: ED.map.map(r => r.join('')), t: ED.traps, s: ED.style, f: ED.flips, x: ED.text, c: ED.crumble });

function edPushUndo(before) {
  ED.undo.push(before);
  if (ED.undo.length > ED_MAX_UNDO) ED.undo.shift();
  ED.redo.length = 0;
  ED.dirty = true;
  ED.unsaved = true;
}

// Runs a change; if anything changed, it can be undone.
function edChange(fn) {
  const before = edSnapshot();
  fn();
  if (edSnapshot() !== before) edPushUndo(before);
  ED.dirty = true;
}

function edRestore(s) {
  const o = JSON.parse(s);
  ED.map = o.m.map(r => r.split(''));
  ED.traps = o.t;
  ED.style = o.s;
  ED.flips = o.f;
  ED.text = o.x;
  ED.crumble = o.c;
  if (ED.sel && !edPartOf(ED.sel)) { ED.sel = null; ED.join = false; }
  ED.step = null;
  ED.dirty = true;
  ED.unsaved = true;
}

function editorUndo() {
  if (!ED.undo.length) { setEditorStatus('Nothing left to undo', '#ffaa44'); return; }
  ED.redo.push(edSnapshot());
  edRestore(ED.undo.pop());
  setEditorStatus('Undo', '#88ccff');
}

function editorRedo() {
  if (!ED.redo.length) { setEditorStatus('Nothing left to redo', '#ffaa44'); return; }
  ED.undo.push(edSnapshot());
  edRestore(ED.redo.pop());
  setEditorStatus('Redo', '#88ccff');
}

// ===== STATUS TOAST =====

function setEditorStatus(text, color) {
  ED.status = text;
  ED.statusColor = color || '#88ff88';
  ED.statusT = 3.0;
}

// ===== TRAPS, FLIP ZONES AND HINTS =====

const ED_LISTS = { spike: 'spikes', slide: 'slides', trigger: 'triggers' };

function edPartOf(s) {
  if (!s) return null;
  if (s.part === 'flip') return ED.flips[s.k];
  if (s.part === 'text') return ED.text[s.k];
  const tp = ED.traps[s.t];
  return tp && tp[ED_LISTS[s.part]][s.k];
}
const edSelTrap = () => ED.sel && ED.sel.t != null ? ED.traps[ED.sel.t] : null;
const edPicked = part => ED.sel && ED.sel.part === part ? edPartOf(ED.sel) : null;
const edFirstPart = t => ({ t, part: ED.traps[t].spikes.length ? 'spike' : 'slide', k: 0 });

// The trap spike or sliding spikes on a tile (a tile holds one of them).
function edTrapPartAt(c, r) {
  for (let t = 0; t < ED.traps.length; t++) {
    for (const part of ['spike', 'slide']) {
      const k = ED.traps[t][ED_LISTS[part]].findIndex(s => s.c === c && s.r === r);
      if (k >= 0) return { t, part, k };
    }
  }
  return null;
}

function edDropTrap(t) {
  ED.traps.splice(t, 1);
  if (ED.sel && ED.sel.t != null) {
    if (ED.sel.t === t) { ED.sel = null; ED.join = false; ED.step = null; }
    else if (ED.sel.t > t) ED.sel.t--;
  }
}

// A trap goes when its last spike does, with its triggers.
function edRemoveTrapPart(t, part, k) {
  const tp = ED.traps[t];
  tp[ED_LISTS[part]].splice(k, 1);
  if (!tp.spikes.length && !tp.slides.length) edDropTrap(t);
  else if (ED.sel && ED.sel.t === t && ED.sel.part !== 'trigger') ED.sel = edFirstPart(t);
}

// A flip zone or a hint goes; the pick follows the list.
function edDropItem(part, k) {
  (part === 'flip' ? ED.flips : ED.text).splice(k, 1);
  if (ED.sel && ED.sel.part === part) ED.sel = ED.sel.k === k ? null : ED.sel.k > k ? { part, k: ED.sel.k - 1 } : ED.sel;
}

function edRemoveSelected() {
  const s = ED.sel;
  if (!s || !edPartOf(s)) return;
  edChange(() => {
    if (s.part === 'flip' || s.part === 'text') edDropItem(s.part, s.k);
    else if (s.part === 'trigger') { ED.traps[s.t].triggers.splice(s.k, 1); ED.sel = edFirstPart(s.t); }
    else edRemoveTrapPart(s.t, s.part, s.k);
  });
  setEditorStatus('Removed', '#ffaa66');
}

function edRemoveTrap() {
  if (!edSelTrap()) return;
  edChange(() => edDropTrap(ED.sel.t));
  setEditorStatus('Trap removed', '#ffaa66');
}

const edTrigRect = g => ({ x: g.c * LK.TILE, y: g.r * LK.TILE, w: g.w * LK.TILE, h: g.h * LK.TILE });
const edTrigCenter = g => [(g.c + g.w / 2) * LK.TILE, (g.r + g.h / 2) * LK.TILE];
// The middle of a trap spike's tile, and of a sliding spike strip (it sits low in its tile).
const edSpikeMid = s => [s.c * LK.TILE + 30, s.r * LK.TILE + 30];
const edSlideMid = s => [s.c * LK.TILE + 30, s.r * LK.TILE + 42];

// The trigger under a point (world px), the smallest first (a line counts 18 px either side).
function edTriggerAt(lx, ly) {
  let best = null;
  ED.traps.forEach((tp, t) => tp.triggers.forEach((g, k) => {
    const r = edTrigRect(g), pad = r.w ? 0 : 18;
    if (lx >= r.x - pad && lx <= r.x + r.w + pad && ly >= r.y && ly <= r.y + r.h) {
      const a = (r.w || 36) * r.h;
      if (!best || a < best.a) best = { t, k, a };
    }
  }));
  return best;
}

// The flip zone under a point, the smallest first; the hint under a point, the one drawn last first.
function edFlipAt(lx, ly) {
  let best = -1;
  ED.flips.forEach((z, k) => {
    const inside = lx >= z.c * LK.TILE && lx <= (z.c + z.w) * LK.TILE && ly >= z.r * LK.TILE && ly <= (z.r + z.h) * LK.TILE;
    if (inside && (best < 0 || z.w * z.h < ED.flips[best].w * ED.flips[best].h)) best = k;
  });
  return best;
}

function edTextBox(x) {
  const px = x.size || 60;
  ctx.save();
  ctx.font = lkTextFont(ED.style, px);
  const w = ctx.measureText(lkPromptText(x.s)).width + 20;
  ctx.restore();
  const h = px * 1.15;
  return { x: x.x - w / 2, y: x.y - h / 2, w, h };
}

function edTextAt(lx, ly) {
  for (let k = ED.text.length - 1; k >= 0; k--) {
    const b = edTextBox(ED.text[k]);
    if (lx >= b.x && lx <= b.x + b.w && ly >= b.y && ly <= b.y + b.h) return k;
  }
  return -1;
}

// ===== EDITING ON THE MAP =====

// A screen point -> its tile and world position, or null off the map.
function edCell(px, py) {
  const lx = (px - ED_GRID_X) / ED_SCALE, ly = (py - ED_GRID_Y) / ED_SCALE;
  const c = Math.floor(lx / LK.TILE), r = Math.floor(ly / LK.TILE);
  return (c >= 0 && c < LK.COLS && r >= 0 && r < LK.ROWS) ? { c, r, lx, ly } : null;
}

const edToolChar = id => id === 'spikes' ? '^>v<'[ED.sdir] : ED_TOOLS[id].ch;
const edCount = ch => ED.map.reduce((n, row) => n + row.filter(x => x === ch).length, 0);

// One tile painted (or erased). Returns true if anything changed.
function edPaint(c, r, erase) {
  const ch = erase ? '.' : edToolChar(ED.tool);
  if (!ch) return false;
  let changed = false;
  if (ch === 'X' && ED.map[r][c] !== 'X' && edCount('X') >= ED_MAX.decoys) {
    setEditorStatus('A level keeps ' + ED_MAX.decoys + ' decoy doors', '#ffaa44');
    return false;
  }
  if (ch === 'P' || ch === 'D') {                                      // one start and one door
    for (const row of ED.map) for (let i = 0; i < row.length; i++) if (row[i] === ch) { row[i] = '.'; changed = true; }
  }
  if (ch === '.') { const s = edTrapPartAt(c, r); if (s) { edRemoveTrapPart(s.t, s.part, s.k); changed = true; } }
  if (ED.map[r][c] !== ch) { ED.map[r][c] = ch; changed = true; }
  if (ch === '.' && !changed) {                                         // nothing else on the tile: a hint on it, or a flip zone over it
    const x = ED.text.findIndex(o => Math.floor(o.x / LK.TILE) === c && Math.floor(o.y / LK.TILE) === r);
    const f = x < 0 ? ED.flips.findIndex(z => c >= z.c && c < z.c + z.w && r >= z.r && r < z.r + z.h) : -1;
    if (x >= 0) { edDropItem('text', x); changed = true; }
    else if (f >= 0) { edDropItem('flip', f); changed = true; }
  }
  if (changed) ED.dirty = true;
  return changed;
}

// Every tile on the straight line between two, so a fast drag never leaves gaps.
function edPaintLine(a, b, erase) {
  const n = Math.max(Math.abs(b.c - a.c), Math.abs(b.r - a.r));
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    edPaint(Math.round(a.c + (b.c - a.c) * t), Math.round(a.r + (b.r - a.r) * t), erase);
  }
}

const edRectOf = d => ({ c: Math.min(d.c0, d.c1), r: Math.min(d.r0, d.r1), w: Math.abs(d.c1 - d.c0) + 1, h: Math.abs(d.r1 - d.r0) + 1 });

function edDown(px, py, erase, shift) {
  const cell = edCell(px, py);
  if (!cell) return false;
  const { c, r, lx, ly } = cell, tool = ED.tool;
  ED.before = edSnapshot();
  if (erase) {
    if (ED.step) { ED.step = null; return true; }                       // right-click: no trigger (the trap waits for one)
    ED.drag = shift ? { kind: 'rect', erase: true, c0: c, r0: r, c1: c, r1: r } : { kind: 'paint', erase: true, last: { c, r } };
    if (!shift) edPaint(c, r, true);
    return true;
  }
  if (ED.step === 'trigger' && edSelTrap()) {
    if (edSelTrap().triggers.length >= ED_MAX.triggers) { setEditorStatus('A trap keeps ' + ED_MAX.triggers + ' triggers', '#ffaa44'); ED.step = null; return true; }
    ED.drag = { kind: 'trig', c0: c, r0: r, c1: c, r1: r };
    return true;
  }
  if (tool === 'select') {
    const s = edTrapPartAt(c, r);
    if (s) { ED.sel = s; ED.drag = { kind: 'movePart' }; return true; }
    const cur = ED.sel && (ED.sel.part === 'trigger' || ED.sel.part === 'flip') && edPartOf(ED.sel);   // its far corner sizes it
    if (cur && cur.w && Math.hypot(lx - (cur.c + cur.w) * LK.TILE, ly - (cur.r + cur.h) * LK.TILE) < 30) { ED.drag = { kind: 'size' }; return true; }
    if (cur && !cur.w && Math.hypot(lx - cur.c * LK.TILE, ly - (cur.r + cur.h) * LK.TILE) < 30) { ED.drag = { kind: 'size' }; return true; }
    const x = edTextAt(lx, ly);
    if (x >= 0) { const o = ED.text[x]; ED.sel = { part: 'text', k: x }; ED.drag = { kind: 'moveText', dx: o.x - lx, dy: o.y - ly }; return true; }
    const h = edTriggerAt(lx, ly);
    if (h) {
      const g = ED.traps[h.t].triggers[h.k];
      ED.sel = { t: h.t, part: 'trigger', k: h.k };
      ED.drag = { kind: 'moveTrig', dx: g.c - lx / LK.TILE, dy: g.r - ly / LK.TILE };
      return true;
    }
    if ('PDX'.includes(ED.map[r][c])) { ED.drag = { kind: 'moveMark', ch: ED.map[r][c], c, r, under: '.' }; return true; }
    const f = edFlipAt(lx, ly);
    if (f >= 0) { const z = ED.flips[f]; ED.sel = { part: 'flip', k: f }; ED.drag = { kind: 'moveFlip', dc: z.c - c, dr: z.r - r }; return true; }
    ED.sel = null;
    ED.join = false;
    return true;
  }
  if (tool === 'trap') {
    const s = edTrapPartAt(c, r);
    if (s && s.part === 'spike') { ED.sel = s; ED.drag = { kind: 'aim', c, r, dir: LK.dirIndex(edPartOf(s).dir), spike: s }; }
    else if (s) ED.sel = s;                                             // sliding spikes there: picked, not changed
    else ED.drag = { kind: 'aim', c, r, dir: ED.aim };
    return true;
  }
  if (tool === 'slide') {                                              // drag to where they dash (on sliding spikes: change it)
    const s = edTrapPartAt(c, r), o = s && s.part === 'slide' && edPartOf(s);
    if (s) ED.sel = s;
    if (!s || o) ED.drag = { kind: 'dash', c, r, c1: o ? c + o.move[0] : c, r1: o ? r + o.move[1] : r, slide: o ? s : null };
    return true;
  }
  if (tool === 'flip') {
    if (ED.flips.length >= ED_MAX.flips) setEditorStatus('A level keeps ' + ED_MAX.flips + ' flip zones', '#ffaa44');
    else ED.drag = { kind: 'flipRect', c0: c, r0: r, c1: c, r1: r };
    return true;
  }
  if (tool === 'text') {                                               // on a hint: change it; anywhere else: a new one there
    const x = edTextAt(lx, ly);
    if (x >= 0) ED.sel = { part: 'text', k: x };
    ED.drag = { kind: 'text', c, r, k: x };
    return true;
  }
  if (shift && tool !== 'start' && tool !== 'door') { ED.drag = { kind: 'rect', c0: c, r0: r, c1: c, r1: r }; return true; }
  ED.drag = { kind: 'paint', last: { c, r } };
  edPaint(c, r);
  return true;
}

function edMove(px, py) {
  const cell = edCell(px, py);
  ED.hover = cell;
  const d = ED.drag;
  if (!d) return;
  const lx = (px - ED_GRID_X) / ED_SCALE, ly = (py - ED_GRID_Y) / ED_SCALE;
  const T = LK.TILE, clamp = LK.clamp;
  if (d.kind === 'paint') {
    const c = clamp(Math.floor(lx / T), 0, LK.COLS - 1), r = clamp(Math.floor(ly / T), 0, LK.ROWS - 1);
    if (c !== d.last.c || r !== d.last.r) { edPaintLine(d.last, { c, r }, d.erase); d.last = { c, r }; }
  }
  if ((d.kind === 'rect' || d.kind === 'trig' || d.kind === 'flipRect') && cell) { d.c1 = cell.c; d.r1 = cell.r; }
  if (d.kind === 'dash' && cell) { d.c1 = cell.c; d.r1 = cell.r; }
  if (d.kind === 'aim') {
    const cx = d.c * T + 30, cy = d.r * T + 30;
    if (Math.hypot(lx - cx, ly - cy) > 28) d.dir = ((Math.round(Math.atan2(ly - cy, lx - cx) / (Math.PI / 4)) % 8) + 8) % 8;
  }
  if (d.kind === 'moveMark' && cell && (cell.c !== d.c || cell.r !== d.r) && !'PDX'.includes(ED.map[cell.r][cell.c])) {
    ED.map[d.r][d.c] = d.under;
    d.under = ED.map[cell.r][cell.c];
    ED.map[cell.r][cell.c] = d.ch;
    d.c = cell.c; d.r = cell.r;
    ED.dirty = true;
  }
  const part = edPartOf(ED.sel);
  if (d.kind === 'movePart' && cell && part && (part.c !== cell.c || part.r !== cell.r) && !edTrapPartAt(cell.c, cell.r)) {
    part.c = cell.c; part.r = cell.r; ED.dirty = true;
  }
  if (d.kind === 'moveFlip' && cell && part) {
    const nc = clamp(cell.c + d.dc, 0, LK.COLS - part.w), nr = clamp(cell.r + d.dr, 0, LK.ROWS - part.h);
    if (nc !== part.c || nr !== part.r) { part.c = nc; part.r = nr; ED.dirty = true; }
  }
  if (d.kind === 'moveText' && part) {                                 // by 10 px, kept on the screen
    const nx = clamp(Math.round((lx + d.dx) / 10) * 10, 0, LK.W), ny = clamp(Math.round((ly + d.dy) / 10) * 10, 0, LK.H);
    if (nx !== part.x || ny !== part.y) { part.x = nx; part.y = ny; }
  }
  if (d.kind === 'moveTrig' && part) {
    const c = part.w ? Math.round(lx / T + d.dx) : Math.round(lx / T + d.dx - 0.5) + 0.5, r = Math.round(ly / T + d.dy);
    const nc = clamp(c, part.w ? 0 : 0.5, LK.COLS - (part.w || 0.5)), nr = clamp(r, 0, LK.ROWS - part.h);
    if (nc !== part.c || nr !== part.r) { part.c = nc; part.r = nr; ED.dirty = true; }
  }
  if (d.kind === 'size' && part) {                                     // a trigger or a flip zone; a line stays a line
    const w = part.w ? clamp(Math.round(lx / T - part.c), 1, LK.COLS - part.c) : 0;
    const h = clamp(Math.round(ly / T - part.r), 1, LK.ROWS - part.r);
    if (w !== part.w || h !== part.h) { part.w = w; part.h = h; ED.dirty = true; }
  }
}

function edUp() {
  const d = ED.drag;
  ED.drag = null;
  if (!d) return;
  if (d.kind === 'rect') {
    const q = edRectOf(d);
    for (let r = q.r; r < q.r + q.h; r++) for (let c = q.c; c < q.c + q.w; c++) edPaint(c, r, d.erase);
  }
  if (d.kind === 'aim') {
    ED.aim = d.dir;
    if (d.spike) ED.traps[d.spike.t].spikes[d.spike.k].dir = LK.DIR_NAMES[d.dir];
    else {
      const s = { c: d.c, r: d.r, dir: LK.DIR_NAMES[d.dir], speed: LK.SPEEDS[ED.speed] }, tp = ED.join && edSelTrap();
      if (ED_DELAYS[ED.delay]) s.delay = ED_DELAYS[ED.delay];
      if (ED_REACHES[ED.reach]) s.travel = ED_REACHES[ED.reach];
      const ref = tp && tp.spikes[0];                                    // joining a trap: at its speed, delay and reach
      if (ref) for (const k of ['speed', 'delay', 'travel']) { if (ref[k]) s[k] = ref[k]; else delete s[k]; }
      edAddToTrap('spike', s);
    }
  }
  if (d.kind === 'dash') {
    const move = [d.c1 - d.c, d.r1 - d.r];
    if (!move[0] && !move[1]) { if (!d.slide) setEditorStatus('Drag from the spikes to where they dash', '#ffaa44'); }
    else if (d.slide) edPartOf(d.slide).move = move;
    else {
      const tp = ED.join && edSelTrap(), ref = tp && tp.slides[0];
      edAddToTrap('slide', { c: d.c, r: d.r, move, time: ref ? ref.time : ED_DASHES[ED.dash] });
    }
  }
  if (d.kind === 'flipRect') {
    const q = edRectOf(d);
    ED.flips.push({ c: q.c, r: q.r, w: q.w, h: q.h, cool: ED_COOLS[ED.cool] });
    ED.sel = { part: 'flip', k: ED.flips.length - 1 };
  }
  if (d.kind === 'trig') {
    const tp = edSelTrap(), q = edRectOf(d);
    if (tp) {
      const g = ED.line ? { c: d.c0 + 0.5, r: q.r, w: 0, h: q.h } : { c: q.c, r: q.r, w: q.w, h: q.h };
      if (tp.triggers.length ? tp.triggers[0].show : ED.show) g.show = true;
      tp.triggers.push(g);
      ED.sel = { t: ED.sel.t, part: 'trigger', k: tp.triggers.length - 1 };
    }
    ED.step = null;
  }
  if (ED.before && edSnapshot() !== ED.before) edPushUndo(ED.before);
  ED.before = null;
  ED.dirty = true;
  if (d.kind === 'text') edWriteText(d.k >= 0 ? null : { c: d.c, r: d.r });
}

// A trap spike or sliding spikes just placed: they join the picked trap, or make a trap of their own (its trigger next).
function edAddToTrap(part, s) {
  const tp = ED.join && edSelTrap(), list = ED_LISTS[part];
  if (tp) {
    if (tp[list].length >= ED_MAX[list]) { setEditorStatus('A trap keeps ' + ED_MAX[list] + ' ' + list, '#ffaa44'); return; }
    tp[list].push(s);
    ED.sel = { t: ED.sel.t, part, k: tp[list].length - 1 };
    return;
  }
  if (ED.traps.length >= ED_MAX.traps) { setEditorStatus('A level keeps ' + ED_MAX.traps + ' traps', '#ffaa44'); return; }
  ED.traps.push({ spikes: part === 'spike' ? [s] : [], slides: part === 'slide' ? [s] : [], triggers: [] });
  ED.sel = { t: ED.traps.length - 1, part, k: 0 };
  ED.step = 'trigger';
  ED.join = false;
  setEditorStatus('Now drag the trigger that fires it. Right-click or ESC: no trigger for now.', '#ffdd33');
}

// A hint: a new one on a tile (at), or else the picked one's words.
function edWriteText(at) {
  const o = !at && edPicked('text');
  if (!at && !o) return;
  if (at && ED.text.length >= ED_MAX.text) { setEditorStatus('A level keeps ' + ED_MAX.text + ' hints', '#ffaa44'); return; }
  ED.shift = ED.alt = false;
  const v = window.prompt(o ? 'Change the hint (up to 80 characters):' : 'Write a hint (up to 80 characters).\n{move} and {jump} show the keys for them.', o ? o.s : '');
  const s = v == null ? '' : String(v).trim().slice(0, 80);
  if (!s) return;
  edChange(() => {
    if (o) { o.s = s; return; }
    ED.text.push(Object.assign({ x: (at.c + 0.5) * LK.TILE, y: (at.r + 0.5) * LK.TILE, s, size: ED_TEXT_SIZES[ED.tsize][0] }, ED_SHOWS[ED.tshow]));
    ED.sel = { part: 'text', k: ED.text.length - 1 };
  });
}

// A new tool keeps the pick only if it works with it (so the panel shows the tool's own settings otherwise).
const ED_KEEPS = { trap: ['spike', 'slide', 'trigger'], slide: ['spike', 'slide', 'trigger'], flip: ['flip'], text: ['text'] };
function edSetTool(id) {
  if (ED.tool === id) return;
  ED.tool = id;
  ED.step = null;
  if (id !== 'trap' && id !== 'slide') ED.join = false;
  if (ED.sel && id !== 'select' && !(ED_KEEPS[id] || []).includes(ED.sel.part)) { ED.sel = null; ED.join = false; }
}

// ===== SETTINGS: the picked trap's, flip zone's or hint's, or those new ones get =====

const edSame = (list, f) => list.length && list.every(x => f(x) === f(list[0])) ? f(list[0]) : null;
const edNext = (list, v) => list[(list.indexOf(v) + 1) % list.length];          // a value not in the list goes to the first
const edSpeedName = v => { const i = LK.SPEEDS.indexOf(v); return i >= 0 ? LK.SPEED_NAMES[i] : v + ' px/s'; };
const edReachName = v => v ? v + ' tile' + (v === 1 ? '' : 's') : 'to a wall';
const edSizeName = v => (ED_TEXT_SIZES.find(s => s[0] === v) || [0, v + ' px'])[1];
// When a hint shows: always, from some deaths on (min), or only until the first (max 0); a level file may have others.
const edShowName = x => x.min == null && x.max == null ? 'always' : x.min == null && x.max === 0 ? 'before any death'
  : x.max == null ? 'after ' + x.min + ' death' + (x.min === 1 ? '' : 's') : (x.min || 0) + ' to ' + x.max + ' deaths';

function edCycleSpeed() {
  const tp = edSelTrap();
  if (!tp) { ED.speed = (ED.speed + 1) % LK.SPEEDS.length; return; }
  const v = LK.SPEEDS[(LK.SPEEDS.indexOf(edSame(tp.spikes, s => s.speed)) + 1) % LK.SPEEDS.length];
  edChange(() => tp.spikes.forEach(s => { s.speed = v; }));
}
function edCycleDelay() {
  const tp = edSelTrap();
  if (!tp) { ED.delay = (ED.delay + 1) % ED_DELAYS.length; return; }
  const v = ED_DELAYS[(ED_DELAYS.indexOf(edSame(tp.spikes, s => s.delay || 0)) + 1) % ED_DELAYS.length];
  edChange(() => tp.spikes.forEach(s => { if (v) s.delay = v; else delete s.delay; }));
}
function edCycleReach() {
  const tp = edSelTrap();
  if (!tp) { ED.reach = (ED.reach + 1) % ED_REACHES.length; return; }
  const v = edNext(ED_REACHES, edSame(tp.spikes, s => s.travel || 0));
  edChange(() => tp.spikes.forEach(s => { if (v) s.travel = v; else delete s.travel; }));
}
function edCycleDash() {
  const tp = edSelTrap();
  if (!tp) { ED.dash = (ED.dash + 1) % ED_DASHES.length; return; }
  const v = edNext(ED_DASHES, edSame(tp.slides, s => s.time));
  edChange(() => tp.slides.forEach(s => { s.time = v; }));
}
function edToggleShow() {
  const tp = edSelTrap();
  if (!tp || !tp.triggers.length) { ED.show = !ED.show; return; }
  const v = !tp.triggers[0].show;
  edChange(() => tp.triggers.forEach(g => { if (v) g.show = true; else delete g.show; }));
}
function edToggleOn() {
  const tp = edSelTrap();
  if (!tp || !tp.triggers.length) return;
  const off = !tp.triggers.every(g => g.off);
  edChange(() => tp.triggers.forEach(g => { if (off) g.off = true; else delete g.off; }));
}
function edToggleShape() {
  ED.line = !ED.line;
  const g = edPicked('trigger');
  if (g) edChange(() => {                                              // the picked trigger changes shape too
    if (ED.line && g.w) { g.c = Math.floor(g.c + g.w / 2) + 0.5; g.w = 0; }
    else if (!ED.line && !g.w) { g.c = Math.floor(g.c); g.w = 1; }
  });
}
function edCycleCool() {
  const z = edPicked('flip');
  if (!z) { ED.cool = (ED.cool + 1) % ED_COOLS.length; return; }
  const v = edNext(ED_COOLS, z.cool);
  edChange(() => { z.cool = v; });
}
function edCycleSize() {
  const x = edPicked('text');
  if (!x) { ED.tsize = (ED.tsize + 1) % ED_TEXT_SIZES.length; return; }
  const v = edNext(ED_TEXT_SIZES.map(s => s[0]), x.size);
  edChange(() => { x.size = v; });
}
function edCycleShows() {
  const x = edPicked('text');
  if (!x) { ED.tshow = (ED.tshow + 1) % ED_SHOWS.length; return; }
  const o = ED_SHOWS[(ED_SHOWS.findIndex(s => s.min === x.min && s.max === x.max) + 1) % ED_SHOWS.length];
  edChange(() => { delete x.min; delete x.max; Object.assign(x, o); });
}
function edCycleRespawn() {
  const v = edNext(ED_RESPAWNS, ED.crumble);
  edChange(() => { ED.crumble = v; });
}
// R turns the spikes the Spikes tool paints, or else the picked trap spike an eighth of a turn (SHIFT: the other way).
function edTurn(back) {
  const s = edPicked('spike');
  if (ED.tool === 'spikes') { ED.sdir = (ED.sdir + (back ? 3 : 1)) % 4; return; }
  if (s) edChange(() => { s.dir = LK.DIR_NAMES[(LK.dirIndex(s.dir) + (back ? 7 : 1)) % 8]; });
  else { ED.aim = (ED.aim + (back ? 7 : 1)) % 8; setEditorStatus('New trap spikes shoot ' + LK.DIR_NAMES[ED.aim], '#ffdd33'); }
}

// ===== ENTERING / LEAVING =====

function openEditor(rec, returnState) {
  edLoad(rec);
  ED.tool = 'solid';
  ED.preview = false;
  ED.help = false;
  ED.naming = false;
  ED.returnState = returnState || 'customLevels';
  customLevelSession = null;
  setEditorStatus('Editing "' + ED.name + '"', '#88ccff');
  transitionToState('editor');
}

function openEditorForNewLevel() {
  openEditor(createNewCustomLevel('Untitled Level'), 'customLevels');
  ED.unsaved = true; // Never saved yet
  setEditorStatus('New level - build it, then press SAVE', '#88ccff');
}

function saveEditorLevel(silent) {
  if (!ED.map) return false;
  const saved = saveCustomLevel(edRecord());
  if (!saved) return false;
  ED.rec = { id: saved.id, created: saved.created, stats: saved.stats };
  ED.unsaved = false;
  if (!silent) setEditorStatus('Saved "' + saved.level.name + '"', '#88ff88');
  return true;
}

function leaveEditor() {
  if (ED.unsaved) {
    const choice = confirm('You have unsaved changes.\n\nOK = save and leave\nCancel = keep editing');
    if (!choice) return;
    if (!saveEditorLevel(true)) return;
  }
  ED.drag = null;
  transitionToState(ED.returnState);
}

// Esc: the drag, then the trigger step, then the pick, then out.
function edEscape() {
  if (ED.drag) return;
  if (ED.help) ED.help = false;
  else if (ED.step || ED.join) { ED.step = null; ED.join = false; }
  else if (ED.sel) ED.sel = null;
  else leaveEditor();
}

// Test-play the level straight from the editor
function editorTestPlay() {
  if (!ED.map) return;
  const bad = LK.checkLevel(edLevel()).find(p => p.bad);
  if (bad) { setEditorStatus(bad.text, '#ff6666'); return; }
  // Auto-save so a crash or a reload never loses the work being tested
  saveEditorLevel(true);
  ED.drag = null;
  ED.step = null;
  startCustomLevelSession(edRecord(), 'editor');
}

function editorShare() {
  if (!ED.map) return;
  const text = levelShareText(edLevel()), what = text.includes('#lvl=') ? 'link' : 'code';
  copyShareText(text, ok => setEditorStatus(ok ? 'Share ' + what + ' copied - LOAD CODE opens it here, Load from code in the full game' : 'Share ' + what + ' shown', '#88ff88'));
}

function clearEditorLevel() {
  if (!confirm('Clear the whole level?\nThis can still be undone with CTRL+Z.')) return;
  edChange(() => {
    ED.map = ED.map.map(row => row.map(() => '.'));
    ED.traps = [];
    ED.flips = [];
    ED.text = [];
    ED.sel = ED.step = null;
    ED.join = false;
  });
  setEditorStatus('Level cleared', '#ffaa66');
}

// ===== LAYOUT: every button, rebuilt each frame and used for hit tests =====

function edPaletteLayout() {
  const tools = [], heads = [];
  let y = ED_TOPBAR_H + 10;
  for (const g of ED_GROUPS) {
    heads.push({ n: g.n, y: y + 6, col: g.col });
    y += 14;
    g.tools.forEach((id, i) => tools.push({ id, col: g.col, x: 8 + i * 54, y, w: 50, h: 40 }));
    y += 46;
  }
  return { tools, heads, end: y };
}

function buildEditorLayout() {
  const list = [];
  const add = o => { list.push(o); return o; };

  // --- top bar ---
  add({ x: 10, y: 10, w: 88, h: 36, label: '◀ BACK', font: 14, action: leaveEditor });
  add({ x: 106, y: 10, w: 250, h: 36, kind: 'name', action: () => { ED.naming = true; ED.blink = 0; } });
  CUSTOM_VISUAL_STYLES.forEach((style, i) => add({ x: 364 + i * 84, y: 10, w: 80, h: 36, label: style.label, font: 13, active: ED.style === style.id,
    activeColor: '#5b3f8f', borderColor: '#bb88ff', action: () => { if (ED.style !== style.id) { edChange(() => { ED.style = style.id; }); setEditorStatus('Look: ' + style.label, '#cc99ff'); } } }));
  add({ x: 620, y: 10, w: 96, h: 36, label: ED.preview ? 'EDIT VIEW' : 'PREVIEW', font: 13, active: ED.preview, activeColor: '#7a6a1f', borderColor: '#ffdd66',
    action: () => { ED.preview = !ED.preview; } });
  add({ x: 722, y: 10, w: 44, h: 36, label: '?', font: 20, active: ED.help, action: () => { ED.help = !ED.help; } });
  add({ x: 772, y: 10, w: 90, h: 36, label: 'SHARE', font: 14, action: editorShare });
  const blocked = ED.problems.some(p => p.bad);
  add({ x: 868, y: 10, w: 152, h: 36, label: '▶ TEST PLAY', font: 16, active: !blocked, activeColor: '#2f7a3f', borderColor: '#66ff99',
    disabled: blocked, action: editorTestPlay });
  add({ x: 1026, y: 10, w: 164, h: 36, label: ED.unsaved ? 'SAVE •' : 'SAVED', font: 16, active: ED.unsaved, activeColor: '#2f5f9a', borderColor: '#88ccff',
    action: () => saveEditorLevel(false) });

  // --- the palette ---
  const P = edPaletteLayout();
  for (const b of P.tools) add({ x: b.x, y: b.y, w: b.w, h: b.h, icon: b.id, active: ED.tool === b.id, activeColor: '#33334a', borderColor: b.col,
    action: () => edSetTool(b.id) });

  // --- the panel: the picked trap, flip zone or hint, or the tool's settings ---
  let y = ED_PANEL_Y + 26;
  const row = (label, action, o) => { add(Object.assign({ x: 8, y, w: 210, h: 30, label, action, font: 13 }, o || {})); y += 34; };
  const pair = (a, b) => {
    add(Object.assign({ x: 8, y, w: 103, h: 30, font: 12 }, a));
    add(Object.assign({ x: 115, y, w: 103, h: 30, font: 12 }, b));
    y += 34;
  };
  const red = { textColor: '#ff9999' };
  const tp = edSelTrap(), flip = edPicked('flip'), hint = edPicked('text');
  if (tp) {
    const col = edTrapColor(ED.sel.t), sp = edSame(tp.spikes, s => s.speed), dl = edSame(tp.spikes, s => s.delay || 0), tr = tp.triggers;
    const rc = edSame(tp.spikes, s => s.travel || 0), dt = edSame(tp.slides, s => s.time), noS = !tp.spikes.length, noD = !tp.slides.length;
    const tint = { borderColor: col };
    pair(Object.assign({ label: 'Speed: ' + (noS ? '–' : sp == null ? 'mixed' : edSpeedName(sp)), action: edCycleSpeed, disabled: noS }, tint),
      Object.assign({ label: 'Delay: ' + (noS ? '–' : dl == null ? 'mixed' : dl + ' s'), action: edCycleDelay, disabled: noS }, tint));
    pair(Object.assign({ label: 'Reach: ' + (noS ? '–' : rc == null ? 'mixed' : edReachName(rc)), action: edCycleReach, disabled: noS }, tint),
      Object.assign({ label: 'Dash: ' + (noD ? '–' : dt == null ? 'mixed' : dt + ' s'), action: edCycleDash, disabled: noD }, tint));
    pair(Object.assign({ label: 'Trigger: ' + (!tr.length ? 'none' : tr.every(g => g.off) ? 'off' : 'on'), action: edToggleOn, disabled: !tr.length }, tint),
      Object.assign({ label: 'Visible: ' + (!tr.length ? '–' : tr[0].show ? 'yes' : 'no'), action: edToggleShow, disabled: !tr.length }, tint));
    row('New triggers: ' + (ED.line ? 'line' : 'box'), edToggleShape, tint);
    pair(Object.assign({ label: ED.join ? 'Adding…' : '+ Spikes', active: ED.join, activeColor: '#3a3450',
      action: () => { ED.join = !ED.join; ED.step = null; if (ED.join && ED.tool !== 'slide') ED.tool = ED.sel.part === 'slide' ? 'slide' : 'trap'; } }, tint),
      Object.assign({ label: ED.step ? 'Drawing…' : '+ Trigger', active: !!ED.step, activeColor: '#3a3450',
        action: () => { ED.step = ED.step ? null : 'trigger'; ED.join = false; } }, tint));
    pair(Object.assign({ label: 'Delete ' + ED.sel.part, action: edRemoveSelected }, red), Object.assign({ label: 'Delete trap', action: edRemoveTrap }, red));
  } else if (flip) {
    row('Wait between flips: ' + flip.cool + ' s', edCycleCool);
    row('Delete flip zone', edRemoveSelected, red);
  } else if (hint) {
    row('Change the words', () => edWriteText(null));
    row('Size: ' + edSizeName(hint.size), edCycleSize);
    row('Shows: ' + edShowName(hint), edCycleShows);
    row('Delete hint', edRemoveSelected, red);
  } else if (ED.tool === 'trap') {
    pair({ label: 'Speed: ' + LK.SPEED_NAMES[ED.speed], action: edCycleSpeed }, { label: 'Delay: ' + ED_DELAYS[ED.delay] + ' s', action: edCycleDelay });
    row('Reach: ' + edReachName(ED_REACHES[ED.reach]), edCycleReach);
    row('Trigger visible: ' + (ED.show ? 'yes' : 'no'), edToggleShow);
    row('Trigger shape: ' + (ED.line ? 'line' : 'box'), edToggleShape);
  } else if (ED.tool === 'slide') {
    row('Dash: ' + ED_DASHES[ED.dash] + ' s', edCycleDash);
    row('Trigger visible: ' + (ED.show ? 'yes' : 'no'), edToggleShow);
    row('Trigger shape: ' + (ED.line ? 'line' : 'box'), edToggleShape);
  } else if (ED.tool === 'spikes') row('Direction: ' + ['↑ up', '→ right', '↓ down', '← left'][ED.sdir], () => edTurn(false));
  else if (ED.tool === 'flip') row('Wait between flips: ' + ED_COOLS[ED.cool] + ' s', edCycleCool);
  else if (ED.tool === 'text') { row('Size: ' + edSizeName(ED_TEXT_SIZES[ED.tsize][0]), edCycleSize); row('Shows: ' + edShowName(ED_SHOWS[ED.tshow]), edCycleShows); }
  else if (ED.tool === 'crumble') row('Comes back: ' + (ED.crumble ? 'after ' + ED.crumble + ' s' : 'never'), edCycleRespawn);
  ED.panelEnd = y;

  // --- bottom bar ---
  add({ x: 806, y: 684, w: 66, h: 28, label: 'GRID', font: 12, active: ED.grid, action: () => { ED.grid = !ED.grid; } });
  add({ x: 878, y: 684, w: 66, h: 28, label: 'UNDO', font: 12, disabled: !ED.undo.length, action: editorUndo });
  add({ x: 950, y: 684, w: 66, h: 28, label: 'REDO', font: 12, disabled: !ED.redo.length, action: editorRedo });
  add({ x: 1022, y: 684, w: 78, h: 28, label: 'CLEAR', font: 12, textColor: '#ff9999', action: clearEditorLevel });
  add({ x: 1108, y: 684, w: 82, h: 28, label: isFullscreenActive() ? 'WINDOW' : 'FULL', font: 12, active: isFullscreenActive(),
    activeColor: '#2f6f68', borderColor: '#44ddcc', action: toggleFullscreen });

  ED.buttons = list;
  return list;
}

function edButtonAt(x, y) {
  for (let i = ED.buttons.length - 1; i >= 0; i--) {
    const b = ED.buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

// ===== SMALL DRAW HELPERS =====

function edText(s, x, y, px, o) {
  o = o || {};
  ctx.save();
  ctx.font = (o.bold === false ? '' : 'bold ') + px + 'px ' + (o.fam || 'Arial, sans-serif');
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'middle';
  if (o.a != null) ctx.globalAlpha *= o.a;
  if (o.max) { const w = ctx.measureText(s).width; if (w > o.max) ctx.font = (o.bold === false ? '' : 'bold ') + (px * o.max / w) + 'px ' + (o.fam || 'Arial, sans-serif'); }
  ctx.fillStyle = o.color || '#fff';
  ctx.fillText(s, x, y);
  ctx.restore();
}

function edDrawButton(b) {
  const m = ED.mouse;
  const hovered = !b.disabled && m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h;
  let fill = b.active ? (b.activeColor || '#3b5c8f') : '#2e2e38';
  if (b.disabled) fill = '#232329';
  else if (hovered) fill = b.active ? (b.activeColor || '#456ba6') : '#3c3c49';
  ctx.fillStyle = fill;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = b.disabled ? '#333340' : b.active ? (b.borderColor || '#88bbff') : hovered ? '#7a7a8c' : (b.borderColor ? lkRgba(b.borderColor, 0.45) : '#4a4a58');
  ctx.lineWidth = b.active ? 2 : 1;
  ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  if (b.label) edText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, b.font || 15, { align: 'center', color: b.disabled ? '#555560' : (b.textColor || '#e8e8f0'), max: b.w - 8 });
  return hovered;
}

// A small picture of what a tool puts down, in the level's look, size px square.
function edDrawToolIcon(id, x, y, size) {
  const look = LK_LOOK[ED.style];
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  ctx.fillStyle = ED.style === 'paper' ? '#f5f5dc' : ED.style === 'neon' ? '#0d0b20' : '#2a2a2a';
  ctx.fillRect(x, y, size, size);
  ctx.translate(x, y);
  ctx.scale(size / 60, size / 60);
  const ink = ED.style === 'paper' ? '#161616' : '#ffffff';
  const chevrons = (col, dir) => {
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath();
    for (const cy of [20, 38]) { ctx.moveTo(18, cy + 6 * dir); ctx.lineTo(30, cy - 6 * dir); ctx.lineTo(42, cy + 6 * dir); }
    ctx.stroke();
  };
  const door = () => drawStyledDoor({ x: 16, y: 6, width: 28, height: 48 }, look);
  switch (id) {
    case 'select':
      ctx.fillStyle = '#ffcc44';
      ctx.beginPath();
      ctx.moveTo(20, 10); ctx.lineTo(20, 48); ctx.lineTo(30, 38); ctx.lineTo(38, 50); ctx.lineTo(45, 46); ctx.lineTo(37, 34); ctx.lineTo(49, 32);
      ctx.closePath(); ctx.fill();
      break;
    case 'erase':
      ctx.strokeStyle = '#888894'; ctx.lineWidth = 4; ctx.setLineDash([7, 7]);
      ctx.strokeRect(8, 8, 44, 44); ctx.setLineDash([]);
      ctx.strokeStyle = '#ff8899'; ctx.beginPath(); ctx.moveTo(18, 18); ctx.lineTo(42, 42); ctx.moveTo(42, 18); ctx.lineTo(18, 42); ctx.stroke();
      break;
    case 'solid': drawStyledPlatform(6, 6, 48, 48, look, false); break;
    case 'fake':
      drawStyledPlatform(6, 6, 48, 48, look, true); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ff5fd2'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.strokeRect(6, 6, 48, 48); ctx.setLineDash([]);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(30, 16); ctx.lineTo(30, 42); ctx.moveTo(21, 34); ctx.lineTo(30, 44); ctx.lineTo(39, 34); ctx.stroke();
      break;
    case 'invisible':
      ctx.fillStyle = 'rgba(68, 221, 221, 0.22)'; ctx.fillRect(6, 6, 48, 48);
      ctx.strokeStyle = '#44dddd'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.strokeRect(7, 7, 46, 46); ctx.setLineDash([]);
      break;
    case 'crumble':
      drawStyledCrumblingPlatform({ x: 6, y: 6, width: 48, height: 48, state: 'crumbling', timer: 0.4, alpha: 1 }, look);
      break;
    case 'spikes':
      ctx.translate(30, 30); ctx.rotate(LK_SPIKE_ROT['^>v<'[ED.sdir]]);
      drawStyledSpike({ x: -26, y: -8, width: 52, height: 34, moving: false }, look);
      break;
    case 'trap':
      drawStyledPlatform(2, 14, 16, 32, look, false); ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff3355'; ctx.beginPath(); ctx.moveTo(48, 30); ctx.lineTo(20, 18); ctx.lineTo(20, 42); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 3; ctx.setLineDash([4, 4]); ctx.strokeRect(40, 4, 16, 16); ctx.setLineDash([]);
      break;
    case 'slide':
      drawStyledSpike({ x: 4, y: 32, width: 34, height: 24, moving: false }, look); ctx.shadowBlur = 0;
      ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(30, 16); ctx.lineTo(52, 16); ctx.moveTo(44, 8); ctx.lineTo(53, 16); ctx.lineTo(44, 24); ctx.stroke();
      break;
    case 'gravityUp':
    case 'gravityDown': {
      const up = id === 'gravityUp', col = up ? '#44ddff' : '#ff44dd';
      ctx.fillStyle = lkRgba(col, 0.25); ctx.fillRect(14, 0, 32, 60);
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(14, 60); ctx.moveTo(46, 0); ctx.lineTo(46, 60); ctx.stroke();
      chevrons(col, up ? 1 : -1);
      break;
    }
    case 'flip':
      ctx.fillStyle = 'rgba(68,221,255,.25)'; ctx.fillRect(6, 6, 24, 48);
      ctx.fillStyle = 'rgba(255,68,221,.25)'; ctx.fillRect(30, 6, 24, 48);
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.strokeRect(6, 6, 48, 48); ctx.setLineDash([]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#44ddff'; ctx.beginPath(); ctx.moveTo(18, 44); ctx.lineTo(18, 16); ctx.moveTo(11, 24); ctx.lineTo(18, 15); ctx.lineTo(25, 24); ctx.stroke();
      ctx.strokeStyle = '#ff44dd'; ctx.beginPath(); ctx.moveTo(42, 16); ctx.lineTo(42, 44); ctx.moveTo(35, 36); ctx.lineTo(42, 45); ctx.lineTo(49, 36); ctx.stroke();
      break;
    case 'start': drawPlayer(12, 12, 36, 36); break;
    case 'door': door(); break;
    case 'decoy':
      door(); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ff3355'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(12, 14); ctx.lineTo(48, 50); ctx.moveTo(48, 14); ctx.lineTo(12, 50); ctx.stroke();
      break;
    case 'text':
      edText('Aa', 30, 30, 28, { align: 'center', color: ink });
      ctx.strokeStyle = lkRgba(ED.style === 'paper' ? '#161616' : '#ffffff', 0.5); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(10, 50); ctx.lineTo(50, 50); ctx.stroke();
      break;
  }
  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
}

function edWrapText(text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      lines++;
      line = words[i];
      if (maxLines && lines >= maxLines) return;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y + lines * lineHeight);
}

// ===== MAIN DRAW =====

function drawEditor() {
  if (!ED.map) return;
  if (ED.dirty || !ED.lv) {
    ED.lv = edLevel();
    ED.L = LK.buildLevel(ED.lv);
    ED.problems = LK.checkLevel(ED.lv);
    ED.dirty = false;
  }
  buildEditorLayout();

  // Editor chrome background
  ctx.fillStyle = '#16161d';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  drawEditorMap();
  drawEditorTopBar();
  drawEditorPalette();
  drawEditorBottomBar();

  if (ED.help) drawEditorHelpOverlay();
}

// --- the level itself, drawn by the code that plays it, and over it the traps and what is being dragged ---
function drawEditorMap() {
  const t = ED.time, paper = ED.style === 'paper', trapColor = i => edTrapColor(i, paper);
  ctx.save();
  ctx.beginPath();
  ctx.rect(ED_GRID_X, ED_GRID_Y, ED_GRID_W, ED_GRID_H);
  ctx.clip();
  ctx.translate(ED_GRID_X, ED_GRID_Y);
  ctx.scale(ED_SCALE, ED_SCALE);

  drawLevelScene(ED.L, ED.lv, ED.style, t, ED.preview ? { deaths: 0 } : { edit: true, trapColor });
  if (ED.lv.start) {                                    // the square, on its start
    const sp = ED.L.spawn;
    ctx.globalAlpha = 0.85;
    drawPlayer(sp.x, sp.y, LK.PHYS.size, LK.PHYS.size);
    ctx.globalAlpha = 1;
  }

  if (!ED.preview) {
    if (ED.grid) {
      ctx.strokeStyle = paper ? 'rgba(22,22,22,.12)' : 'rgba(255,255,255,.08)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let c = 1; c < LK.COLS; c++) { ctx.moveTo(c * LK.TILE, 0); ctx.lineTo(c * LK.TILE, LK.H); }
      for (let r = 1; r < LK.ROWS; r++) { ctx.moveTo(0, r * LK.TILE); ctx.lineTo(LK.W, r * LK.TILE); }
      ctx.stroke();
    }
    edDrawHintNotes();
    edDrawTraps(t);
    edDrawDrag(t);
    if (ED.hover && !ED.drag && !ED.help) {
      const g = ED_GROUPS.find(o => o.tools.includes(ED.tool));
      ctx.strokeStyle = paper && g.n === 'EDIT' ? '#161616' : g.col;
      ctx.lineWidth = 4;
      ctx.strokeRect(ED.hover.c * LK.TILE + 2, ED.hover.r * LK.TILE + 2, LK.TILE - 4, LK.TILE - 4);
    }
  }
  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);

  // Frame around the play area
  ctx.strokeStyle = '#4a4a58';
  ctx.lineWidth = 2;
  ctx.strokeRect(ED_GRID_X - 1, ED_GRID_Y - 1, ED_GRID_W + 2, ED_GRID_H + 2);

  if (ED.preview) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(ED_GRID_X + ED_GRID_W / 2 - 160, ED_GRID_Y + 8, 320, 30);
    edText('PREVIEW - what the player sees (TAB)', ED_GRID_X + ED_GRID_W / 2, ED_GRID_Y + 23, 16, { align: 'center', color: '#ffdd66' });
  }
}

// Under each hint that waits for deaths (drawn faint), when it shows.
function edDrawHintNotes() {
  for (const x of ED.text) {
    if (x.min == null && x.max == null) continue;
    edText('shows ' + edShowName(x), x.x, x.y + (x.size || 60) * 0.5 + 18, 26, { align: 'center', color: ED.style === 'paper' ? '#161616' : '#ffcc33' });
  }
}

function edTrapBadge(x, y, col, n) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x + 16, y + 16, 16, 0, Math.PI * 2);
  ctx.fill();
  edText(String(n), x + 16, y + 17, 22, { align: 'center', color: '#0a0c20' });
  ctx.restore();
}

// A trap spike, which the game hides until its trap fires: a ghost in its trap's color, with the trap's number. A spike
// with a reach (travel) gets a line as long as its flight, with a bar where it stops.
function edDrawTrapGhost(s, col, a, t, n) {
  const T = LK.TILE, d = LK.dirIndex(s.dir), dx = LK.DIRS[d][0], dy = LK.DIRS[d][1], m = Math.max(Math.abs(dx), Math.abs(dy));
  const cx = s.c * T + 30, cy = s.r * T + 30, len = s.travel ? 30 / m + s.travel * T : 150, ex = cx + dx * len, ey = cy + dy * len;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = col;
  ctx.setLineDash([8, 7]);
  ctx.lineDashOffset = -t * 40;
  ctx.lineWidth = 4;
  ctx.strokeRect(s.c * T + 3, s.r * T + 3, 54, 54);
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.setLineDash([]);
  if (s.travel) { ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ex - dy * 16, ey + dx * 16); ctx.lineTo(ex + dy * 16, ey - dx * 16); ctx.stroke(); }
  const sp = LK.Spike(cx + dx * 26 / m, cy + dy * 26 / m, dx, dy, { len: 44, wid: 36 });
  ctx.fillStyle = '#ff4d6d';
  ctx.beginPath(); lkTriPath(sp, 0); ctx.fill();
  const tag = (s.speed <= 150 ? 'C' : s.speed <= 900 ? 'F' : 'S') + (s.delay ? ' +' + s.delay : '');
  edText(tag, s.c * T + 30, s.r * T + 50, 22, { align: 'center', color: '#fff' });
  if (n != null) edTrapBadge(s.c * T + 2, s.r * T + 2, col, n);
  ctx.restore();
}

// Sliding spikes (the game draws the strip itself, in plain sight): an arrow in its trap's color to where they dash, an
// outline there, and the dash's time.
function edDrawSlideGhost(s, col, a, t, n) {
  const T = LK.TILE, [x0, y0] = edSlideMid(s), x1 = x0 + s.move[0] * T, y1 = y0 + s.move[1] * T, ang = Math.atan2(y1 - y0, x1 - x0);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = col;
  ctx.setLineDash([8, 7]);
  ctx.lineDashOffset = -t * 40;
  ctx.lineWidth = 4;
  ctx.strokeRect((s.c + s.move[0]) * T + 3, (s.r + s.move[1]) * T + 3, 54, 54);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x1, y1);
  for (const k of [-1, 1]) ctx.lineTo(x1 - Math.cos(ang + k * 0.45) * 26, y1 - Math.sin(ang + k * 0.45) * 26);
  ctx.fill();
  edText(s.time + ' s', s.c * T + 44, s.r * T + 14, 20, { align: 'center', color: '#fff' });
  if (n != null) edTrapBadge(s.c * T + 2, s.r * T + 2, col, n);
  ctx.restore();
}

// Every trap's parts, lines from each trigger to each spike (the picked trap's bold), triggers that are off; then the
// pick (a trap's part, a flip zone or a hint).
function edDrawTraps(t) {
  const paper = ED.style === 'paper', pick = ED.sel && ED.sel.t != null ? ED.sel.t : -1;
  ED.traps.forEach((tp, i) => {
    const col = edTrapColor(i, paper), on = i === pick, a = pick < 0 || on ? 1 : 0.45;
    ctx.save();
    ctx.lineWidth = on ? 5 : 3;
    ctx.globalAlpha = on ? 0.95 : 0.35;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -t * 30;
    for (const g of tp.triggers) {
      ctx.strokeStyle = g.off ? '#8a93c0' : col;
      ctx.beginPath();
      const [x, y] = edTrigCenter(g);
      for (const [sx, sy] of tp.spikes.map(edSpikeMid).concat(tp.slides.map(edSlideMid))) { ctx.moveTo(x, y); ctx.lineTo(sx, sy); }
      ctx.stroke();
    }
    ctx.restore();
    for (const g of tp.triggers) {
      const r = edTrigRect(g);
      if (g.off) {                                                       // kept, but it never fires
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#8a93c0';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 9]);
        ctx.beginPath();
        if (r.w) ctx.rect(r.x, r.y, r.w, r.h); else { ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.y + r.h); }
        ctx.stroke();
        ctx.restore();
        edText('off', r.x + (r.w ? r.w / 2 : 0), r.y + r.h / 2, 28, { align: 'center', color: '#8a93c0' });
      }
      edTrapBadge(r.x - (r.w ? 0 : 16), r.y + 2, g.off ? '#8a93c0' : col, i + 1);
    }
    for (const s of tp.spikes) edDrawTrapGhost(s, col, 0.9 * a, t, i + 1);
    for (const s of tp.slides) edDrawSlideGhost(s, col, 0.9 * a, t, i + 1);
  });
  const part = edPartOf(ED.sel);
  if (!part) return;
  const ink = paper ? '#161616' : '#ffffff';                            // the pick: white, or ink on the sketch page
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 4;
  ctx.shadowColor = ink;
  ctx.shadowBlur = paper ? 0 : 10;
  if (ED.sel.part === 'spike' || ED.sel.part === 'slide') ctx.strokeRect(part.c * LK.TILE - 3, part.r * LK.TILE - 3, 66, 66);
  else if (ED.sel.part === 'text') { const b = edTextBox(part); ctx.strokeRect(b.x, b.y, b.w, b.h); }
  else if (ED.sel.part === 'flip') {
    const x = part.c * LK.TILE, y = part.r * LK.TILE, w = part.w * LK.TILE, h = part.h * LK.TILE;
    ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillRect(x + w - 12, y + h - 12, 24, 24);                       // drag to size it
  } else {
    const r = edTrigRect(part), hx = r.x + r.w, hy = r.y + r.h;
    if (r.w) ctx.strokeRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6); else ctx.strokeRect(r.x - 12, r.y - 3, 24, r.h + 6);
    ctx.fillRect(hx - 12, hy - 12, 24, 24);                             // drag to size it
  }
  ctx.restore();
}

// What a drag will make: an aimed spike, a trigger, a dash, a rectangle.
function edDrawDrag(t) {
  const d = ED.drag, T = LK.TILE, paper = ED.style === 'paper';
  if (!d) return;
  const nextColor = () => edTrapColor(ED.join && edSelTrap() ? ED.sel.t : ED.traps.length, paper);
  if (d.kind === 'aim') {
    const col = d.spike ? edTrapColor(d.spike.t, paper) : nextColor();
    const travel = d.spike ? edPartOf(d.spike).travel : ED_REACHES[ED.reach];
    edDrawTrapGhost({ c: d.c, r: d.r, dir: d.dir, speed: LK.SPEEDS[ED.speed], delay: ED_DELAYS[ED.delay], travel }, col, 1, t);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i === d.dir ? '#ff3355' : 'rgba(255,255,255,.45)';
      ctx.beginPath();
      ctx.arc(d.c * T + 30 + LK.DIRS[i][0] * 120, d.r * T + 30 + LK.DIRS[i][1] * 120, i === d.dir ? 12 : 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (d.kind === 'trig') {
    const q = edRectOf(d), col = ED.sel ? edTrapColor(ED.sel.t, paper) : '#ffffff';
    const x = ED.line ? (d.c0 + 0.5) * T : q.c * T, w = ED.line ? 0 : q.w * T;
    ctx.save();
    ctx.strokeStyle = col;
    ctx.fillStyle = lkRgba(col, 0.12);
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 5;
    if (w) { ctx.fillRect(x, q.r * T, w, q.h * T); ctx.strokeRect(x, q.r * T, w, q.h * T); }
    else { ctx.beginPath(); ctx.moveTo(x, q.r * T); ctx.lineTo(x, (q.r + q.h) * T); ctx.stroke(); }
    ctx.restore();
  }
  if (d.kind === 'dash') {
    const col = d.slide ? edTrapColor(d.slide.t, paper) : nextColor();
    edDrawSlideGhost({ c: d.c, r: d.r, move: [d.c1 - d.c, d.r1 - d.r], time: d.slide ? edPartOf(d.slide).time : ED_DASHES[ED.dash] }, col, 1, t);
  }
  if (d.kind === 'rect' || d.kind === 'flipRect') {
    const q = edRectOf(d);
    ctx.save();
    ctx.strokeStyle = d.erase ? '#ff3355' : '#ffffff';
    ctx.fillStyle = d.erase ? 'rgba(255,51,85,.15)' : 'rgba(255,255,255,.12)';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 4;
    ctx.fillRect(q.c * T, q.r * T, q.w * T, q.h * T);
    ctx.strokeRect(q.c * T, q.r * T, q.w * T, q.h * T);
    ctx.restore();
    edText(q.w + ' × ' + q.h, (q.c + q.w / 2) * T, (q.r + q.h / 2) * T, 40, { align: 'center', color: '#fff' });
  }
}

// --- top bar ---
function drawEditorTopBar() {
  ctx.fillStyle = '#20202a';
  ctx.fillRect(0, 0, GAME_WIDTH, ED_TOPBAR_H);
  ctx.strokeStyle = '#33333f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, ED_TOPBAR_H - 0.5);
  ctx.lineTo(GAME_WIDTH, ED_TOPBAR_H - 0.5);
  ctx.stroke();

  for (const b of ED.buttons) {
    if (b.y >= ED_TOPBAR_H) continue;
    if (b.kind !== 'name') { edDrawButton(b); continue; }
    // Level name field (click to rename, typed straight on the canvas)
    ctx.fillStyle = ED.naming ? '#1b2a3d' : '#26262f';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = ED.naming ? '#66aaff' : '#4a4a58';
    ctx.lineWidth = ED.naming ? 2 : 1;
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x + 6, b.y, b.w - 12, b.h);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(ED.name, b.x + 10, b.y + 24);
    if (ED.naming && ED.blink < 0.5) ctx.fillRect(b.x + 12 + ctx.measureText(ED.name).width, b.y + 8, 2, 20);
    ctx.restore();
    if (!ED.naming) edText('rename', b.x + b.w - 8, b.y + 22, 11, { align: 'right', color: '#6f6f80', bold: false });
  }
}

// --- left column: the palette, and the panel under it ---
function drawEditorPalette() {
  ctx.fillStyle = '#1b1b23';
  ctx.fillRect(0, ED_TOPBAR_H, ED_PALETTE_W, GAME_HEIGHT - ED_TOPBAR_H);
  ctx.strokeStyle = '#33333f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ED_PALETTE_W - 0.5, ED_TOPBAR_H);
  ctx.lineTo(ED_PALETTE_W - 0.5, GAME_HEIGHT);
  ctx.stroke();

  const P = edPaletteLayout();
  for (const h of P.heads) edText(h.n, 10, h.y, 11, { color: lkRgba(h.col, 0.8) });
  for (const b of ED.buttons) {
    if (!b.icon) continue;
    edDrawButton(b);
    edDrawToolIcon(b.icon, b.x + 7, b.y + 4, 32);
    edText(ED_TOOLS[b.icon].key, b.x + b.w - 3, b.y + b.h - 7, 9, { align: 'right', color: b.active ? '#c8cce0' : '#6f6f80' });
  }

  // the panel's title: the picked trap (and what it has), flip zone or hint, or else the tool in use
  const y = ED_PANEL_Y + 10, tp = edSelTrap(), many = (n, s) => n + ' ' + s + (n === 1 ? '' : 's');
  if (tp) {
    edText('TRAP ' + (ED.sel.t + 1), 10, y, 15, { color: edTrapColor(ED.sel.t) });
    const has = [tp.spikes.length || !tp.slides.length ? many(tp.spikes.length, 'spike') : '', tp.slides.length ? many(tp.slides.length, 'slide') : '',
      many(tp.triggers.length, 'trigger')];
    edText(has.filter(Boolean).join(' · '), 218, y, 11, { align: 'right', color: '#8a8a9c', bold: false, max: 140 });
  } else if (edPicked('flip') || edPicked('text')) {
    edText(edPicked('flip') ? 'FLIP ZONE' : 'HINT TEXT', 10, y, 15, { color: '#ffffff' });
  } else {
    const g = ED_GROUPS.find(o => o.tools.includes(ED.tool));
    edText(ED_TOOLS[ED.tool].n.toUpperCase(), 10, y, 15, { color: g.col });
  }
  for (const b of ED.buttons) if (!b.icon && b.y >= ED_PANEL_Y && b.x < ED_PALETTE_W) edDrawButton(b);

  // Contextual tip for the active tool, under the panel
  ctx.fillStyle = '#8a8a9c';
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  edWrapText(ED_TOOLS[ED.tool].hint, 10, ED.panelEnd + 14, ED_PALETTE_W - 20, 15, Math.max(1, Math.floor((GAME_HEIGHT - 8 - ED.panelEnd - 14) / 15) + 1));
}

// --- bottom status bar ---
function drawEditorBottomBar() {
  ctx.fillStyle = '#20202a';
  ctx.fillRect(ED_PALETTE_W, ED_BOTTOM_Y, GAME_WIDTH - ED_PALETTE_W, GAME_HEIGHT - ED_BOTTOM_Y);
  for (const b of ED.buttons) if (b.y >= ED_BOTTOM_Y && b.x >= ED_PALETTE_W) edDrawButton(b);

  const x = ED_PALETTE_W + 14, tp = edSelTrap();
  // Line 1: a toast, else the picked trap in numbers, else what is wrong with the level
  if (ED.statusT > 0 && ED.status) {
    edText(ED.status, x, ED_BOTTOM_Y + 20, 15, { color: ED.statusColor, max: 950 });
  } else if (tp) {
    const sp = tp.spikes, parts = ['TRAP ' + (ED.sel.t + 1)];
    if (sp.length) parts.push(sp.length + ' spike' + (sp.length === 1 ? '' : 's') + ' · ' + (edSame(sp, s => s.speed) != null ? edSpeedName(sp[0].speed) : 'mixed speeds')
      + ' · reach ' + (edSame(sp, s => s.travel || 0) != null ? edReachName(sp[0].travel || 0) : 'mixed'));
    if (tp.slides.length) parts.push(tp.slides.length + ' sliding · dash ' + (edSame(tp.slides, s => s.time) != null ? tp.slides[0].time + ' s' : 'mixed'));
    parts.push(!tp.triggers.length ? 'no trigger yet' : tp.triggers.length + ' trigger' + (tp.triggers.length === 1 ? '' : 's')
      + (tp.triggers.every(g => g.off) ? ' (off)' : tp.triggers[0].show ? ' (visible)' : ' (hidden)'));
    edText(parts.join('  •  '), x, ED_BOTTOM_Y + 20, 14, { color: edTrapColor(ED.sel.t), max: 950 });
  } else {
    const bad = ED.problems.find(p => !(ED.step && ED.sel && new RegExp('^Trap ' + (ED.sel.t + 1) + ' ').test(p.text)));
    if (bad) edText('⚠ ' + bad.text, x, ED_BOTTOM_Y + 20, 14, { color: bad.bad ? '#ff6666' : '#ffbb55', max: 950 });
    else edText('✓ Level is playable - press TEST PLAY', x, ED_BOTTOM_Y + 20, 14, { color: '#66cc88' });
  }

  // Lines 2-3: what the tool under the mouse does, or what happens next
  const m = ED.mouse, over = ED.buttons.find(b => b.icon && m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h);
  const hint = over ? ED_TOOLS[over.icon].n + ' (' + ED_TOOLS[over.icon].key + '): ' + ED_TOOLS[over.icon].hint
    : ED.step && tp ? 'Trap ' + (ED.sel.t + 1) + ': drag the trigger that fires it. Right-click or ESC: no trigger for now.'
    : ED.join && tp ? 'Place trap spikes or sliding spikes to add them to trap ' + (ED.sel.t + 1) + ': they fire together. ESC when done.'
    : ED_TOOLS[ED.tool].n + ': ' + ED_TOOLS[ED.tool].hint;
  ctx.fillStyle = '#b8bcd8';
  ctx.font = '13px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  edWrapText(hint, x, ED_BOTTOM_Y + 46, 950, 17, 2);
  edText('Right click erases  |  SHIFT+drag = rectangle  |  CTRL+Z undo  |  ENTER test  |  ? help', x, 698, 12, { color: '#8a8a9c', bold: false, max: 560 });
}

// --- help overlay ---
function drawEditorHelpOverlay() {
  ctx.fillStyle = 'rgba(8, 7, 13, 0.86)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const boxX = 110, boxY = 24, boxW = 980, boxH = 672;
  if (typeof uiCard === 'function') {
    ctx.save();
    ctx.shadowColor = '#8c44ff';
    ctx.shadowBlur = 24;
    uiCard(boxX, boxY, boxW, boxH, { fill: 'rgba(18, 16, 27, 0.97)', border: '#8c44ff', lineWidth: 3, scan: true });
    ctx.restore();
  } else {
    ctx.fillStyle = '#12101b';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#8c44ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
  }

  ctx.fillStyle = '#9844ff';
  ctx.font = 'bold 30px Impact, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('LEVEL EDITOR HELP', GAME_WIDTH / 2, boxY + 40);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(boxX + 40, boxY + 54, boxW - 80, 1);

  const sections = [
    ['BUILDING', [
      'Left click / drag ....... paint with the selected tool',
      'Right click / drag ...... erase (works with any tool)',
      'SHIFT + drag ............ fill (or erase) a whole rectangle',
      'TAB ..................... preview exactly what the player sees',
      'Levels are the full game’s size: 32 x 18 tiles'
    ]],
    ['TRAPS', [
      'Trap spike (T) .......... press a tile, drag to aim it, then drag its trigger',
      'Sliding spikes (L) ...... press a tile, drag to where they dash, then the trigger',
      'SELECT (V) .............. click a spike or trigger to pick its trap',
      'Drag a picked part ...... move it; drag the square corner to size a trigger',
      'Panel ................... speed, delay, reach, dash, trigger on / visible,',
      '                          + Spikes (they fire together), + Trigger',
      'R / SHIFT+R ............. turn the picked trap spike (or the Spikes tool)',
      'Arrow keys .............. move the picked trigger, flip zone or hint',
      'ALT + arrows ............ size the picked trigger or flip zone',
      'DELETE .................. remove what is picked'
    ]],
    ['TOOLS', [
      'V select  X erase   B solid   F fake   I invisible  C crumble',
      'K spikes  T trap    L sliding U up     N down       G flip zone',
      'S start   D door    O decoy   H hint text'
    ]],
    ['LEVEL', [
      'CTRL+Z / CTRL+Y ......... undo / redo          CTRL+S ... save',
      'SHIFT+F ................. fullscreen (or the FULL button, bottom right)',
      'ENTER ................... test play            ESC ...... back'
    ]]
  ];

  ctx.textAlign = 'left';
  let y = boxY + 80;
  sections.forEach(([title, lines]) => {
    ctx.fillStyle = '#ffcc44';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText(title, boxX + 40, y);
    y += 19;
    ctx.fillStyle = '#c8c8d6';
    ctx.font = '13px monospace';
    lines.forEach(line => {
      ctx.fillText(line, boxX + 52, y);
      y += 17;
    });
    y += 7;
  });

  ctx.fillStyle = '#8a8a9c';
  ctx.font = '14px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Click anywhere or press ? / ESC to close', GAME_WIDTH / 2, boxY + boxH - 16);
  ctx.textAlign = 'left';
}

// ===== PER-FRAME UPDATE =====
function updateEditor(deltaTime) {
  ED.blink = (ED.blink + deltaTime) % 1;
  ED.time += deltaTime;
  if (ED.statusT > 0) ED.statusT -= deltaTime;
}

// ===== MOUSE INPUT =====

function editorMouseDown(x, y, button, event) {
  if (!ED.map) return;
  ED.shift = event.shiftKey;
  ED.alt = event.altKey;

  if (ED.help) {
    ED.help = false;
    return;
  }

  buildEditorLayout();
  const btn = edButtonAt(x, y);

  // Clicking anywhere else finishes renaming
  if (ED.naming && (!btn || btn.kind !== 'name')) {
    ED.naming = false;
    ED.name = sanitizeLevelName(ED.name);
  }

  if (btn) {
    if (button === 0 && !btn.disabled) btn.action();
    return;
  }
  if (button !== 0 && button !== 2) return;
  edDown(x, y, button === 2, event.shiftKey);
}

function editorMouseMove(x, y, event) {
  if (!ED.map) return;
  ED.shift = event.shiftKey;
  ED.alt = event.altKey;
  ED.mouse.x = x;
  ED.mouse.y = y;
  edMove(x, y);
}

function editorMouseUp() {
  if (!ED.map || !ED.drag) return;
  edUp();
}

// ===== KEYBOARD INPUT =====

function editorHandleNameKey(e) {
  if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
    ED.naming = false;
    ED.name = sanitizeLevelName(ED.name);
    ED.unsaved = true;
    ED.dirty = true;
    e.preventDefault();
    return;
  }
  if (e.key === 'Backspace') {
    ED.name = ED.name.slice(0, -1);
    ED.unsaved = true;
    e.preventDefault();
    return;
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && ED.name.length < 32) {
    ED.name += e.key;
    ED.unsaved = true;
    e.preventDefault();
  }
}

// Arrow keys: the picked trigger, flip zone or hint moves (ALT: a trigger or flip zone changes size).
function edNudge(dx, dy, resize) {
  const s = ED.sel, part = edPartOf(s);
  if (!part || s.part === 'spike' || s.part === 'slide') return false;
  const clamp = LK.clamp;
  edChange(() => {
    if (s.part === 'text') { part.x = clamp(part.x + dx * 10, 0, LK.W); part.y = clamp(part.y + dy * 10, 0, LK.H); return; }
    if (resize) {
      if (part.w) part.w = clamp(part.w + dx, 1, LK.COLS - Math.floor(part.c));
      part.h = clamp(part.h + dy, 1, LK.ROWS - Math.floor(part.r));
      return;
    }
    part.c = clamp(part.c + dx, part.w || s.part === 'flip' ? 0 : 0.5, LK.COLS - (part.w || 0.5));
    part.r = clamp(part.r + dy, 0, LK.ROWS - part.h);
  });
  return true;
}

function editorKeyDown(e) {
  if (!ED.map) return;
  ED.shift = e.shiftKey;
  ED.alt = e.altKey;

  if (ED.naming) {
    editorHandleNameKey(e);
    return;
  }

  const ctrl = e.ctrlKey || e.metaKey;

  if (ctrl && e.code === 'KeyZ') {
    e.preventDefault();
    if (e.shiftKey) editorRedo(); else editorUndo();
    return;
  }
  if (ctrl && e.code === 'KeyY') {
    e.preventDefault();
    editorRedo();
    return;
  }
  if (ctrl && e.code === 'KeyS') {
    e.preventDefault();
    saveEditorLevel(false);
    return;
  }
  if (ctrl) return; // Leave the rest of the browser shortcuts alone

  if (e.key === '?' || e.code === 'F1') {
    e.preventDefault();
    ED.help = !ED.help;
    return;
  }

  if (e.code === 'Escape') {
    e.preventDefault();
    edEscape();
    return;
  }
  if (ED.help) return;

  if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    e.preventDefault();
    editorTestPlay();
    return;
  }

  if (e.code === 'Tab') {
    e.preventDefault();
    ED.preview = !ED.preview;
    return;
  }

  if (e.code === 'Delete' || e.code === 'Backspace') {
    e.preventDefault();
    edRemoveSelected();
    return;
  }

  const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (arrows[e.code]) {
    e.preventDefault();
    edNudge(arrows[e.code][0], arrows[e.code][1], e.altKey);
    return;
  }

  if (e.code === 'KeyR') {
    edTurn(e.shiftKey);
    return;
  }

  // SHIFT+F : fullscreen (plain F is the FAKE block tool)
  if (e.shiftKey && e.code === 'KeyF') {
    e.preventDefault();
    toggleFullscreen();
    return;
  }

  // Tool shortcuts
  const id = ED_TOOL_ORDER.find(k => 'Key' + ED_TOOLS[k].key === e.code);
  if (id) edSetTool(id);
}
