/*
 * CUSTOM_LEVELS.JS - "My Levels" screen and playing player-made levels
 *
 * This is the hub between the editor and the game: it lists everything the
 * player has built, and it starts / ends a custom play session.
 */

// ===== PLAY SESSIONS =====

// Start playing a stored custom level. returnState is where ESC / finishing
// the level takes the player back to ('customLevels' or 'editor').
function startCustomLevelSession(level, returnState) {
  customLevelSession = {
    id: level.id || null,
    returnState: returnState || 'customLevels',
    data: customLevelToPlayable(level),
    // A stand-in "chapter" so the engine can read the visual style
    chapter: {
      name: 'Custom Levels',
      visualStyle: level.visualStyle || 'default',
      levels: []
    }
  };

  levelDeaths = 0;
  levelTime = 0;
  parseLevel();
  resetPlayer();

  if (returnState !== 'editor' && level.id) recordCustomLevelPlay(level.id);

  updateStats();
  transitionToState('playing');
}

function restartCustomLevelSession() {
  if (!customLevelSession) return;
  levelDeaths = 0;
  levelTime = 0;
  parseLevel();
  resetPlayer();
  gameState = 'playing';
}

function endCustomLevelSession() {
  const target = customLevelSession ? customLevelSession.returnState : 'menu';
  transitionToState(target);
}

// Called by the engine right after a state transition finishes.
function onGameStateEntered(state) {
  if (state !== 'playing' && state !== 'paused' && state !== 'levelComplete') {
    customLevelSession = null;
  }
  if (state === 'customLevels') refreshCustomLevelBrowser();

  // Keep the caption under the canvas in step with the editor screens
  const nameElement = document.getElementById('levelName');
  if (nameElement) {
    if (state === 'editor') nameElement.textContent = 'Level Editor';
    else if (state === 'customLevels') nameElement.textContent = 'My Levels';
  }
}

