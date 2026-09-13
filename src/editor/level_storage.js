/*
 * LEVEL_STORAGE.JS - Saving system for player-made levels
 *
 * Custom levels live in localStorage under a single key. Every level is stored
 * in the SAME format the built-in chapters use (map + spikeTriggers +
 * spikeTriggerLengths), so a player level can be pasted straight into a
 * chapter file, and a chapter level can be pasted into the editor.
 *
 * Stored shape:
 * {
 *   version: 1,
 *   levels: [
 *     {
 *       id: "lvl_...", name: "My Level", visualStyle: "default",
 *       map: ["....", ...], spikeTriggers: [...], spikeTriggerLengths: [...],
 *       created: 1700000000000, modified: 1700000000000,
 *       stats: { plays: 0, wins: 0, bestDeaths: null, bestTime: null }
 *     }
 *   ]
 * }
 */

const CUSTOM_LEVELS_KEY = 'disbelieveCustomLevels';
const CUSTOM_LEVELS_VERSION = 1;

// The playfield is exactly 20 x 12 tiles (1200 x 720 at TILE_SIZE 60),
// so every custom level uses that grid. No scrolling camera exists.
const EDITOR_COLS = 20;
const EDITOR_ROWS = 12;

// Characters the level parser understands. Anything else gets turned into air.
const VALID_LEVEL_CHARS = '.#FIESD0123456789^Gg';

// Visual styles a player can pick for their level (matches chapter styles)
const CUSTOM_VISUAL_STYLES = [
  { id: 'default', label: 'CLASSIC' },
  { id: 'neon', label: 'NEON' },
  { id: 'sketch', label: 'SKETCH' }
];

// ===== BASIC HELPERS =====

function makeCustomLevelId() {
  return 'lvl_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function blankLevelRow() {
  return '.'.repeat(EDITOR_COLS);
}

// A fresh level is not empty: it has a floor, a spawn and a door, so a new
// player can press TEST immediately and see something playable.
function createStarterMap() {
  const map = [];
  for (let r = 0; r < EDITOR_ROWS; r++) map.push(blankLevelRow().split(''));

  const floorRow = EDITOR_ROWS - 2;
  for (let c = 0; c < EDITOR_COLS; c++) map[floorRow][c] = '#';
  map[floorRow - 1][1] = 'S';
  map[floorRow - 1][EDITOR_COLS - 2] = 'D';

  return map.map(row => row.join(''));
}

function createNewCustomLevel(name) {
  const now = Date.now();
  return {
    id: makeCustomLevelId(),
    name: name || 'Untitled Level',
    visualStyle: 'default',
    map: createStarterMap(),
    spikeTriggers: [],
    spikeTriggerLengths: [],
    created: now,
    modified: now,
    stats: { plays: 0, wins: 0, bestDeaths: null, bestTime: null }
  };
}

// ===== VALIDATION / SANITISING =====
// Imported files come from other players, so never trust their contents.

function sanitizeLevelName(name) {
  if (typeof name !== 'string') return 'Untitled Level';
  const cleaned = name.replace(/[\r\n\t]/g, ' ').trim().slice(0, 28);
  return cleaned.length > 0 ? cleaned : 'Untitled Level';
}

function sanitizeLevelMap(map) {
  const rows = [];
  const source = Array.isArray(map) ? map : [];

  for (let r = 0; r < EDITOR_ROWS; r++) {
    const raw = typeof source[r] === 'string' ? source[r] : '';
    let row = '';
    for (let c = 0; c < EDITOR_COLS; c++) {
      const char = raw[c];
      row += (typeof char === 'string' && VALID_LEVEL_CHARS.includes(char)) ? char : '.';
    }
    rows.push(row);
  }
  return rows;
}

function sanitizeNumberArray(arr, allowNull) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 400).map(value => {
    if (value === null || value === undefined) return allowNull ? null : 0;
    const num = Number(value);
    if (!isFinite(num)) return allowNull ? null : 0;
    return num;
  });
}

