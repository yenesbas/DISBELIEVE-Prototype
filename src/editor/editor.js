/*
 * EDITOR.JS - The in-game level editor
 *
 * Everything is edited directly on the map: you paint tiles with the mouse and
 * you shape a spike's trap by DRAGGING it - the ghost shows where the spike
 * will shoot to, the vertical line is its trigger, and the round handle on the
 * end of that line is how long the trigger is. No number boxes anywhere.
 *
 * The editor draws the level with the real game renderers, so what you build
 * is exactly what you play.
 */

// ===== LAYOUT =====
const ED_TOPBAR_H = 56;      // Level name / style / test / save
const ED_PALETTE_W = 190;    // Tool column on the left
const ED_BOTTOM_Y = 676;     // Status + hint bar starts here
const ED_TILE = 50;          // On-screen size of one tile inside the editor
const ED_GRID_X = 195;
const ED_GRID_Y = 66;
const ED_SCALE = ED_TILE / TILE_SIZE; // World (60px tiles) -> editor pixels
const ED_GRID_W = EDITOR_COLS * ED_TILE;
const ED_GRID_H = EDITOR_ROWS * ED_TILE;

// ===== TOOLS =====
const EDITOR_TOOLS = [
  { id: 'select',    label: 'SELECT',  key: 'V', keyCode: 'KeyV', char: null, color: '#ffcc44' },
  { id: 'block',     label: 'SOLID',   key: 'B', keyCode: 'KeyB', char: '#',  color: '#888888' },
  { id: 'fake',      label: 'FAKE',    key: 'F', keyCode: 'KeyF', char: 'F',  color: '#ff66cc' },
  { id: 'invisible', label: 'HIDDEN',  key: 'I', keyCode: 'KeyI', char: 'I',  color: '#44dddd' },
  { id: 'crumble',   label: 'CRUMBLE', key: 'C', keyCode: 'KeyC', char: 'E',  color: '#ddaa55' },
  { id: 'spike',     label: 'SPIKE',   key: 'K', keyCode: 'KeyK', char: null, color: '#ff4455' },
  { id: 'gravity',   label: 'GRAVITY', key: 'G', keyCode: 'KeyG', char: 'G',  color: '#8c66ff' },
  { id: 'spawn',     label: 'SPAWN',   key: 'S', keyCode: 'KeyS', char: 'S',  color: '#44aaff' },
  { id: 'door',      label: 'DOOR',    key: 'D', keyCode: 'KeyD', char: 'D',  color: '#44ff88' },
  { id: 'erase',     label: 'ERASER',  key: 'X', keyCode: 'KeyX', char: '.',  color: '#666666' }
];

const EDITOR_TOOL_HINTS = {
  select: 'SELECT: click a spike to tune it by dragging. Also drags SPAWN and DOOR.',
  block:  'SOLID: normal platform. Drag to paint, hold SHIFT for a rectangle.',
  fake:   'FAKE: looks solid, player falls straight through it.',
  invisible: 'HIDDEN: solid but completely invisible while playing.',
  crumble: 'CRUMBLE: breaks away shortly after the player stands on it.',
  spike:  'SPIKE: click to place. It is selected at once, ready to drag.',
  gravity: 'GRAVITY: paint a zone. Connected tiles become one flip zone.',
  spawn:  'SPAWN: where the player starts. Only one per level.',
  door:   'DOOR: the exit. Only one per level.',
  erase:  'ERASER: click or drag to clear tiles. Right-click erases with any tool.'
};

// Default trigger offset used by the game when a level defines none.
const ED_DEFAULT_TRIGGER = -0.5;

// ===== EDITOR STATE =====
let editorDoc = null;              // Working copy: { id, name, visualStyle, grid, spikeMeta, ... }
let editorTool = 'block';
let editorSpikeDistance = 2;       // Tiles a newly placed spike will travel
let editorSelectedSpike = null;    // { row, col } of the spike being tuned
let editorDrag = null;             // Active mouse drag description
let editorUndoStack = [];
let editorRedoStack = [];
let editorDirty = false;           // Unsaved changes?
let editorNameEditing = false;
let editorPreviewMode = false;     // Hide editor overlays to see the real level
let editorShowGrid = true;
let editorShowHelp = false;
let editorReturnState = 'customLevels';
let editorStatusText = '';
let editorStatusColor = '#88ff88';
let editorStatusTimer = 0;
let editorBlink = 0;
let editorHoverCell = null;
let editorButtons = [];            // Rebuilt every frame, used for click hit-tests
let editorMouse = { x: 0, y: 0 };
let editorModifiers = { shift: false, alt: false, ctrl: false };

const ED_MAX_UNDO = 60;

// ===== MODEL: level file <-> editor document =====

function spikeKey(row, col) {
  return row + ',' + col;
}

function isSpikeChar(char) {
  return /^[0-9]$/.test(char) || char === '^';
}

// Walk the grid in the exact order parseLevel() does, so spike indices in
// spikeTriggers / spikeTriggerLengths always line up with the right spike.
function forEachSpikeInOrder(grid, callback) {
  let index = 0;
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (isSpikeChar(grid[row][col])) {
        callback(row, col, index, grid[row][col]);
        index++;
      }
    }
  }
}

// Stored level -> editable document
function levelToEditorDoc(level) {
  const grid = sanitizeLevelMap(level.map).map(row => row.split(''));
  const spikeMeta = {};

  forEachSpikeInOrder(grid, (row, col, index, char) => {
    // '^' is the legacy 2-tile spike; normalise it to a digit
    if (char === '^') grid[row][col] = '2';

    const trigger = level.spikeTriggers && level.spikeTriggers[index] !== undefined
      ? Number(level.spikeTriggers[index])
      : ED_DEFAULT_TRIGGER;

    const rawLength = level.spikeTriggerLengths ? level.spikeTriggerLengths[index] : undefined;
    const length = (rawLength === undefined || rawLength === null || rawLength === 0)
      ? null
      : Number(rawLength);

    spikeMeta[spikeKey(row, col)] = {
      trigger: isFinite(trigger) ? trigger : ED_DEFAULT_TRIGGER,
      length: (length !== null && isFinite(length)) ? length : null
    };
  });

  return {
    id: level.id,
    name: level.name,
    visualStyle: level.visualStyle || 'default',
    created: level.created,
    stats: level.stats,
    grid: grid,
    spikeMeta: spikeMeta
  };
}

// Editable document -> stored level (same format the chapters use)
function editorDocToLevel(doc) {
  const triggers = [];
  const lengths = [];

  forEachSpikeInOrder(doc.grid, (row, col) => {
    const meta = doc.spikeMeta[spikeKey(row, col)] || { trigger: ED_DEFAULT_TRIGGER, length: null };
    triggers.push(meta.trigger);
    lengths.push(meta.length);
  });

  return {
    id: doc.id,
    name: doc.name,
    visualStyle: doc.visualStyle,
    map: doc.grid.map(row => row.join('')),
    spikeTriggers: triggers,
    spikeTriggerLengths: lengths,
    created: doc.created,
    modified: Date.now(),
    stats: doc.stats
  };
}

function getSpikeMeta(row, col) {
  if (!editorDoc) return null;
  const key = spikeKey(row, col);
  if (!editorDoc.spikeMeta[key]) {
    editorDoc.spikeMeta[key] = { trigger: ED_DEFAULT_TRIGGER, length: null };
  }
  return editorDoc.spikeMeta[key];
}

// ===== UNDO / REDO =====

function editorSnapshot() {
  return JSON.stringify({
    name: editorDoc.name,
    visualStyle: editorDoc.visualStyle,
    grid: editorDoc.grid,
    spikeMeta: editorDoc.spikeMeta
  });
}

function pushEditorUndo() {
  if (!editorDoc) return;
  editorUndoStack.push(editorSnapshot());
  if (editorUndoStack.length > ED_MAX_UNDO) editorUndoStack.shift();
  editorRedoStack.length = 0;
  editorDirty = true;
}

