/*
 * CUSTOM_LEVELS.JS - "My Levels" screen and playing player-made levels
 *
 * This is the hub between the editor and the game: it lists everything the
 * player has built, shares and loads levels, and it starts / ends a custom
 * play session (the level itself runs in level_play.js).
 */

// ===== PLAY SESSIONS =====

// Start playing a stored custom level (a record: { id, level }). returnState is where ESC / finishing the level takes
// the player back to ('customLevels', 'editor', or 'menu' for a level opened from a link).
function startCustomLevelSession(rec, returnState) {
  const level = Object.assign({ id: rec.id || '★' }, rec.level);
  customLevelSession = {
    id: rec.id || null,
    returnState: returnState || 'customLevels',
    data: { name: level.name },
    // A stand-in "chapter" so the engine can read the visual style
    chapter: { name: 'Custom Levels', visualStyle: LK_LOOK[level.style] || 'default', levels: [] }
  };

  levelDeaths = 0;
  levelTime = 0;
  startLevelPlay(level);

  if (returnState !== 'editor' && rec.id) recordCustomLevelPlay(rec.id);

  updateStats();
  transitionToState('playing');
}

function restartCustomLevelSession() {
  if (!customLevelSession) return;
  restartLevelPlay();
  gameState = 'playing';
}

function endCustomLevelSession() {
  const target = customLevelSession ? customLevelSession.returnState : 'menu';
  transitionToState(target);
}

// Called by the engine right after a state transition finishes.
function onGameStateEntered(state) {
  // (SETTINGS opened from the pause menu goes back to the level)
  if (state !== 'playing' && state !== 'paused' && state !== 'levelComplete' && state !== 'settings') {
    customLevelSession = null;
    LKP = null;
  }
  if (state === 'customLevels') refreshCustomLevelBrowser();

  // Keep the caption under the canvas in step with the editor screens
  const nameElement = document.getElementById('levelName');
  if (nameElement) {
    if (state === 'editor') nameElement.textContent = 'Level Editor';
    else if (state === 'customLevels') nameElement.textContent = 'My Levels';
  }
}

// Small banner while a custom level is running, in the strip over it
function drawCustomSessionOverlay() {
  if (!customLevelSession) return;
  const testing = customLevelSession.returnState === 'editor';

  const text = testing
    ? 'TEST MODE  ·  ESC back to editor  ·  R restart'
    : 'CUSTOM LEVEL  ·  ESC menu  ·  R restart';

  const accent = testing ? '#ffcc44' : '#44aaff';
  ctx.font = 'bold 14px Arial, sans-serif';
  const width = ctx.measureText(text).width + 40;
  const x = GAME_WIDTH / 2 - width / 2;

  // Rounded pill in the shared menu style, with a soft accent glow
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = 12;
  uiRoundRect(x, 8, width, 30, 15);
  ctx.fillStyle = 'rgba(18, 16, 27, 0.9)';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = accent;
  ctx.textAlign = 'center';
  ctx.fillText(text, GAME_WIDTH / 2, 28);
  ctx.textAlign = 'left';
}

// ===== SHARING =====

// Puts a share code or link on the clipboard; where that is not allowed, shows it to copy by hand. done(copied)
function copyShareText(text, done) {
  const show = () => { window.prompt('Copy this and send it to a friend:', text); if (done) done(false); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => { if (done) done(true); }, show);
  } else {
    show();
  }
}

// A code or link pasted in: saved as a new level.
function promptLoadLevelCode() {
  const text = window.prompt('Paste a share code or link.\nCodes from the full game work too.', '');
  if (!text) return;
  const rec = importCustomLevelCode(text);
  if (!rec) { alert('That code could not be read. Check that you pasted the whole code or link.'); return; }
  refreshCustomLevelBrowser();
  customLevelPage = 0;
  customLevelNotice('Loaded "' + rec.level.name + '"');
}

// A link with #lvl=... in it opens straight into its level, which is kept in My Levels too.
function openSharedLevelFromLink() {
  if (!location.hash.includes('lvl=')) return;
  const level = LK.decodeLevel(location.hash);
  if (!level) return;
  delete level.id;
  const code = LK.encodeLevel(level);
  let rec = loadCustomLevels().find(other => LK.encodeLevel(other.level) === code);
  if (!rec) rec = addCustomLevel(level);
  if (rec) startCustomLevelSession(rec, 'menu');
}