function sanitizeStats(stats) {
  const safe = { plays: 0, wins: 0, bestDeaths: null, bestTime: null };
  if (!stats || typeof stats !== 'object') return safe;
  // Note: isFinite(null) is true, so null has to be ruled out explicitly or a
  // level that was never finished would report a "best" of 0 deaths.
  const isNumber = value => value !== null && value !== '' && isFinite(value);

  if (isNumber(stats.plays)) safe.plays = Math.max(0, Math.floor(stats.plays));
  if (isNumber(stats.wins)) safe.wins = Math.max(0, Math.floor(stats.wins));
  if (isNumber(stats.bestDeaths)) safe.bestDeaths = Math.max(0, Math.floor(stats.bestDeaths));
  if (isNumber(stats.bestTime)) safe.bestTime = Math.max(0, Number(stats.bestTime));
  return safe;
}

function sanitizeCustomLevel(level) {
  if (!level || typeof level !== 'object') return null;
  if (!Array.isArray(level.map) || level.map.length === 0) return null;

  const style = CUSTOM_VISUAL_STYLES.some(s => s.id === level.visualStyle)
    ? level.visualStyle
    : 'default';

  const now = Date.now();
  return {
    id: typeof level.id === 'string' && level.id.length <= 64 ? level.id : makeCustomLevelId(),
    name: sanitizeLevelName(level.name),
    visualStyle: style,
    map: sanitizeLevelMap(level.map),
    spikeTriggers: sanitizeNumberArray(level.spikeTriggers, false),
    spikeTriggerLengths: sanitizeNumberArray(level.spikeTriggerLengths, true),
    created: isFinite(level.created) ? level.created : now,
    modified: isFinite(level.modified) ? level.modified : now,
    stats: sanitizeStats(level.stats)
  };
}

// ===== LOAD / SAVE =====

function loadCustomLevels() {
  try {
    const raw = localStorage.getItem(CUSTOM_LEVELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : parsed.levels;
    if (!Array.isArray(list)) return [];
    return list.map(sanitizeCustomLevel).filter(Boolean);
  } catch (e) {
    console.warn('Could not load custom levels:', e);
    return [];
  }
}

function persistCustomLevels(list) {
  try {
    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify({
      version: CUSTOM_LEVELS_VERSION,
      levels: list
    }));
    return true;
  } catch (e) {
    console.warn('Could not save custom levels:', e);
    // Most likely the 5MB localStorage quota, which needs a real warning.
    alert('Could not save your level - browser storage is full.\nTry exporting and deleting some old levels.');
    return false;
  }
}

function getCustomLevel(id) {
  return loadCustomLevels().find(level => level.id === id) || null;
}

// Insert or update a level, keeping the rest of the list untouched.
function saveCustomLevel(level) {
  const clean = sanitizeCustomLevel(level);
  if (!clean) return null;

  clean.modified = Date.now();

  const list = loadCustomLevels();
  const index = list.findIndex(item => item.id === clean.id);
  if (index >= 0) {
    clean.created = list[index].created;
    clean.stats = list[index].stats; // never let an editor save wipe play stats
    list[index] = clean;
  } else {
    list.push(clean);
  }

  return persistCustomLevels(list) ? clean : null;
}

function deleteCustomLevel(id) {
  const list = loadCustomLevels().filter(level => level.id !== id);
  return persistCustomLevels(list);
}

function duplicateCustomLevel(id) {
  const original = getCustomLevel(id);
  if (!original) return null;

  const copy = JSON.parse(JSON.stringify(original));
  copy.id = makeCustomLevelId();
  copy.name = sanitizeLevelName(original.name.slice(0, 22) + ' Copy');
  copy.created = Date.now();
  copy.modified = Date.now();
  copy.stats = { plays: 0, wins: 0, bestDeaths: null, bestTime: null };

  const list = loadCustomLevels();
  list.push(copy);
  return persistCustomLevels(list) ? copy : null;
}

// Record the outcome of a play session (used by the level browser cards)
function recordCustomLevelPlay(id) {
  const list = loadCustomLevels();
  const level = list.find(item => item.id === id);
  if (!level) return;
  level.stats.plays += 1;
  persistCustomLevels(list);
}