function applyEditorSnapshot(snapshot) {
  const data = JSON.parse(snapshot);
  editorDoc.name = data.name;
  editorDoc.visualStyle = data.visualStyle;
  editorDoc.grid = data.grid;
  editorDoc.spikeMeta = data.spikeMeta;

  // The selected spike may not exist any more after the jump
  if (editorSelectedSpike) {
    const { row, col } = editorSelectedSpike;
    if (!isSpikeChar(editorDoc.grid[row][col])) editorSelectedSpike = null;
  }
}

function editorUndo() {
  if (editorUndoStack.length === 0) {
    setEditorStatus('Nothing left to undo', '#ffaa44');
    return;
  }
  editorRedoStack.push(editorSnapshot());
  applyEditorSnapshot(editorUndoStack.pop());
  editorDirty = true;
  setEditorStatus('Undo', '#88ccff');
}

function editorRedo() {
  if (editorRedoStack.length === 0) {
    setEditorStatus('Nothing left to redo', '#ffaa44');
    return;
  }
  editorUndoStack.push(editorSnapshot());
  applyEditorSnapshot(editorRedoStack.pop());
  editorDirty = true;
  setEditorStatus('Redo', '#88ccff');
}

// ===== STATUS TOAST =====

function setEditorStatus(text, color) {
  editorStatusText = text;
  editorStatusColor = color || '#88ff88';
  editorStatusTimer = 3.0;
}

// ===== VALIDATION =====

function findEditorChar(char) {
  for (let row = 0; row < editorDoc.grid.length; row++) {
    for (let col = 0; col < editorDoc.grid[row].length; col++) {
      if (editorDoc.grid[row][col] === char) return { row, col };
    }
  }
  return null;
}

function validateEditorDoc() {
  const problems = [];
  if (!findEditorChar('S')) problems.push({ level: 'error', text: 'No SPAWN point - place one with the SPAWN tool' });
  if (!findEditorChar('D')) problems.push({ level: 'error', text: 'No DOOR - the level cannot be finished' });

  const spawn = findEditorChar('S');
  if (spawn) {
    const below = editorDoc.grid[spawn.row + 1];
    const solidBelow = below && ['#', 'I', 'E'].includes(below[spawn.col]);
    if (!solidBelow) problems.push({ level: 'warn', text: 'Spawn has no ground under it - the player will drop' });
  }
  return problems;
}

function editorHasErrors() {
  return validateEditorDoc().some(p => p.level === 'error');
}

// ===== ENTERING / LEAVING =====

function openEditor(level, returnState) {
  editorDoc = levelToEditorDoc(level);
  editorTool = 'block';
  editorSelectedSpike = null;
  editorDrag = null;
  editorUndoStack = [];
  editorRedoStack = [];
  editorDirty = false;
  editorNameEditing = false;
  editorPreviewMode = false;
  editorShowHelp = false;
  editorReturnState = returnState || 'customLevels';
  customLevelSession = null;
  setEditorStatus('Editing "' + editorDoc.name + '"', '#88ccff');
  transitionToState('editor');
}

function openEditorForNewLevel() {
  const level = createNewCustomLevel('Untitled Level');
  openEditor(level, 'customLevels');
  editorDirty = true; // Never saved yet
  setEditorStatus('New level - build it, then press SAVE', '#88ccff');
}

function saveEditorLevel(silent) {
  if (!editorDoc) return false;
  const saved = saveCustomLevel(editorDocToLevel(editorDoc));
  if (!saved) return false;

  editorDoc.id = saved.id;
  editorDoc.created = saved.created;
  editorDoc.stats = saved.stats;
  editorDirty = false;
  if (!silent) setEditorStatus('Saved "' + saved.name + '"', '#88ff88');
  return true;
}

function leaveEditor() {
  if (editorDirty) {
    const choice = confirm('You have unsaved changes.\n\nOK = save and leave\nCancel = keep editing');
    if (!choice) return;
    if (!saveEditorLevel(true)) return;
  }
  const target = editorReturnState;
  editorDoc = null;
  editorDrag = null;
  transitionToState(target);
}

// Test-play the level straight from the editor
function editorTestPlay() {
  if (!editorDoc) return;
  if (editorHasErrors()) {
    const first = validateEditorDoc().find(p => p.level === 'error');
    setEditorStatus(first.text, '#ff6666');
    return;
  }
  // Auto-save so a crash or a reload never loses the work being tested
  saveEditorLevel(true);
  editorDrag = null; // Never carry a half-finished drag into the test
  startCustomLevelSession(editorDocToLevel(editorDoc), 'editor');
}

// ===== COORDINATE HELPERS =====
// "World" = the coordinates the real game uses (60px tiles, 1200x720).
// "Screen" = where that ends up inside the editor's shrunken view.

function edWorldToScreenX(wx) { return ED_GRID_X + wx * ED_SCALE; }
function edWorldToScreenY(wy) { return ED_GRID_Y + wy * ED_SCALE; }
function edScreenToWorldX(sx) { return (sx - ED_GRID_X) / ED_SCALE; }
function edScreenToWorldY(sy) { return (sy - ED_GRID_Y) / ED_SCALE; }

function edPointInGrid(x, y) {
  return x >= ED_GRID_X && x < ED_GRID_X + ED_GRID_W &&
         y >= ED_GRID_Y && y < ED_GRID_Y + ED_GRID_H;
}

function edScreenToCell(x, y) {
  const col = Math.floor((x - ED_GRID_X) / ED_TILE);
  const row = Math.floor((y - ED_GRID_Y) / ED_TILE);
  if (col < 0 || col >= EDITOR_COLS || row < 0 || row >= EDITOR_ROWS) return null;
  return { row, col };
}

function edSnap(value, step) {
  return Math.round(value / step) * step;
}

// Bounding boxes of connected G/g tiles - exactly how parseLevel() groups them,
// so the editor preview matches the real zone the player will hit.
function computeGravityZoneBoxes(grid) {
  const seen = new Set();
  const boxes = [];

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const char = grid[row][col];
      if (char !== 'G' && char !== 'g') continue;
      if (seen.has(row + ',' + col)) continue;

      const box = { minRow: row, maxRow: row, minCol: col, maxCol: col };
      const stack = [{ row, col }];

      while (stack.length > 0) {
        const cur = stack.pop();
        const key = cur.row + ',' + cur.col;
        if (seen.has(key)) continue;
        seen.add(key);

        box.minRow = Math.min(box.minRow, cur.row);
        box.maxRow = Math.max(box.maxRow, cur.row);
        box.minCol = Math.min(box.minCol, cur.col);
        box.maxCol = Math.max(box.maxCol, cur.col);

        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
          const nr = cur.row + dr;
          const nc = cur.col + dc;
          if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[nr].length) return;
          const nChar = grid[nr][nc];
          if ((nChar === 'G' || nChar === 'g') && !seen.has(nr + ',' + nc)) {
            stack.push({ row: nr, col: nc });
          }
        });
      }
      boxes.push(box);
    }
  }
  return boxes;
}

// Where a spike's handles live, in world coordinates.
function getSpikeGeometry(row, col) {
  const digit = parseInt(editorDoc.grid[row][col], 10) || 0;
  const meta = editorDoc.spikeMeta[spikeKey(row, col)] || { trigger: ED_DEFAULT_TRIGGER, length: null };

  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const spikeTop = y + 20;
  const moveDistance = digit * TILE_SIZE;
  const triggerX = x - meta.trigger * TILE_SIZE;
  const isFull = meta.length === null;

  let triggerY, triggerHeight;
  if (isFull) {
    triggerY = 0;
    triggerHeight = canvas.height;
  } else if (meta.length > 0) {
    triggerY = spikeTop - meta.length;
    triggerHeight = meta.length;
  } else {
    triggerY = spikeTop;
    triggerHeight = Math.abs(meta.length);
  }

  return {
    digit, meta, x, y, spikeTop, moveDistance, triggerX, triggerY, triggerHeight, isFull,
    // The end of the trigger line the player drags to change its length
    handleY: isFull ? 14 : spikeTop - meta.length,
    ghostX: x + moveDistance
  };
}

// ===== LAYOUT (buttons are rebuilt every frame and reused for hit-testing) =====