// ===== "MY LEVELS" BROWSER =====

const CL_CARD_W = 340;
const CL_CARD_H = 230;
const CL_COLS = 3;
const CL_ROWS = 2;
const CL_PER_PAGE = CL_COLS * CL_ROWS;

let customLevelList = [];
let customLevelPage = 0;
let customLevelButtons = [];
let customLevelHint = '';
let customLevelNoticeText = '';
let customLevelNoticeUntil = 0;

function customLevelNotice(text) {
  customLevelNoticeText = text;
  customLevelNoticeUntil = performance.now() + 3500;
}

function refreshCustomLevelBrowser() {
  customLevelList = loadCustomLevels().sort((a, b) => b.modified - a.modified);
  const maxPage = Math.max(0, Math.ceil(customLevelList.length / CL_PER_PAGE) - 1);
  if (customLevelPage > maxPage) customLevelPage = maxPage;
}

function openCustomLevelBrowser() {
  refreshCustomLevelBrowser();
  customLevelPage = 0;
  transitionToState('customLevels');
}

function buildCustomLevelLayout() {
  const b = [];
  const push = (id, x, y, w, h, extra) => b.push(Object.assign({ id, x, y, w, h }, extra || {}));

  push('back', 30, 26, 110, 40);
  push('new', 500, 26, 170, 40);
  push('code', 678, 26, 146, 40);
  push('import', 832, 26, 150, 40);
  push('exportAll', 990, 26, 180, 40);

  const pageLevels = customLevelList.slice(customLevelPage * CL_PER_PAGE, customLevelPage * CL_PER_PAGE + CL_PER_PAGE);

  pageLevels.forEach((rec, i) => {
    const col = i % CL_COLS;
    const row = Math.floor(i / CL_COLS);
    const x = 60 + col * (CL_CARD_W + 30);
    const y = 130 + row * (CL_CARD_H + 20);

    push('play:' + rec.id, x + 10, y + 188, 80, 32, { rec });
    push('edit:' + rec.id, x + 96, y + 188, 60, 32, { rec });
    push('share:' + rec.id, x + 162, y + 188, 64, 32, { rec });
    push('copy:' + rec.id, x + 232, y + 188, 32, 32, { rec });
    push('export:' + rec.id, x + 268, y + 188, 32, 32, { rec });
    push('delete:' + rec.id, x + 304, y + 188, 32, 32, { rec });
    push('card:' + rec.id, x, y, CL_CARD_W, 180, { rec, isCard: true });
  });

  if (customLevelList.length > CL_PER_PAGE) {
    push('prevPage', 480, 638, 60, 34);
    push('nextPage', 660, 638, 60, 34);
  }

  if (customLevelList.length === 0) {
    push('createFirst', GAME_WIDTH / 2 - 170, 370, 340, 56);
    push('importFirst', GAME_WIDTH / 2 - 160, 442, 150, 44);
    push('codeFirst', GAME_WIDTH / 2 + 10, 442, 150, 44);
  }

  customLevelButtons = b;
  return b;
}

function clButtonAt(x, y) {
  for (let i = customLevelButtons.length - 1; i >= 0; i--) {
    const btn = customLevelButtons[i];
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) return btn;
  }
  return null;
}