// Small banner while a custom level is running
function drawCustomSessionOverlay() {
  if (!customLevelSession) return;
  const testing = customLevelSession.returnState === 'editor';

  const text = testing
    ? 'TEST MODE  •  ESC back to editor  •  R restart'
    : 'CUSTOM LEVEL  •  ESC menu  •  R restart';

  ctx.font = 'bold 15px Arial, sans-serif';
  const width = ctx.measureText(text).width + 28;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(canvas.width / 2 - width / 2, 8, width, 28);
  ctx.strokeStyle = testing ? '#ffcc44' : '#66aaff';
  ctx.lineWidth = 1;
  ctx.strokeRect(canvas.width / 2 - width / 2 + 0.5, 8.5, width - 1, 27);

  ctx.fillStyle = testing ? '#ffcc44' : '#88ccff';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, 27);
  ctx.textAlign = 'left';
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
  push('new', 620, 26, 190, 40);
  push('import', 820, 26, 160, 40);
  push('exportAll', 990, 26, 180, 40);

  const pageLevels = customLevelList.slice(customLevelPage * CL_PER_PAGE, customLevelPage * CL_PER_PAGE + CL_PER_PAGE);

  pageLevels.forEach((level, i) => {
    const col = i % CL_COLS;
    const row = Math.floor(i / CL_COLS);
    const x = 60 + col * (CL_CARD_W + 30);
    const y = 140 + row * (CL_CARD_H + 20);

    push('play:' + level.id, x + 10, y + 186, 96, 34, { level });
    push('edit:' + level.id, x + 112, y + 186, 84, 34, { level });
    push('copy:' + level.id, x + 202, y + 186, 34, 34, { level });
    push('export:' + level.id, x + 240, y + 186, 34, 34, { level });
    push('delete:' + level.id, x + 278, y + 186, 34, 34, { level });
    push('card:' + level.id, x, y, CL_CARD_W, 180, { level, isCard: true });
  });

  if (customLevelList.length > CL_PER_PAGE) {
    push('prevPage', 480, 648, 60, 34);
    push('nextPage', 660, 648, 60, 34);
  }

  if (customLevelList.length === 0) {
    push('createFirst', canvas.width / 2 - 170, 370, 340, 56);
    push('importFirst', canvas.width / 2 - 110, 442, 220, 44);
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

// Tiny map preview drawn with flat colours - readable at thumbnail size.
function drawLevelThumbnail(level, x, y, w, h) {
  ctx.fillStyle = '#15151c';
  ctx.fillRect(x, y, w, h);

  const scale = Math.min(w / (EDITOR_COLS * TILE_SIZE), h / (EDITOR_ROWS * TILE_SIZE));
  const tile = TILE_SIZE * scale;
  const offsetX = x + (w - EDITOR_COLS * tile) / 2;
  const offsetY = y + (h - EDITOR_ROWS * tile) / 2;

  const map = level.map;
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r].length; c++) {
      const char = map[r][c];
      if (char === '.') continue;
      const tx = offsetX + c * tile;
      const ty = offsetY + r * tile;

      if (char === '#') {
        ctx.fillStyle = '#7a7a86';
        ctx.fillRect(tx, ty, tile, tile);
      } else if (char === 'F') {
        ctx.fillStyle = 'rgba(255, 102, 204, 0.55)';
        ctx.fillRect(tx, ty, tile, tile);
      } else if (char === 'I') {
        ctx.strokeStyle = 'rgba(68, 221, 221, 0.7)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx + 0.5, ty + 0.5, tile - 1, tile - 1);
      } else if (char === 'E') {
        ctx.fillStyle = '#8a6a3a';
        ctx.fillRect(tx, ty, tile, tile);
      } else if (char === 'G' || char === 'g') {
        ctx.fillStyle = 'rgba(140, 102, 255, 0.45)';
        ctx.fillRect(tx, ty, tile, tile);
      } else if (char === 'S') {
        ctx.fillStyle = '#44aaff';
        ctx.fillRect(tx + tile * 0.15, ty + tile * 0.15, tile * 0.7, tile * 0.7);
      } else if (char === 'D') {
        ctx.fillStyle = '#44ff88';
        ctx.fillRect(tx + tile * 0.1, ty + tile * 0.05, tile * 0.8, tile * 0.9);
      } else if (/[0-9^]/.test(char)) {
        ctx.fillStyle = '#ff4455';
        ctx.beginPath();
        ctx.moveTo(tx + tile / 2, ty + tile * 0.2);
        ctx.lineTo(tx + tile, ty + tile);
        ctx.lineTo(tx, ty + tile);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

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

function formatCustomLevelMeta(level) {
  const parts = [];
  if (level.stats.bestDeaths === null) {
    parts.push('Not finished yet');
  } else {
    parts.push('Best: ' + level.stats.bestDeaths + (level.stats.bestDeaths === 1 ? ' death' : ' deaths'));
  }
  parts.push(level.stats.plays + (level.stats.plays === 1 ? ' play' : ' plays'));

  let spikeCount = 0;
  level.map.forEach(row => {
    for (const char of row) if (/[0-9^]/.test(char)) spikeCount++;
  });
  parts.push(spikeCount + ' spikes');
  return parts.join('  •  ');
}

function drawCustomLevelBrowser() {
  customLevelHint = '';
  buildCustomLevelLayout();

  ctx.fillStyle = '#22222c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#9844ff';
  ctx.font = 'bold 44px Impact, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('MY LEVELS', 168, 54);
  ctx.fillStyle = '#8a8a9c';
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText('Build your own deceptions - then share them', 170, 78);

  const byId = id => customLevelButtons.find(b => b.id === id);
  clDrawButton(byId('back'), '◀ BACK');
  clDrawButton(byId('new'), '+ NEW LEVEL', { color: '#2f5f9a', hoverColor: '#3a74bd', border: '#88ccff' });
  clDrawButton(byId('import'), 'IMPORT', { hint: 'Load level files other players sent you' });
  clDrawButton(byId('exportAll'), 'EXPORT ALL', { hint: 'Save every level you made to one file' });

  if (customLevelList.length === 0) {
    ctx.fillStyle = '#6f6f80';
    ctx.font = '22px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('You have not built anything yet.', canvas.width / 2, 290);
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText('Paint platforms, drop a spike, drag its trigger - that is the whole editor.', canvas.width / 2, 322);
    ctx.textAlign = 'left';

    clDrawButton(byId('createFirst'), 'CREATE YOUR FIRST LEVEL', {
      color: '#2f5f9a', hoverColor: '#3a74bd', border: '#88ccff', font: 'bold 22px Arial, sans-serif'
    });
    clDrawButton(byId('importFirst'), 'IMPORT A LEVEL FILE', { font: 'bold 15px Arial, sans-serif' });
    return;
  }

  const pageLevels = customLevelList.slice(customLevelPage * CL_PER_PAGE, customLevelPage * CL_PER_PAGE + CL_PER_PAGE);

  pageLevels.forEach((level, i) => {
    const col = i % CL_COLS;
    const row = Math.floor(i / CL_COLS);
    const x = 60 + col * (CL_CARD_W + 30);
    const y = 140 + row * (CL_CARD_H + 20);

    const cardHovered = mouseX >= x && mouseX <= x + CL_CARD_W && mouseY >= y && mouseY <= y + CL_CARD_H;

    ctx.fillStyle = '#2b2b36';
    ctx.fillRect(x, y, CL_CARD_W, CL_CARD_H);
    ctx.strokeStyle = cardHovered ? '#7a7a9c' : '#3f3f4e';
    ctx.lineWidth = cardHovered ? 2 : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, CL_CARD_W - 1, CL_CARD_H - 1);

    drawLevelThumbnail(level, x + 70, y + 10, 200, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 10, y + 134, 320, 24);
    ctx.clip();
    ctx.fillText(level.name, x + 10, y + 152);
    ctx.restore();

    ctx.fillStyle = '#8a8a9c';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText(formatCustomLevelMeta(level), x + 10, y + 172);

    clDrawButton(byId('play:' + level.id), '▶ PLAY', {
      color: '#2f7a3f', hoverColor: '#389a4d', border: '#66ff99', hint: 'Play "' + level.name + '"'
    });
    clDrawButton(byId('edit:' + level.id), 'EDIT', { hint: 'Open "' + level.name + '" in the editor' });
    clDrawButton(byId('copy:' + level.id), '⧉', { font: 'bold 17px Arial, sans-serif', hint: 'Duplicate this level' });
    clDrawButton(byId('export:' + level.id), '↑', { font: 'bold 19px Arial, sans-serif', hint: 'Export to a file you can share' });
    clDrawButton(byId('delete:' + level.id), '✕', {
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
    ctx.fillText('Page ' + (customLevelPage + 1) + ' / ' + pages, canvas.width / 2, 670);
    ctx.textAlign = 'left';
  }

  if (customLevelHint) {
    ctx.fillStyle = '#8a8a9c';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText(customLevelHint, 30, 700);
  }
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
    case 'import':
    case 'importFirst':
      promptImportCustomLevels((added, error) => {
        refreshCustomLevelBrowser();
        if (error) alert(error);
        else alert(added + (added === 1 ? ' level imported!' : ' levels imported!'));
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

  const level = getCustomLevel(id);
  if (!level) {
    refreshCustomLevelBrowser();
    return;
  }

  switch (action) {
    case 'play':
    case 'card': {
      const problems = [];
      if (!level.map.some(row => row.includes('S'))) problems.push('a spawn point');
      if (!level.map.some(row => row.includes('D'))) problems.push('a door');
      if (problems.length > 0) {
        alert('"' + level.name + '" is missing ' + problems.join(' and ') + '.\nOpen it in the editor to finish it.');
        return;
      }
      startCustomLevelSession(level, 'customLevels');
      return;
    }
    case 'edit':
      openEditor(level, 'customLevels');
      return;
    case 'copy':
      if (duplicateCustomLevel(id)) {
        refreshCustomLevelBrowser();
        customLevelPage = 0;
      }
      return;
    case 'export':
      exportCustomLevel(level);
      return;
    case 'delete':
      if (confirm('Delete "' + level.name + '" for good?\nExport it first if you want to keep a copy.')) {
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
  if (e.code === 'KeyN') {
    openEditorForNewLevel();
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
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

canvas.addEventListener('mousedown', (event) => {
  if (gameState !== 'editor') return;
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
  const p = editorCanvasPoint(event);
  editorMouseUp(p.x, p.y);
});

canvas.addEventListener('contextmenu', (event) => {
  if (gameState === 'editor') event.preventDefault();
});

window.addEventListener('keydown', (event) => {
  if (gameState === 'editor') {
    editorKeyDown(event);
  } else if (gameState === 'customLevels') {
    handleCustomLevelKey(event);
  }
});