function buildEditorLayout() {
  const b = [];
  const push = (id, x, y, w, h, extra) => b.push(Object.assign({ id, x, y, w, h }, extra || {}));

  // --- top bar ---
  push('back', 10, 10, 88, 36);
  push('name', 106, 10, 270, 36);
  CUSTOM_VISUAL_STYLES.forEach((style, i) => {
    push('style:' + style.id, 384 + i * 86, 10, 80, 36, { style: style.id, label: style.label });
  });
  push('preview', 644, 10, 116, 36);
  push('help', 766, 10, 56, 36);
  push('test', 830, 10, 168, 36);
  push('save', 1006, 10, 184, 36);

  // --- tool palette ---
  EDITOR_TOOLS.forEach((tool, i) => {
    push('tool:' + tool.id, 8, 86 + i * 45, 174, 40, { tool: tool.id });
  });

  // --- spike power chips (only while the spike tool or a spike is in play) ---
  if (editorTool === 'spike' || editorSelectedSpike) {
    for (let d = 0; d <= 9; d++) {
      const cx = 12 + (d % 5) * 35;
      const cy = 558 + Math.floor(d / 5) * 32;
      push('spikeDist:' + d, cx, cy, 32, 28, { distance: d });
    }
  }

  // --- bottom bar ---
  push('grid', 806, 684, 66, 28);
  push('undo', 878, 684, 66, 28);
  push('redo', 950, 684, 66, 28);
  push('clear', 1022, 684, 78, 28);

  editorButtons = b;
  return b;
}

function edButtonAt(x, y) {
  for (let i = editorButtons.length - 1; i >= 0; i--) {
    const btn = editorButtons[i];
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) return btn;
  }
  return null;
}

// ===== SMALL DRAW HELPERS =====

function edDrawButton(btn, label, opts) {
  const o = opts || {};
  const hovered = editorMouse.x >= btn.x && editorMouse.x <= btn.x + btn.w &&
                  editorMouse.y >= btn.y && editorMouse.y <= btn.y + btn.h;

  let fill = o.active ? (o.activeColor || '#3b5c8f') : '#2e2e38';
  if (o.disabled) fill = '#232329';
  else if (hovered) fill = o.active ? (o.activeColor || '#456ba6') : '#3c3c49';

  ctx.fillStyle = fill;
  ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
  ctx.strokeStyle = o.disabled ? '#333340' : (o.active ? (o.borderColor || '#88bbff') : (hovered ? '#7a7a8c' : '#4a4a58'));
  ctx.lineWidth = o.active ? 2 : 1;
  ctx.strokeRect(btn.x + 0.5, btn.y + 0.5, btn.w - 1, btn.h - 1);

  if (label) {
    ctx.fillStyle = o.disabled ? '#555560' : (o.textColor || '#e8e8f0');
    ctx.font = o.font || 'bold 15px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  }
  return hovered;
}

function edDrawTileIcon(x, y, size, tool) {
  const style = editorDoc ? editorDoc.visualStyle : 'default';

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  ctx.translate(x, y);
  ctx.scale(size / TILE_SIZE, size / TILE_SIZE);

  switch (tool.id) {
    case 'block':
      drawStyledPlatform(0, 0, TILE_SIZE, TILE_SIZE, style, false);
      break;
    case 'fake':
      drawStyledPlatform(0, 0, TILE_SIZE, TILE_SIZE, style, true);
      break;
    case 'invisible':
      ctx.fillStyle = 'rgba(68, 221, 221, 0.22)';
      ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#44dddd';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(3, 3, TILE_SIZE - 6, TILE_SIZE - 6);
      ctx.setLineDash([]);
      break;
    case 'crumble':
      drawStyledCrumblingPlatform({ x: 0, y: 0, width: TILE_SIZE, height: TILE_SIZE, state: 'solid', timer: 0, alpha: 1 }, style);
      break;
    case 'spike':
      drawStyledSpike({ x: 0, y: 8, width: TILE_SIZE, height: TILE_SIZE - 12, moving: false, moved: false }, style);
      break;
    case 'gravity':
      ctx.fillStyle = 'rgba(140, 102, 255, 0.35)';
      ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#8c66ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(TILE_SIZE / 2, 14);
      ctx.lineTo(TILE_SIZE / 2 - 12, 40);
      ctx.lineTo(TILE_SIZE / 2 + 12, 40);
      ctx.closePath();
      ctx.fill();
      break;
    case 'spawn':
      drawStyledPlayer(8, 8, 44, 44, style);
      break;
    case 'door':
      drawStyledDoor({ x: 0, y: 0, width: TILE_SIZE, height: TILE_SIZE }, style);
      break;
    case 'erase':
      ctx.strokeStyle = '#888894';
      ctx.lineWidth = 4;
      ctx.setLineDash([7, 7]);
      ctx.strokeRect(5, 5, TILE_SIZE - 10, TILE_SIZE - 10);
      ctx.setLineDash([]);
      break;
    case 'select':
      ctx.fillStyle = '#ffcc44';
      ctx.beginPath();
      ctx.moveTo(16, 10);
      ctx.lineTo(16, 48);
      ctx.lineTo(26, 38);
      ctx.lineTo(34, 50);
      ctx.lineTo(41, 46);
      ctx.lineTo(33, 34);
      ctx.lineTo(45, 32);
      ctx.closePath();
      ctx.fill();
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
  if (!editorDoc) return;
  buildEditorLayout();

  // Editor chrome background
  ctx.fillStyle = '#16161d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawEditorGridArea();
  drawEditorTopBar();
  drawEditorPalette();
  drawEditorBottomBar();

  if (editorShowHelp) drawEditorHelpOverlay();
}

// --- the level itself, drawn with the real game renderers ---
function drawEditorGridArea() {
  const style = editorDoc.visualStyle;
  const grid = editorDoc.grid;

  ctx.save();
  ctx.beginPath();
  ctx.rect(ED_GRID_X, ED_GRID_Y, ED_GRID_W, ED_GRID_H);
  ctx.clip();

  // --- world-space pass: everything the player will actually see ---
  ctx.save();
  ctx.translate(ED_GRID_X, ED_GRID_Y);
  ctx.scale(ED_SCALE, ED_SCALE);

  drawStyledBackground(style);

  const tileAt = (r, c) => ({ x: c * TILE_SIZE, y: r * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });

  // Solid platforms
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === '#') {
        const t = tileAt(r, c);
        drawStyledPlatform(t.x, t.y, t.width, t.height, style, false);
      }
    }
  }

  // Crumbling platforms
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === 'E') {
        const t = tileAt(r, c);
        drawStyledCrumblingPlatform({ x: t.x, y: t.y, width: t.width, height: t.height, state: 'solid', timer: 0, alpha: 1 }, style);
      }
    }
  }

  // Fake blocks (identical to solid on purpose - the overlay pass marks them)
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === 'F') {
        const t = tileAt(r, c);
        drawStyledPlatform(t.x, t.y, t.width, t.height, style, true);
      }
    }
  }

  // Gravity zones, grouped exactly like the game groups them
  computeGravityZoneBoxes(grid).forEach((box, index) => {
    drawStyledGravityZone({
      id: index,
      x: box.minCol * TILE_SIZE,
      y: box.minRow * TILE_SIZE,
      width: (box.maxCol - box.minCol + 1) * TILE_SIZE,
      height: (box.maxRow - box.minRow + 1) * TILE_SIZE,
      visual: {
        color: '#44ddff', secondaryColor: '#ff44dd', alpha: 0.35,
        stripeAngle: 45, stripeWidth: 8, stripeSpacing: 20,
        animated: true, animSpeed: 40, showArrow: true, glowWhenActive: true
      }
    }, false, style);
  });

  // Door
  const doorCell = findEditorChar('D');
  if (doorCell) {
    const t = tileAt(doorCell.row, doorCell.col);
    drawStyledDoor({ x: t.x, y: t.y, width: t.width, height: t.height }, style);
  }

  // Spikes
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!isSpikeChar(grid[r][c])) continue;
      const t = tileAt(r, c);
      drawStyledSpike({
        x: t.x, y: t.y + 20, originalX: t.x,
        width: TILE_SIZE, height: TILE_SIZE - 20,
        moving: false, moved: false
      }, style);
    }
  }

  // The player, sitting on the spawn point
  const spawnCell = findEditorChar('S');
  if (spawnCell) {
    drawStyledPlayer(spawnCell.col * TILE_SIZE + 15, spawnCell.row * TILE_SIZE, 45, 45, style);
  }

  ctx.restore();

  // Reset anything the game renderers may have left behind
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  ctx.lineWidth = 1;

  // --- editor overlay pass (screen space, so lines stay crisp) ---
  if (!editorPreviewMode) {
    if (editorShowGrid) drawEditorGridLines();
    drawEditorTileMarkers();
    drawEditorSpikeOverlays();
    drawEditorCursorPreview();
  }

  ctx.restore();

  // Frame around the play area
  ctx.strokeStyle = '#4a4a58';
  ctx.lineWidth = 2;
  ctx.strokeRect(ED_GRID_X - 1, ED_GRID_Y - 1, ED_GRID_W + 2, ED_GRID_H + 2);

  if (editorPreviewMode) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(ED_GRID_X + ED_GRID_W / 2 - 150, ED_GRID_Y + 8, 300, 30);
    ctx.fillStyle = '#ffdd66';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PREVIEW - what the player sees (TAB)', ED_GRID_X + ED_GRID_W / 2, ED_GRID_Y + 28);
    ctx.textAlign = 'left';
  }
}