// Tiny map preview drawn with flat colours - readable at thumbnail size. Fakes look like ground and invisible blocks
// are faint, as in the game: a thumbnail gives nothing away.
const CL_THUMB_BG = { gray: '#141418', neon: '#0a0c2c', paper: '#f5f5dc' };
const CL_THUMB_SOLID = { gray: '#50505c', neon: '#2b6cff', paper: '#3a3a3a' };
function drawLevelThumbnail(level, x, y, w, h) {
  const style = LK.LEVEL_STYLES.includes(level.style) ? level.style : 'neon';
  const tile = Math.min(w / EDITOR_COLS, h / EDITOR_ROWS);
  const ox = x + (w - EDITOR_COLS * tile) / 2;
  const oy = y + (h - EDITOR_ROWS * tile) / 2;
  const solid = CL_THUMB_SOLID[style];
  const colors = {
    '#': solid, F: solid, I: 'rgba(68,221,255,.25)', C: '#8a6a4a', '^': '#ff3355', '>': '#ff3355', 'v': '#ff3355', '<': '#ff3355',
    u: 'rgba(68,221,255,.6)', d: 'rgba(255,68,221,.6)', P: '#44aaff', D: '#33ee77', X: '#33ee77'
  };

  ctx.fillStyle = '#15151c';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = CL_THUMB_BG[style];
  ctx.fillRect(ox, oy, EDITOR_COLS * tile, EDITOR_ROWS * tile);
  for (const z of level.flips || []) {
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(ox + z.c * tile, oy + z.r * tile, z.w * tile, z.h * tile);
  }
  LK.levelGrid(level).forEach((row, r) => row.forEach((ch, c) => {
    if (!colors[ch]) return;
    ctx.fillStyle = colors[ch];
    ctx.fillRect(ox + c * tile, oy + r * tile, Math.ceil(tile), Math.ceil(tile));
  }));
  ctx.fillStyle = '#ff3355';
  for (const tp of level.traps || []) for (const s of tp.slides || []) ctx.fillRect(ox + s.c * tile, oy + (s.r + 0.5) * tile, tile, tile / 2);

  ctx.strokeStyle = '#3a3a48';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function clDrawButton(btn, label, opts) {
  const o = opts || {};
  const hovered = mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h;
  if (hovered && o.hint) customLevelHint = o.hint;

  ctx.fillStyle = hovered ? (o.hoverColor || '#3d3d4c') : (o.color || '#2e2e38');
  ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
  ctx.strokeStyle = hovered ? (o.hoverBorder || '#8a8aa0') : (o.border || '#4a4a58');
  ctx.lineWidth = hovered ? 2 : 1;
  ctx.strokeRect(btn.x + 0.5, btn.y + 0.5, btn.w - 1, btn.h - 1);

  ctx.fillStyle = o.textColor || '#e8e8f0';
  ctx.font = o.font || 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

function formatCustomLevelMeta(rec) {
  const parts = [];
  if (rec.stats.bestDeaths === null) {
    parts.push('Not finished yet');
  } else {
    parts.push('Best: ' + rec.stats.bestDeaths + (rec.stats.bestDeaths === 1 ? ' death' : ' deaths'));
  }
  parts.push(rec.stats.plays + (rec.stats.plays === 1 ? ' play' : ' plays'));
  const traps = (rec.level.traps || []).length;
  parts.push(traps + (traps === 1 ? ' trap' : ' traps'));
  parts.push(LK_STYLE_NAMES[rec.level.style] || 'NEON');
  return parts.join('  •  ');
}

function drawCustomLevelBrowser() {
  customLevelHint = '';
  buildCustomLevelLayout();

  ctx.fillStyle = '#22222c';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = '#9844ff';
  ctx.font = 'bold 44px Impact, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('MY LEVELS', 168, 54);
  ctx.fillStyle = '#8a8a9c';
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText('Build your own deceptions - for the full game', 170, 78);

  const byId = id => customLevelButtons.find(b => b.id === id);
  clDrawButton(byId('back'), '◀ BACK');
  clDrawButton(byId('new'), '+ NEW LEVEL', { color: '#2f5f9a', hoverColor: '#3a74bd', border: '#88ccff' });
  clDrawButton(byId('code'), 'LOAD CODE', { hint: 'Paste a share code or link: from a friend, or from the full game' });
  clDrawButton(byId('import'), 'IMPORT', { hint: 'Load level files other players sent you' });
  clDrawButton(byId('exportAll'), 'EXPORT ALL', { hint: 'Save every level you made to one file, ready for the full game' });

  if (customLevelList.length === 0) {
    ctx.fillStyle = '#6f6f80';
    ctx.font = '22px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('You have not built anything yet.', GAME_WIDTH / 2, 290);
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText('Paint platforms, aim a hidden spike, drag its trigger - that is the whole editor.', GAME_WIDTH / 2, 322);
    ctx.textAlign = 'left';

    clDrawButton(byId('createFirst'), 'CREATE YOUR FIRST LEVEL', {
      color: '#2f5f9a', hoverColor: '#3a74bd', border: '#88ccff', font: 'bold 22px Arial, sans-serif'
    });
    clDrawButton(byId('importFirst'), 'IMPORT A FILE', { font: 'bold 15px Arial, sans-serif' });
    clDrawButton(byId('codeFirst'), 'LOAD A CODE', { font: 'bold 15px Arial, sans-serif' });
  } else {
    const pageLevels = customLevelList.slice(customLevelPage * CL_PER_PAGE, customLevelPage * CL_PER_PAGE + CL_PER_PAGE);

    pageLevels.forEach((rec, i) => {
      const col = i % CL_COLS;
      const row = Math.floor(i / CL_COLS);
      const x = 60 + col * (CL_CARD_W + 30);
      const y = 130 + row * (CL_CARD_H + 20);
      const name = rec.level.name;

      const cardHovered = mouseX >= x && mouseX <= x + CL_CARD_W && mouseY >= y && mouseY <= y + CL_CARD_H;

      ctx.fillStyle = '#2b2b36';
      ctx.fillRect(x, y, CL_CARD_W, CL_CARD_H);
      ctx.strokeStyle = cardHovered ? '#7a7a9c' : '#3f3f4e';
      ctx.lineWidth = cardHovered ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, CL_CARD_W - 1, CL_CARD_H - 1);

      drawLevelThumbnail(rec.level, x + 58, y + 8, 224, 126);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 10, y + 138, 320, 24);
      ctx.clip();
      ctx.fillText(name, x + 10, y + 156);
      ctx.restore();

      ctx.fillStyle = '#8a8a9c';
      ctx.font = '12px Arial, sans-serif';
      ctx.fillText(formatCustomLevelMeta(rec), x + 10, y + 176);

      clDrawButton(byId('play:' + rec.id), '▶ PLAY', {
        color: '#2f7a3f', hoverColor: '#389a4d', border: '#66ff99', hint: 'Play "' + name + '"'
      });
      clDrawButton(byId('edit:' + rec.id), 'EDIT', { hint: 'Open "' + name + '" in the editor' });
      clDrawButton(byId('share:' + rec.id), 'SHARE', { font: 'bold 13px Arial, sans-serif', hint: 'Copy a share code: friends paste it into LOAD CODE, you into the full game' });
      clDrawButton(byId('copy:' + rec.id), '⧉', { font: 'bold 17px Arial, sans-serif', hint: 'Duplicate this level' });
      clDrawButton(byId('export:' + rec.id), '↑', { font: 'bold 19px Arial, sans-serif', hint: 'Export to a file you can share' });
      clDrawButton(byId('delete:' + rec.id), '✕', {
        font: 'bold 16px Arial, sans-serif', textColor: '#ff9999', hint: 'Delete this level for good'
      });
    });

    if (customLevelList.length > CL_PER_PAGE) {
      const pages = Math.ceil(customLevelList.length / CL_PER_PAGE);
      clDrawButton(byId('prevPage'), '◀');
      clDrawButton(byId('nextPage'), '▶');
      ctx.fillStyle = '#aaaab8';
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Page ' + (customLevelPage + 1) + ' / ' + pages, GAME_WIDTH / 2, 660);
      ctx.textAlign = 'left';
    }
  }

  const notice = performance.now() < customLevelNoticeUntil;
  ctx.fillStyle = notice ? '#88ff88' : '#8a8a9c';
  ctx.font = notice ? 'bold 14px Arial, sans-serif' : '14px Arial, sans-serif';
  ctx.fillText(notice ? customLevelNoticeText : customLevelHint || 'N  new level      L  load code      F  fullscreen      ESC  menu', 30, 700);
}