function recordCustomLevelWin(id, levelDeathCount, levelTimeSeconds) {
  const list = loadCustomLevels();
  const level = list.find(item => item.id === id);
  if (!level) return;

  level.stats.wins += 1;
  if (level.stats.bestDeaths === null || levelDeathCount < level.stats.bestDeaths) {
    level.stats.bestDeaths = levelDeathCount;
  }
  if (level.stats.bestTime === null || levelTimeSeconds < level.stats.bestTime) {
    level.stats.bestTime = levelTimeSeconds;
  }
  persistCustomLevels(list);
}

// ===== PLAYABLE CONVERSION =====
// The game engine expects the plain chapter-level shape, nothing else.

function customLevelToPlayable(level) {
  return {
    name: level.name,
    map: level.map.slice(),
    spikeTriggers: level.spikeTriggers.slice(),
    spikeTriggerLengths: level.spikeTriggerLengths.slice(),
    visualStyle: level.visualStyle,
    isCustom: true
  };
}

// ===== SHARING (EXPORT / IMPORT) =====

function customLevelToShareObject(level) {
  return {
    format: 'disbelieve-level',
    version: CUSTOM_LEVELS_VERSION,
    name: level.name,
    visualStyle: level.visualStyle,
    map: level.map,
    spikeTriggers: level.spikeTriggers,
    spikeTriggerLengths: level.spikeTriggerLengths
  };
}

function downloadTextFile(filename, text) {
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (e) {
    console.warn('Download failed:', e);
    return false;
  }
}

function safeFileName(name) {
  return (name || 'level').replace(/[^a-z0-9_\- ]/gi, '').trim().replace(/\s+/g, '_') || 'level';
}

function exportCustomLevel(level) {
  const text = JSON.stringify(customLevelToShareObject(level), null, 2);
  return downloadTextFile(safeFileName(level.name) + '.disbelieve.json', text);
}

function exportAllCustomLevels() {
  const list = loadCustomLevels();
  if (list.length === 0) return false;
  const text = JSON.stringify({
    format: 'disbelieve-pack',
    version: CUSTOM_LEVELS_VERSION,
    levels: list.map(customLevelToShareObject)
  }, null, 2);
  return downloadTextFile('disbelieve_levels.json', text);
}

// Accepts a single level file, a multi-level pack, or a bare array.
// Returns { added: number, error: string|null }
function importCustomLevelsFromText(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { added: 0, error: 'That file is not valid level data.' };
  }

  let incoming = [];
  if (Array.isArray(parsed)) incoming = parsed;
  else if (Array.isArray(parsed.levels)) incoming = parsed.levels;
  else if (parsed && parsed.map) incoming = [parsed];
  else return { added: 0, error: 'No levels found in that file.' };

  const list = loadCustomLevels();
  let added = 0;

  incoming.forEach(raw => {
    const clean = sanitizeCustomLevel(raw);
    if (!clean) return;
    // Imported levels always become new entries so nothing gets overwritten.
    clean.id = makeCustomLevelId();
    clean.created = Date.now();
    clean.modified = Date.now();
    clean.stats = { plays: 0, wins: 0, bestDeaths: null, bestTime: null };
    if (list.some(existing => existing.name === clean.name)) {
      clean.name = sanitizeLevelName(clean.name.slice(0, 22) + ' (2)');
    }
    list.push(clean);
    added++;
  });

  if (added === 0) return { added: 0, error: 'No readable levels in that file.' };
  if (!persistCustomLevels(list)) return { added: 0, error: 'Could not save the imported levels.' };
  return { added, error: null };
}

// Opens the OS file picker and imports whatever the player chooses.
function promptImportCustomLevels(onDone) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.multiple = true;
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    if (files.length === 0) {
      document.body.removeChild(input);
      return;
    }

    let pending = files.length;
    let totalAdded = 0;
    let lastError = null;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = importCustomLevelsFromText(String(reader.result || ''));
        totalAdded += result.added;
        if (result.error) lastError = result.error;
        if (--pending === 0) {
          document.body.removeChild(input);
          if (onDone) onDone(totalAdded, totalAdded > 0 ? null : lastError);
        }
      };
      reader.onerror = () => {
        lastError = 'Could not read that file.';
        if (--pending === 0) {
          document.body.removeChild(input);
          if (onDone) onDone(totalAdded, totalAdded > 0 ? null : lastError);
        }
      };
      reader.readAsText(file);
    });
  });

  input.click();
}