function drawEditorGridLines() {
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= EDITOR_COLS; c++) {
    const x = ED_GRID_X + c * ED_TILE + 0.5;
    ctx.moveTo(x, ED_GRID_Y);
    ctx.lineTo(x, ED_GRID_Y + ED_GRID_H);
  }
  for (let r = 0; r <= EDITOR_ROWS; r++) {
    const y = ED_GRID_Y + r * ED_TILE + 0.5;
    ctx.moveTo(ED_GRID_X, y);
    ctx.lineTo(ED_GRID_X + ED_GRID_W, y);
  }
  ctx.stroke();
}

// Labels so the builder can tell apart tiles the player is not supposed to.
function drawEditorTileMarkers() {
  const grid = editorDoc.grid;

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const char = grid[r][c];
      const x = ED_GRID_X + c * ED_TILE;
      const y = ED_GRID_Y + r * ED_TILE;

      if (char === 'F') {
        ctx.strokeStyle = '#ff66cc';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(x + 2, y + 2, ED_TILE - 4, ED_TILE - 4);
        ctx.setLineDash([]);
        ctx.fillStyle = '#ff66cc';
        ctx.font = 'bold 13px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FAKE', x + ED_TILE / 2, y + ED_TILE / 2 + 5);
      } else if (char === 'I') {
        ctx.fillStyle = 'rgba(68, 221, 221, 0.18)';
        ctx.fillRect(x, y, ED_TILE, ED_TILE);
        ctx.strokeStyle = '#44dddd';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(x + 2, y + 2, ED_TILE - 4, ED_TILE - 4);
        ctx.setLineDash([]);
        ctx.fillStyle = '#88f2f2';
        ctx.font = 'bold 13px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('HID', x + ED_TILE / 2, y + ED_TILE / 2 + 5);
      } else if (char === 'E') {
        ctx.strokeStyle = '#ddaa55';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x + 2, y + 2, ED_TILE - 4, ED_TILE - 4);
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffcc77';
        ctx.font = 'bold 11px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CRUMB', x + ED_TILE / 2, y + ED_TILE / 2 + 4);
      } else if (char === 'G' || char === 'g') {
        ctx.fillStyle = 'rgba(140, 102, 255, 0.12)';
        ctx.fillRect(x, y, ED_TILE, ED_TILE);
      } else if (char === 'S') {
        ctx.fillStyle = '#44aaff';
        ctx.font = 'bold 11px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SPAWN', x + ED_TILE / 2, y + ED_TILE - 4);
      } else if (char === 'D') {
        ctx.fillStyle = '#44ff88';
        ctx.font = 'bold 11px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EXIT', x + ED_TILE / 2, y + ED_TILE - 4);
      }
    }
  }
  ctx.textAlign = 'left';
}

// --- spike trap overlays: the heart of the editor ---
function drawEditorSpikeOverlays() {
  const grid = editorDoc.grid;

  // Every spike shows a faint trigger line so the whole trap layout is readable
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!isSpikeChar(grid[r][c])) continue;
      const isSelected = editorSelectedSpike && editorSelectedSpike.row === r && editorSelectedSpike.col === c;
      if (!isSelected) drawOneSpikeOverlay(r, c, false);
    }
  }

  // The selected spike is drawn last so its handles sit on top
  if (editorSelectedSpike) {
    const { row, col } = editorSelectedSpike;
    if (isSpikeChar(grid[row][col])) drawOneSpikeOverlay(row, col, true);
    else editorSelectedSpike = null;
  }
}

function drawOneSpikeOverlay(row, col, selected) {
  const g = getSpikeGeometry(row, col);

  const lineX = edWorldToScreenX(g.triggerX);
  const topY = Math.max(ED_GRID_Y, edWorldToScreenY(g.triggerY));
  const botY = Math.min(ED_GRID_Y + ED_GRID_H, edWorldToScreenY(g.triggerY + g.triggerHeight));
  const spikeX = edWorldToScreenX(g.x);
  const spikeTopY = edWorldToScreenY(g.spikeTop);
  const tileW = TILE_SIZE * ED_SCALE;
  const spikeH = (TILE_SIZE - 20) * ED_SCALE;

  // A 0-tile spike never moves and has no trigger at all
  const hasTrigger = g.digit > 0;

  if (hasTrigger) {
    // Trigger line
    ctx.strokeStyle = selected ? '#ffdd33' : 'rgba(255, 221, 51, 0.28)';
    ctx.lineWidth = selected ? 3 : 2;
    ctx.setLineDash(selected ? [] : [6, 5]);
    ctx.beginPath();
    ctx.moveTo(lineX, topY);
    ctx.lineTo(lineX, botY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (selected) {
      // Soft band showing the slice of space that arms the trap
      ctx.fillStyle = 'rgba(255, 221, 51, 0.10)';
      ctx.fillRect(lineX - 5, topY, 10, botY - topY);

      // Grab bars at both ends of the line
      ctx.fillStyle = '#ffdd33';
      ctx.fillRect(lineX - 7, topY - 2, 14, 4);
      ctx.fillRect(lineX - 7, botY - 2, 14, 4);
    }
  }

  if (!selected) return;

  // --- ghost: where the spike shoots to ---
  const ghostX = edWorldToScreenX(g.ghostX);
  if (g.digit > 0) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#ff4455';
    ctx.fillRect(ghostX, spikeTopY, tileW, spikeH);
    ctx.restore();

    ctx.strokeStyle = '#ff8899';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(ghostX, spikeTopY, tileW, spikeH);
    ctx.setLineDash([]);

    // Arrow from the spike to the ghost
    const arrowY = spikeTopY + spikeH / 2;
    ctx.strokeStyle = '#ff8899';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(spikeX + tileW / 2, arrowY);
    ctx.lineTo(ghostX + tileW / 2 - 10, arrowY);
    ctx.stroke();
    ctx.fillStyle = '#ff8899';
    ctx.beginPath();
    ctx.moveTo(ghostX + tileW / 2, arrowY);
    ctx.lineTo(ghostX + tileW / 2 - 11, arrowY - 6);
    ctx.lineTo(ghostX + tileW / 2 - 11, arrowY + 6);
    ctx.closePath();
    ctx.fill();

    // Drag grip on the ghost
    ctx.fillStyle = '#ffffff';
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(ghostX + tileW / 2 - 1 + i * 5, spikeTopY + spikeH / 2 - 6, 2, 12);
    }
  }

  // --- length handle at the free end of the trigger line ---
  if (hasTrigger) {
    const handleY = Math.max(ED_GRID_Y + 6, Math.min(ED_GRID_Y + ED_GRID_H - 6, edWorldToScreenY(g.handleY)));
    ctx.fillStyle = g.isFull ? '#66ddff' : '#ffdd33';
    ctx.strokeStyle = '#1a1a22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lineX, handleY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Up/down chevrons inside the handle
    ctx.strokeStyle = '#1a1a22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lineX - 4, handleY - 1);
    ctx.lineTo(lineX, handleY - 5);
    ctx.lineTo(lineX + 4, handleY - 1);
    ctx.moveTo(lineX - 4, handleY + 1);
    ctx.lineTo(lineX, handleY + 5);
    ctx.lineTo(lineX + 4, handleY + 1);
    ctx.stroke();

    // Label above the line
    const label = g.isFull ? 'FULL HEIGHT' : (g.meta.length > 0 ? 'UP ' + Math.round(g.meta.length) + 'px' : 'DOWN ' + Math.round(Math.abs(g.meta.length)) + 'px');
    const labelY = Math.max(ED_GRID_Y + 14, Math.min(handleY - 16, ED_GRID_Y + ED_GRID_H - 8));
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(label).width + 12;
    ctx.fillStyle = 'rgba(20,20,28,0.85)';
    ctx.fillRect(lineX - w / 2, labelY - 12, w, 16);
    ctx.fillStyle = g.isFull ? '#66ddff' : '#ffdd33';
    ctx.fillText(label, lineX, labelY);
    ctx.textAlign = 'left';
  }

  // Selection ring around the spike itself
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(spikeX + 1, edWorldToScreenY(g.y) + 1, tileW - 2, TILE_SIZE * ED_SCALE - 2);
  ctx.setLineDash([]);

  // Power badge on the spike
  ctx.fillStyle = 'rgba(20,20,28,0.85)';
  ctx.fillRect(spikeX + 2, edWorldToScreenY(g.y) + 2, 20, 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(g.digit), spikeX + 12, edWorldToScreenY(g.y) + 14);
  ctx.textAlign = 'left';
}