function handleCustomLevelClick(x, y) {
  buildCustomLevelLayout();
  const btn = clButtonAt(x, y);
  if (!btn) return;

  const [action, id] = btn.id.split(':');

  switch (action) {
    case 'back':
      transitionToState('menu');
      return;
    case 'new':
    case 'createFirst':
      openEditorForNewLevel();
      return;
    case 'code':
    case 'codeFirst':
      promptLoadLevelCode();
      return;
    case 'import':
    case 'importFirst':
      promptImportCustomLevels((added, error) => {
        refreshCustomLevelBrowser();
        customLevelPage = 0;
        if (error) alert(error);
        else customLevelNotice(added + (added === 1 ? ' level imported' : ' levels imported'));
      });
      return;
    case 'exportAll':
      if (!exportAllCustomLevels()) alert('There is nothing to export yet.');
      return;
    case 'prevPage':
      customLevelPage = Math.max(0, customLevelPage - 1);
      return;
    case 'nextPage':
      customLevelPage = Math.min(Math.ceil(customLevelList.length / CL_PER_PAGE) - 1, customLevelPage + 1);
      return;
  }

  const rec = getCustomLevel(id);
  if (!rec) {
    refreshCustomLevelBrowser();
    return;
  }
  const name = rec.level.name;

  switch (action) {
    case 'play':
    case 'card': {
      const bad = LK.checkLevel(rec.level).filter(p => p.bad);
      if (bad.length > 0) {
        alert('"' + name + '" cannot be played yet:\n' + bad.map(p => p.text).join('\n') + '\nOpen it in the editor to finish it.');
        return;
      }
      startCustomLevelSession(rec, 'customLevels');
      return;
    }
    case 'edit':
      openEditor(rec, 'customLevels');
      return;
    case 'share': {
      const text = levelShareText(rec.level), what = text.includes('#lvl=') ? 'link' : 'code';
      copyShareText(text, ok => customLevelNotice(ok ? 'Share ' + what + ' for "' + name + '" copied' : 'Share ' + what + ' shown'));
      return;
    }
    case 'copy':
      if (duplicateCustomLevel(id)) {
        refreshCustomLevelBrowser();
        customLevelPage = 0;
      }
      return;
    case 'export':
      exportCustomLevel(rec);
      return;
    case 'delete':
      if (confirm('Delete "' + name + '" for good?\nExport it first if you want to keep a copy.')) {
        deleteCustomLevel(id);
        refreshCustomLevelBrowser();
      }
      return;
  }
}