// Hover highlight + shift-rectangle preview
function drawEditorCursorPreview() {
  if (editorDrag && editorDrag.type === 'rect') {
    const a = editorDrag.anchor;
    const b = editorHoverCell || a;
    const r0 = Math.min(a.row, b.row), r1 = Math.max(a.row, b.row);
    const c0 = Math.min(a.col, b.col), c1 = Math.max(a.col, b.col);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(ED_GRID_X + c0 * ED_TILE, ED_GRID_Y + r0 * ED_TILE, (c1 - c0 + 1) * ED_TILE, (r1 - r0 + 1) * ED_TILE);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(ED_GRID_X + c0 * ED_TILE, ED_GRID_Y + r0 * ED_TILE, (c1 - c0 + 1) * ED_TILE, (r1 - r0 + 1) * ED_TILE);
    return;
  }

  if (!editorHoverCell || editorDrag) return;
  const tool = EDITOR_TOOLS.find(t => t.id === editorTool);
  ctx.strokeStyle = tool ? tool.color : '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(ED_GRID_X + editorHoverCell.col * ED_TILE + 1, ED_GRID_Y + editorHoverCell.row * ED_TILE + 1, ED_TILE - 2, ED_TILE - 2);
}

// --- top bar ---
function drawEditorTopBar() {
  ctx.fillStyle = '#20202a';
  ctx.fillRect(0, 0, canvas.width, ED_TOPBAR_H);
  ctx.strokeStyle = '#33333f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, ED_TOPBAR_H - 0.5);
  ctx.lineTo(canvas.width, ED_TOPBAR_H - 0.5);
  ctx.stroke();

  const byId = id => editorButtons.find(b => b.id === id);

  edDrawButton(byId('back'), '◀ BACK', { font: 'bold 14px Arial, sans-serif' });

  // Level name field (click to rename, typed straight on the canvas)
  const nameBtn = byId('name');
  const editing = editorNameEditing;
  ctx.fillStyle = editing ? '#1b2a3d' : '#26262f';
  ctx.fillRect(nameBtn.x, nameBtn.y, nameBtn.w, nameBtn.h);
  ctx.strokeStyle = editing ? '#66aaff' : '#4a4a58';
  ctx.lineWidth = editing ? 2 : 1;
  ctx.strokeRect(nameBtn.x + 0.5, nameBtn.y + 0.5, nameBtn.w - 1, nameBtn.h - 1);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.textAlign = 'left';
  const displayName = editorDoc.name || '';
  ctx.save();
  ctx.beginPath();
  ctx.rect(nameBtn.x + 6, nameBtn.y, nameBtn.w - 12, nameBtn.h);
  ctx.clip();
  ctx.fillText(displayName, nameBtn.x + 10, nameBtn.y + 24);
  if (editing && editorBlink < 0.5) {
    const caretX = nameBtn.x + 12 + ctx.measureText(displayName).width;
    ctx.fillRect(caretX, nameBtn.y + 8, 2, 20);
  }
  ctx.restore();

  if (!editing) {
    ctx.fillStyle = '#6f6f80';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('rename', nameBtn.x + nameBtn.w - 8, nameBtn.y + 26);
    ctx.textAlign = 'left';
  }

  // Visual style chips
  CUSTOM_VISUAL_STYLES.forEach(style => {
    const btn = byId('style:' + style.id);
    edDrawButton(btn, style.label, {
      active: editorDoc.visualStyle === style.id,
      activeColor: '#5b3f8f',
      borderColor: '#bb88ff',
      font: 'bold 13px Arial, sans-serif'
    });
  });

  edDrawButton(byId('preview'), editorPreviewMode ? 'EDIT VIEW' : 'PREVIEW', {
    active: editorPreviewMode, activeColor: '#7a6a1f', borderColor: '#ffdd66',
    font: 'bold 13px Arial, sans-serif'
  });
  edDrawButton(byId('help'), '?', { font: 'bold 20px Arial, sans-serif', active: editorShowHelp });

  const problems = validateEditorDoc();
  const blocked = problems.some(p => p.level === 'error');
  edDrawButton(byId('test'), '▶ TEST PLAY', {
    active: !blocked, activeColor: '#2f7a3f', borderColor: '#66ff99',
    disabled: blocked, font: 'bold 16px Arial, sans-serif'
  });
  edDrawButton(byId('save'), editorDirty ? 'SAVE •' : 'SAVED', {
    active: editorDirty, activeColor: '#2f5f9a', borderColor: '#88ccff',
    font: 'bold 16px Arial, sans-serif'
  });
}

// --- left tool palette ---
function drawEditorPalette() {
  ctx.fillStyle = '#1b1b23';
  ctx.fillRect(0, ED_TOPBAR_H, ED_PALETTE_W, canvas.height - ED_TOPBAR_H);
  ctx.strokeStyle = '#33333f';
  ctx.beginPath();
  ctx.moveTo(ED_PALETTE_W - 0.5, ED_TOPBAR_H);
  ctx.lineTo(ED_PALETTE_W - 0.5, canvas.height);
  ctx.stroke();

  ctx.fillStyle = '#7f7f92';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TOOLS', 12, 78);

  EDITOR_TOOLS.forEach(tool => {
    const btn = editorButtons.find(b => b.id === 'tool:' + tool.id);
    const active = editorTool === tool.id;
    edDrawButton(btn, null, { active, activeColor: '#33334a', borderColor: tool.color });

    edDrawTileIcon(btn.x + 7, btn.y + 6, 28, tool);

    ctx.fillStyle = active ? '#ffffff' : '#c3c3d0';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(tool.label, btn.x + 44, btn.y + 25);

    ctx.fillStyle = active ? '#9aa4b8' : '#5f5f70';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(tool.key, btn.x + btn.w - 8, btn.y + 25);
    ctx.textAlign = 'left';
  });

  // Spike power chips (0-9 tiles of travel)
  if (editorTool === 'spike' || editorSelectedSpike) {
    ctx.fillStyle = '#7f7f92';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText(editorSelectedSpike ? 'SPIKE RANGE (tiles)' : 'NEW SPIKE RANGE', 12, 550);

    const currentDistance = editorSelectedSpike
      ? (parseInt(editorDoc.grid[editorSelectedSpike.row][editorSelectedSpike.col], 10) || 0)
      : editorSpikeDistance;

    for (let d = 0; d <= 9; d++) {
      const btn = editorButtons.find(b => b.id === 'spikeDist:' + d);
      if (!btn) continue;
      edDrawButton(btn, String(d), {
        active: currentDistance === d,
        activeColor: '#8a2733',
        borderColor: '#ff6677',
        font: 'bold 14px Arial, sans-serif'
      });
    }

    ctx.fillStyle = '#6f6f80';
    ctx.font = '11px Arial, sans-serif';
    ctx.fillText('0 = never moves', 12, 636);
  }

  // Contextual tip for the active tool
  ctx.fillStyle = '#8a8a9c';
  ctx.font = '12px Arial, sans-serif';
  const tipY = (editorTool === 'spike' || editorSelectedSpike) ? 652 : 556;
  edWrapText(EDITOR_TOOL_HINTS[editorTool] || '', 12, tipY, ED_PALETTE_W - 24, 15, 5);
}

// --- bottom status bar ---
function drawEditorBottomBar() {
  ctx.fillStyle = '#20202a';
  ctx.fillRect(ED_PALETTE_W, ED_BOTTOM_Y, canvas.width - ED_PALETTE_W, canvas.height - ED_BOTTOM_Y);

  const byId = id => editorButtons.find(b => b.id === id);
  edDrawButton(byId('grid'), 'GRID', { active: editorShowGrid, font: 'bold 12px Arial, sans-serif' });
  edDrawButton(byId('undo'), 'UNDO', { disabled: editorUndoStack.length === 0, font: 'bold 12px Arial, sans-serif' });
  edDrawButton(byId('redo'), 'REDO', { disabled: editorRedoStack.length === 0, font: 'bold 12px Arial, sans-serif' });
  edDrawButton(byId('clear'), 'CLEAR', { font: 'bold 12px Arial, sans-serif', textColor: '#ff9999' });

  ctx.textAlign = 'left';

  // Toast messages win over everything else
  if (editorStatusTimer > 0 && editorStatusText) {
    ctx.fillStyle = editorStatusColor;
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.fillText(editorStatusText, ED_PALETTE_W + 14, ED_BOTTOM_Y + 28);
    return;
  }

  // A selected spike shows its exact numbers here
  if (editorSelectedSpike && isSpikeChar(editorDoc.grid[editorSelectedSpike.row][editorSelectedSpike.col])) {
    const g = getSpikeGeometry(editorSelectedSpike.row, editorSelectedSpike.col);
    const lengthText = g.isFull ? 'full height' : (g.meta.length > 0 ? Math.round(g.meta.length) + 'px up' : Math.round(Math.abs(g.meta.length)) + 'px down');
    ctx.fillStyle = '#ffdd33';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText('SPIKE  •  range ' + g.digit + ' tiles  •  trigger ' + g.meta.trigger.toFixed(2).replace(/\.?0+$/, '') + ' tiles  •  trigger length ' + lengthText,
      ED_PALETTE_W + 14, ED_BOTTOM_Y + 20);
    ctx.fillStyle = '#8a8a9c';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText('Drag the ghost = range  |  drag the yellow line = where it fires  |  drag the round handle = how tall the trigger is  |  H = full height  |  DEL = remove',
      ED_PALETTE_W + 14, ED_BOTTOM_Y + 37);
    return;
  }

  // Otherwise: validation problems, then the general hint
  const problems = validateEditorDoc();
  if (problems.length > 0) {
    const error = problems.find(p => p.level === 'error') || problems[0];
    ctx.fillStyle = error.level === 'error' ? '#ff6666' : '#ffbb55';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText((error.level === 'error' ? '⚠ ' : '⚠ ') + error.text, ED_PALETTE_W + 14, ED_BOTTOM_Y + 20);
  } else {
    ctx.fillStyle = '#66cc88';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText('✓ Level is playable - press TEST PLAY', ED_PALETTE_W + 14, ED_BOTTOM_Y + 20);
  }

  ctx.fillStyle = '#8a8a9c';
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText('Left click paints  |  right click erases  |  SHIFT+drag = rectangle  |  CTRL+Z undo  |  ENTER test  |  ? help',
    ED_PALETTE_W + 14, ED_BOTTOM_Y + 37);
}

// --- help overlay ---
function drawEditorHelpOverlay() {
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const boxX = 150, boxY = 36, boxW = 900, boxH = 660;
  ctx.fillStyle = '#1c1c26';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#5a5a70';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Impact, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LEVEL EDITOR HELP', canvas.width / 2, boxY + 40);

  const sections = [
    ['BUILDING', [
      'Left click / drag ....... paint with the selected tool',
      'Right click / drag ...... erase (works with any tool)',
      'SHIFT + drag ............ fill a whole rectangle',
      'ALT while dragging ...... turn off snapping for fine tuning',
      'TAB ..................... preview exactly what the player sees'
    ]],
    ['SPIKE TRAPS (drag, never type)', [
      'Click a spike with SELECT to tune it',
      'Drag the red ghost ...... how far the spike shoots (0-9 tiles)',
      'Drag the yellow line .... where the player sets it off',
      'Drag the round handle ... how tall that trigger is',
      'Handle to the very top .. trigger covers the full screen',
      'H ....................... snap back to full height',
      'Arrow keys .............. nudge trigger / length precisely',
      'DELETE .................. remove the selected spike'
    ]],
    ['TOOLS', [
      'V select   B solid   F fake   I hidden   C crumble',
      'K spike    G gravity  S spawn  D door    X eraser',
      '0-9 ..................... spike range (also retunes a selected spike)'
    ]],
    ['LEVEL', [
      'CTRL+Z / CTRL+Y ......... undo / redo',
      'CTRL+S .................. save',
      'ENTER ................... test play      ESC ... back'
    ]]
  ];

  ctx.textAlign = 'left';
  let y = boxY + 84;
  sections.forEach(([title, lines]) => {
    ctx.fillStyle = '#ffcc44';
    ctx.font = 'bold 17px Arial, sans-serif';
    ctx.fillText(title, boxX + 40, y);
    y += 22;
    ctx.fillStyle = '#c8c8d6';
    ctx.font = '15px monospace';
    lines.forEach(line => {
      ctx.fillText(line, boxX + 52, y);
      y += 20;
    });
    y += 10;
  });

  ctx.fillStyle = '#8a8a9c';
  ctx.font = '14px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Click anywhere or press ? / ESC to close', canvas.width / 2, boxY + boxH - 18);
  ctx.textAlign = 'left';
}

// ===== PER-FRAME UPDATE =====
function updateEditor(deltaTime) {
  editorBlink = (editorBlink + deltaTime) % 1;
  if (editorStatusTimer > 0) editorStatusTimer -= deltaTime;
}

// ===== EDITING OPERATIONS =====

// Undo tokens: the snapshot is only kept if the action really changed something
function beginEditorChange() {
  return { snapshot: editorSnapshot(), committed: false };
}

function commitEditorChange(token) {
  if (!token || token.committed) return;
  editorUndoStack.push(token.snapshot);
  if (editorUndoStack.length > ED_MAX_UNDO) editorUndoStack.shift();
  editorRedoStack.length = 0;
  editorDirty = true;
  token.committed = true;
}

function toolChar(toolId) {
  if (toolId === 'spike') return String(editorSpikeDistance);
  const tool = EDITOR_TOOLS.find(t => t.id === toolId);
  return tool ? tool.char : null;
}

// Write one tile. Returns true when the grid actually changed.
function setEditorCell(row, col, char) {
  const grid = editorDoc.grid;
  if (row < 0 || row >= grid.length || col < 0 || col >= grid[row].length) return false;

  const prev = grid[row][col];
  if (prev === char) return false;

  // Losing a spike means losing its trap settings - but swapping one spike for
  // another (a different range) keeps the trigger the player already tuned.
  if (isSpikeChar(prev) && !isSpikeChar(char)) {
    delete editorDoc.spikeMeta[spikeKey(row, col)];
    if (editorSelectedSpike && editorSelectedSpike.row === row && editorSelectedSpike.col === col) {
      editorSelectedSpike = null;
    }
  }

  // Spawn and door exist exactly once
  if (char === 'S' || char === 'D') {
    const existing = findEditorChar(char);
    if (existing) grid[existing.row][existing.col] = '.';
  }

  grid[row][col] = char;
  if (isSpikeChar(char)) getSpikeMeta(row, col);
  return true;
}