function handleCustomLevelKey(e) {
  if (e.code === 'Escape') {
    transitionToState('menu');
    return;
  }
  if (e.code === 'KeyF') {
    toggleFullscreen();
    return;
  }
  if (e.code === 'KeyN') {
    openEditorForNewLevel();
    return;
  }
  if (e.code === 'KeyL') {
    promptLoadLevelCode();
    return;
  }
  if (e.code === 'ArrowLeft') {
    customLevelPage = Math.max(0, customLevelPage - 1);
    return;
  }
  if (e.code === 'ArrowRight') {
    const pages = Math.ceil(customLevelList.length / CL_PER_PAGE);
    customLevelPage = Math.min(Math.max(0, pages - 1), customLevelPage + 1);
  }
}

// ===== EVENT WIRING (only active on the editor screens) =====

function editorCanvasPoint(event) {
  return canvasPointFromEvent(event); // Fixed game space, whatever size the canvas is drawn at
}

canvas.addEventListener('mousedown', (event) => {
  if (gameState !== 'editor' || transitionState !== 'none') return;
  const p = editorCanvasPoint(event);
  editorMouseDown(p.x, p.y, event.button, event);
});

canvas.addEventListener('mousemove', (event) => {
  if (gameState !== 'editor') return;
  const p = editorCanvasPoint(event);
  editorMouseMove(p.x, p.y, event);
});

window.addEventListener('mouseup', (event) => {
  if (gameState !== 'editor') return;
  editorMouseUp();
});

canvas.addEventListener('contextmenu', (event) => {
  if (gameState === 'editor') event.preventDefault();
});

window.addEventListener('keydown', (event) => {
  if (transitionState !== 'none') return;
  if (gameState === 'editor') {
    editorKeyDown(event);
  } else if (gameState === 'customLevels') {
    handleCustomLevelKey(event);
  }
});

// Opened from a share link: straight into its level
openSharedLevelFromLink();