// Paint every cell on the straight line between two cells so a fast drag
// never leaves gaps.
function paintEditorLine(from, to, char, token) {
  let changed = false;
  const steps = Math.max(Math.abs(to.row - from.row), Math.abs(to.col - from.col));

  if (steps === 0) {
    if (setEditorCell(to.row, to.col, char)) changed = true;
  } else {
    for (let i = 0; i <= steps; i++) {
      const row = Math.round(from.row + (to.row - from.row) * (i / steps));
      const col = Math.round(from.col + (to.col - from.col) * (i / steps));
      if (setEditorCell(row, col, char)) changed = true;
    }
  }

  if (changed) commitEditorChange(token);
  return changed;
}

function fillEditorRect(a, b, char, token) {
  const r0 = Math.min(a.row, b.row), r1 = Math.max(a.row, b.row);
  const c0 = Math.min(a.col, b.col), c1 = Math.max(a.col, b.col);
  let changed = false;

  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      // Only one spawn/door can exist, so a rectangle of them makes no sense
      if ((char === 'S' || char === 'D') && !(r === r1 && c === c1)) continue;
      if (setEditorCell(r, c, char)) changed = true;
    }
  }
  if (changed) commitEditorChange(token);
  return changed;
}

function setSelectedSpikeDistance(distance) {
  if (!editorSelectedSpike) return;
  const { row, col } = editorSelectedSpike;
  if (!isSpikeChar(editorDoc.grid[row][col])) return;
  if (String(distance) === editorDoc.grid[row][col]) return;

  pushEditorUndo();
  editorDoc.grid[row][col] = String(distance);
  getSpikeMeta(row, col);
}

function deleteSelectedSpike() {
  if (!editorSelectedSpike) return;
  const { row, col } = editorSelectedSpike;
  pushEditorUndo();
  setEditorCell(row, col, '.');
  editorSelectedSpike = null;
  setEditorStatus('Spike removed', '#ffaa66');
}

function clearEditorLevel() {
  if (!confirm('Clear the whole level?\nThis can still be undone with CTRL+Z.')) return;
  pushEditorUndo();
  for (let r = 0; r < editorDoc.grid.length; r++) {
    for (let c = 0; c < editorDoc.grid[r].length; c++) editorDoc.grid[r][c] = '.';
  }
  editorDoc.spikeMeta = {};
  editorSelectedSpike = null;
  setEditorStatus('Level cleared', '#ffaa66');
}

// ===== HANDLE HIT-TESTING =====

function editorHitSpikeHandle(x, y) {
  // Only the SELECT tool grabs handles - otherwise a trigger line lying across
  // the map would swallow clicks meant for painting.
  if (editorTool !== 'select') return null;
  if (!editorSelectedSpike) return null;
  const { row, col } = editorSelectedSpike;
  if (!isSpikeChar(editorDoc.grid[row][col])) return null;

  const g = getSpikeGeometry(row, col);
  if (g.digit === 0) return null; // A static spike has nothing to tune

  const worldX = edScreenToWorldX(x);
  const lineX = edWorldToScreenX(g.triggerX);
  const tileW = TILE_SIZE * ED_SCALE;
  const spikeH = (TILE_SIZE - 20) * ED_SCALE;

  // 1) round handle at the end of the trigger line
  const handleY = Math.max(ED_GRID_Y + 6, Math.min(ED_GRID_Y + ED_GRID_H - 6, edWorldToScreenY(g.handleY)));
  if ((x - lineX) * (x - lineX) + (y - handleY) * (y - handleY) <= 169) {
    return { type: 'length', row, col };
  }

  // 2) ghost block = travel distance
  const ghostX = edWorldToScreenX(g.ghostX);
  const spikeTopY = edWorldToScreenY(g.spikeTop);
  if (x >= ghostX && x <= ghostX + tileW && y >= spikeTopY && y <= spikeTopY + spikeH) {
    return { type: 'ghost', row, col, grab: worldX - g.ghostX };
  }

  // 3) the trigger line itself
  const topY = Math.max(ED_GRID_Y, edWorldToScreenY(g.triggerY));
  const botY = Math.min(ED_GRID_Y + ED_GRID_H, edWorldToScreenY(g.triggerY + g.triggerHeight));
  if (Math.abs(x - lineX) <= 7 && y >= topY - 5 && y <= botY + 5) {
    return { type: 'trigger', row, col, grab: worldX - g.triggerX };
  }

  return null;
}

// ===== DRAG UPDATES =====

function updateSpikeTriggerDrag(x) {
  const { row, col } = editorDrag;
  const meta = getSpikeMeta(row, col);
  const spikeWorldX = col * TILE_SIZE;

  const worldX = edScreenToWorldX(x) - editorDrag.grab;
  let offset = (spikeWorldX - worldX) / TILE_SIZE;

  offset = editorModifiers.alt ? Math.round(offset * 100) / 100 : edSnap(offset, 0.5);

  // Keep the line somewhere on (or just beside) the screen
  const minOffset = (spikeWorldX - (canvas.width + TILE_SIZE)) / TILE_SIZE;
  const maxOffset = (spikeWorldX + TILE_SIZE) / TILE_SIZE;
  meta.trigger = Math.max(minOffset, Math.min(maxOffset, offset));
}

function updateSpikeLengthDrag(y) {
  const { row, col } = editorDrag;
  const meta = getSpikeMeta(row, col);
  const spikeTop = row * TILE_SIZE + 20;

  // Pulling the handle to the very top means "cover the whole screen"
  if (y <= ED_GRID_Y + 12) {
    meta.length = null;
    return;
  }

  const worldY = edScreenToWorldY(y);
  let length = spikeTop - worldY;
  length = editorModifiers.alt ? Math.round(length) : edSnap(length, 20);

  // 0 would mean "full height" to the game engine, so never produce it
  if (Math.abs(length) < 20) length = length >= 0 ? 20 : -20;
  meta.length = Math.max(-900, Math.min(900, length));
}

function updateSpikeGhostDrag(x) {
  const { row, col } = editorDrag;
  const spikeWorldX = col * TILE_SIZE;
  const worldX = edScreenToWorldX(x) - editorDrag.grab;

  let distance = Math.round((worldX - spikeWorldX) / TILE_SIZE);
  distance = Math.max(0, Math.min(9, distance));
  editorDoc.grid[row][col] = String(distance);
  editorSpikeDistance = distance;
}

function updateEntityDrag(cell) {
  const grid = editorDoc.grid;
  const target = grid[cell.row][cell.col];
  if (isSpikeChar(target)) return; // Don't let a drag destroy a tuned spike
  if (cell.row === editorDrag.at.row && cell.col === editorDrag.at.col) return;

  // Put back whatever the marker was covering, then pick up the new tile
  grid[editorDrag.at.row][editorDrag.at.col] = editorDrag.under;
  editorDrag.under = target;
  grid[cell.row][cell.col] = editorDrag.char;
  editorDrag.at = cell;
}

// ===== MOUSE INPUT =====

function editorHandleButton(btn) {
  if (btn.id.startsWith('tool:')) {
    editorTool = btn.tool;
    if (editorTool !== 'select' && editorTool !== 'spike') editorSelectedSpike = null;
    return;
  }

  if (btn.id.startsWith('style:')) {
    if (editorDoc.visualStyle !== btn.style) {
      pushEditorUndo();
      editorDoc.visualStyle = btn.style;
      setEditorStatus('Visual style: ' + btn.label, '#cc99ff');
    }
    return;
  }

  if (btn.id.startsWith('spikeDist:')) {
    editorSpikeDistance = btn.distance;
    if (editorSelectedSpike) setSelectedSpikeDistance(btn.distance);
    else editorTool = 'spike';
    return;
  }

  switch (btn.id) {
    case 'back': leaveEditor(); break;
    case 'name': editorNameEditing = true; editorBlink = 0; break;
    case 'preview': editorPreviewMode = !editorPreviewMode; break;
    case 'help': editorShowHelp = !editorShowHelp; break;
    case 'test': editorTestPlay(); break;
    case 'save': saveEditorLevel(false); break;
    case 'grid': editorShowGrid = !editorShowGrid; break;
    case 'undo': editorUndo(); break;
    case 'redo': editorRedo(); break;
    case 'clear': clearEditorLevel(); break;
  }
}

function editorMouseDown(x, y, button, event) {
  if (!editorDoc) return;
  editorModifiers.shift = event.shiftKey;
  editorModifiers.alt = event.altKey;
  editorModifiers.ctrl = event.ctrlKey || event.metaKey;

  if (editorShowHelp) {
    editorShowHelp = false;
    return;
  }

  buildEditorLayout();
  const btn = edButtonAt(x, y);

  // Clicking anywhere else finishes renaming
  if (editorNameEditing && (!btn || btn.id !== 'name')) {
    editorNameEditing = false;
    editorDoc.name = sanitizeLevelName(editorDoc.name);
  }

  if (btn) {
    if (button === 0) editorHandleButton(btn);
    return;
  }

  if (!edPointInGrid(x, y)) return;
  const rightClick = button === 2;

  // Spike handles win over painting so a trap can be tuned without switching tools
  if (!rightClick) {
    const handle = editorHitSpikeHandle(x, y);
    if (handle) {
      editorDrag = Object.assign({ token: beginEditorChange() }, handle);
      commitEditorChange(editorDrag.token);
      return;
    }
  }

  const cell = edScreenToCell(x, y);
  if (!cell) return;
  const char = editorDoc.grid[cell.row][cell.col];

  // SELECT tool: pick a spike to tune, or drag the spawn / door marker
  if (!rightClick && editorTool === 'select') {
    if (isSpikeChar(char)) {
      editorSelectedSpike = { row: cell.row, col: cell.col };
      editorSpikeDistance = parseInt(char, 10) || 0;
      setEditorStatus('Spike selected - drag its ghost, line or handle', '#ffdd33');
    } else if (char === 'S' || char === 'D') {
      editorDrag = {
        type: 'entity', char: char, at: { row: cell.row, col: cell.col }, under: '.',
        token: beginEditorChange()
      };
      commitEditorChange(editorDrag.token);
    } else {
      editorSelectedSpike = null;
    }
    return;
  }

  // Painting / erasing
  const paintChar = rightClick ? '.' : toolChar(editorTool);
  if (paintChar === null) return;

  const token = beginEditorChange();
  if (event.shiftKey) {
    editorDrag = { type: 'rect', anchor: { row: cell.row, col: cell.col }, char: paintChar, token };
  } else {
    editorDrag = { type: 'paint', char: paintChar, last: { row: cell.row, col: cell.col }, token };
    paintEditorLine(cell, cell, paintChar, token);

    // A freshly placed spike is selected and the SELECT tool takes over, so the
    // ghost / trigger / length handles can be dragged straight away.
    if (!rightClick && editorTool === 'spike') {
      editorSelectedSpike = { row: cell.row, col: cell.col };
      editorTool = 'select';
      setEditorStatus('Spike placed - drag its ghost, line or handle. Press K for another spike.', '#ffdd33');
    }
  }
}

function editorMouseMove(x, y, event) {
  if (!editorDoc) return;
  editorModifiers.shift = event.shiftKey;
  editorModifiers.alt = event.altKey;
  editorMouse.x = x;
  editorMouse.y = y;
  editorHoverCell = edPointInGrid(x, y) ? edScreenToCell(x, y) : null;

  if (!editorDrag) return;

  switch (editorDrag.type) {
    case 'paint': {
      const cell = edScreenToCell(
        Math.max(ED_GRID_X, Math.min(ED_GRID_X + ED_GRID_W - 1, x)),
        Math.max(ED_GRID_Y, Math.min(ED_GRID_Y + ED_GRID_H - 1, y))
      );
      if (!cell) return;
      if (cell.row === editorDrag.last.row && cell.col === editorDrag.last.col) return;
      paintEditorLine(editorDrag.last, cell, editorDrag.char, editorDrag.token);
      editorDrag.last = cell;
      if (isSpikeChar(editorDrag.char)) editorSelectedSpike = { row: cell.row, col: cell.col };
      break;
    }
    case 'trigger': updateSpikeTriggerDrag(x); break;
    case 'length': updateSpikeLengthDrag(y); break;
    case 'ghost': updateSpikeGhostDrag(x); break;
    case 'entity': {
      if (editorHoverCell) updateEntityDrag(editorHoverCell);
      break;
    }
  }
}

function editorMouseUp(x, y) {
  if (!editorDoc || !editorDrag) return;

  if (editorDrag.type === 'rect') {
    const cell = editorHoverCell || editorDrag.anchor;
    fillEditorRect(editorDrag.anchor, cell, editorDrag.char, editorDrag.token);
    if (editorDrag.char !== '.' && isSpikeChar(editorDrag.char)) {
      editorSelectedSpike = { row: cell.row, col: cell.col };
    }
  }
  editorDrag = null;
}

// ===== KEYBOARD INPUT =====

function editorHandleNameKey(e) {
  if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
    editorNameEditing = false;
    editorDoc.name = sanitizeLevelName(editorDoc.name);
    editorDirty = true;
    e.preventDefault();
    return;
  }
  if (e.key === 'Backspace') {
    editorDoc.name = editorDoc.name.slice(0, -1);
    editorDirty = true;
    e.preventDefault();
    return;
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && editorDoc.name.length < 28) {
    editorDoc.name += e.key;
    editorDirty = true;
    e.preventDefault();
  }
}

function editorKeyDown(e) {
  if (!editorDoc) return;

  editorModifiers.shift = e.shiftKey;
  editorModifiers.alt = e.altKey;
  editorModifiers.ctrl = e.ctrlKey || e.metaKey;

  if (editorNameEditing) {
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
    editorShowHelp = !editorShowHelp;
    return;
  }

  if (e.code === 'Escape') {
    e.preventDefault();
    if (editorShowHelp) { editorShowHelp = false; return; }
    if (editorSelectedSpike) { editorSelectedSpike = null; return; }
    leaveEditor();
    return;
  }

  if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    e.preventDefault();
    editorTestPlay();
    return;
  }

  if (e.code === 'Tab') {
    e.preventDefault();
    editorPreviewMode = !editorPreviewMode;
    return;
  }

  if (e.code === 'Delete' || e.code === 'Backspace') {
    e.preventDefault();
    deleteSelectedSpike();
    return;
  }

  // Digits: spike range. Retunes the selected spike, otherwise arms the tool.
  if (/^(Digit|Numpad)[0-9]$/.test(e.code)) {
    const distance = parseInt(e.code.slice(-1), 10);
    if (editorSelectedSpike) {
      setSelectedSpikeDistance(distance);
      editorSpikeDistance = distance;
    } else {
      editorSpikeDistance = distance;
      editorTool = 'spike';
    }
    return;
  }

  // Trigger fine-tuning with the arrow keys
  if (editorSelectedSpike && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
    e.preventDefault();
    const meta = getSpikeMeta(editorSelectedSpike.row, editorSelectedSpike.col);

    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      const step = e.shiftKey ? 1 : 0.25;
      // Moving the line right on screen means a smaller (more negative) offset
      meta.trigger = Math.round((meta.trigger + (e.code === 'ArrowLeft' ? step : -step)) * 100) / 100;
    } else if (meta.length === null) {
      // A full-height trigger only reacts to being shortened
      if (e.code === 'ArrowDown') meta.length = 720;
    } else {
      const step = e.shiftKey ? 60 : 20;
      let next = meta.length + (e.code === 'ArrowUp' ? step : -step);
      if (Math.abs(next) < 20) next = e.code === 'ArrowUp' ? 20 : -20;
      meta.length = Math.max(-900, Math.min(900, next));
      // Pushing past the top of the screen means full height again
      if (e.code === 'ArrowUp' && next >= 780) meta.length = null;
    }
    editorDirty = true;
    return;
  }

  // H: snap the selected trigger back to full screen height
  if (e.code === 'KeyH') {
    if (editorSelectedSpike) {
      const meta = getSpikeMeta(editorSelectedSpike.row, editorSelectedSpike.col);
      meta.length = meta.length === null ? 120 : null;
      editorDirty = true;
      setEditorStatus(meta.length === null ? 'Trigger covers the full height' : 'Trigger limited to 120px', '#ffdd33');
    }
    return;
  }

  // Tool shortcuts
  const tool = EDITOR_TOOLS.find(t => t.keyCode === e.code);
  if (tool) {
    editorTool = tool.id;
    if (tool.id !== 'select' && tool.id !== 'spike') editorSelectedSpike = null;
    return;
  }
}
