/*
 * LEVEL_STORAGE.JS - Saving system for player-made levels
 *
 * Player levels are kept in the full DISBELIEVE game's level format (format 3,
 * see levelkit.js), so a level built here can go straight into the full game:
 * as a share code (the full game's "Load from code" reads it), or as a file
 * whose JSON is a level pack's: { "format": 3, "levels": [ ... ] }.
 *
 * Only these levels are stored here. The prototype's own progress (chapters,
 * stars, colours) stays where it always was, in game.js.
 *
 * Stored shape (localStorage 'disbelieveMyLevels'):
 * {
 *   version: 2,
 *   levels: [
 *     {
 *       id: "p-...",                         also the level's id in an exported file
 *       level: { name, style, tiles, start, door, traps, ... },   format 3, without an id
 *       created: 1700000000000, modified: 1700000000000,
 *       stats: { plays: 0, wins: 0, bestDeaths: null, bestTime: null }
 *     }
 *   ]
 * }
 *
 * Levels saved by this prototype's first editor (20 x 12 maps, under
 * 'disbelieveCustomLevels') are converted the first time this runs; the old
 * entry is left as it was.
 */

const CUSTOM_LEVELS_KEY = 'disbelieveMyLevels';
const OLD_CUSTOM_LEVELS_KEY = 'disbelieveCustomLevels';
const CUSTOM_LEVELS_VERSION = 2;

// The playfield is the full game's: 32 x 18 tiles (1920 x 1080 at TILE_SIZE 60).
const EDITOR_COLS = LK.COLS;
const EDITOR_ROWS = LK.ROWS;

// Visual styles a player can pick for their level: the full game's three, drawn in this prototype's looks
const CUSTOM_VISUAL_STYLES = LK.LEVEL_STYLES.map(id => ({ id, label: LK_STYLE_NAMES[id] }));

// ===== BASIC HELPERS =====

function makeCustomLevelId() {
  return 'p-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const freshStats = () => ({ plays: 0, wins: 0, bestDeaths: null, bestTime: null });

// A fresh level is not empty: it has a floor, a start and a door, so a new
// player can press TEST immediately and see something playable.
function createStarterLevel(name) {
  const g = [];
  for (let r = 0; r < EDITOR_ROWS; r++) g.push(Array(EDITOR_COLS).fill(r >= EDITOR_ROWS - 3 ? '#' : '.'));
  g[EDITOR_ROWS - 4][2] = 'P';
  g[EDITOR_ROWS - 4][EDITOR_COLS - 4] = 'D';
  return LK.tidyLevel(Object.assign({ name: sanitizeLevelName(name), style: 'neon' }, LK.gridParts(g)));
}

function createNewCustomLevel(name) {
  const now = Date.now();
  return { id: makeCustomLevelId(), level: createStarterLevel(name), created: now, modified: now, stats: freshStats() };
}

// ===== VALIDATION / SANITISING =====
// Imported files and codes come from other players, so never trust their contents.

function sanitizeLevelName(name) {
  if (typeof name !== 'string') return 'Untitled Level';
  const cleaned = name.replace(/[\r\n\t]/g, ' ').trim().slice(0, 32);
  return cleaned.length > 0 ? cleaned : 'Untitled Level';
}

// Any level object (format 3, or a first-editor 20 x 12 one) as a clean format 3 level without an id; null if it is
// not a level at all. stored: it comes from this save, where even an empty level is a level.
function cleanAnyLevel(raw, stored) {
  if (!raw || typeof raw !== 'object') return null;
  let lv = null;
  if (LK.isOldLevel(raw)) lv = LK.fromOldLevel(raw);
  else if (stored || raw.tiles || raw.start || raw.door || raw.format >= 3) lv = LK.cleanLevel(raw);
  if (!lv) return null;
  delete lv.id;
  lv.name = sanitizeLevelName(lv.name);
  return lv;
}

function sanitizeStats(stats) {
  const safe = freshStats();
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

// A stored record, made safe. A record of the first editor (its level was the record itself) is converted.
function sanitizeCustomLevel(rec) {
  if (!rec || typeof rec !== 'object') return null;
  const level = rec.level ? cleanAnyLevel(rec.level, true) : cleanAnyLevel(rec);
  if (!level) return null;
  const now = Date.now();
  return {
    id: typeof rec.id === 'string' && rec.id.length <= 40 && rec.id !== '★' ? rec.id : makeCustomLevelId(),
    level,
    created: isFinite(rec.created) ? rec.created : now,
    modified: isFinite(rec.modified) ? rec.modified : now,
    stats: sanitizeStats(rec.stats)
  };
}

// ===== LOAD / SAVE =====

function loadCustomLevels() {
  try {
    let raw = localStorage.getItem(CUSTOM_LEVELS_KEY);
    if (!raw) return migrateOldCustomLevels();
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : parsed.levels;
    if (!Array.isArray(list)) return [];
    return list.map(sanitizeCustomLevel).filter(Boolean);
  } catch (e) {
    console.warn('Could not load custom levels:', e);
    return [];
  }
}

// The first editor's levels, once: converted to the full game's size and format.
function migrateOldCustomLevels() {
  let old = null;
  try { old = JSON.parse(localStorage.getItem(OLD_CUSTOM_LEVELS_KEY) || 'null'); } catch (e) { old = null; }
  const list = old && (Array.isArray(old) ? old : old.levels);
  if (!Array.isArray(list) || !list.length) return [];
  const converted = list.map(sanitizeCustomLevel).filter(Boolean);
  persistCustomLevels(converted);
  return converted;
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
  return loadCustomLevels().find(rec => rec.id === id) || null;
}

// Insert or update a level, keeping the rest of the list untouched.
function saveCustomLevel(rec) {
  const clean = sanitizeCustomLevel(rec);
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
  const list = loadCustomLevels().filter(rec => rec.id !== id);
  return persistCustomLevels(list);
}

function duplicateCustomLevel(id) {
  const original = getCustomLevel(id);
  if (!original) return null;

  const copy = JSON.parse(JSON.stringify(original));
  copy.id = makeCustomLevelId();
  copy.level.name = sanitizeLevelName(original.level.name.slice(0, 26) + ' Copy');
  copy.created = Date.now();
  copy.modified = Date.now();
  copy.stats = freshStats();

  const list = loadCustomLevels();
  list.push(copy);
  return persistCustomLevels(list) ? copy : null;
}

// A new record for a level from somewhere else (a file, a code, a link); its name gets a (2) if it is taken.
function addCustomLevel(level, list) {
  const own = !list;
  list = list || loadCustomLevels();
  const now = Date.now();
  const rec = { id: makeCustomLevelId(), level: JSON.parse(JSON.stringify(level)), created: now, modified: now, stats: freshStats() };
  delete rec.level.id;
  if (list.some(other => other.level.name === rec.level.name)) rec.level.name = sanitizeLevelName(rec.level.name.slice(0, 28) + ' (2)');
  list.push(rec);
  if (own && !persistCustomLevels(list)) return null;
  return rec;
}

// Record the outcome of a play session (used by the level browser cards)
function recordCustomLevelPlay(id) {
  const list = loadCustomLevels();
  const rec = list.find(item => item.id === id);
  if (!rec) return;
  rec.stats.plays += 1;
  persistCustomLevels(list);
}

function recordCustomLevelWin(id, levelDeathCount, levelTimeSeconds) {
  const list = loadCustomLevels();
  const rec = list.find(item => item.id === id);
  if (!rec) return;

  rec.stats.wins += 1;
  if (rec.stats.bestDeaths === null || levelDeathCount < rec.stats.bestDeaths) {
    rec.stats.bestDeaths = levelDeathCount;
  }
  if (rec.stats.bestTime === null || levelTimeSeconds < rec.stats.bestTime) {
    rec.stats.bestTime = levelTimeSeconds;
  }
  persistCustomLevels(list);
}

// The level with its id, as a level pack holds it.
function customLevelWithId(rec) {
  return LK.tidyLevel(Object.assign({ id: rec.id }, rec.level));
}

// ===== SHARING =====
// A share code is the level as the full game writes it: paste it into the full game's "Load from code" (My levels),
// or into LOAD CODE here. Opened from a web page, the game shares a link instead, which works in both places too.

// A level's code, or from a web page a link that opens the level (both read the same).
function levelShareText(level) {
  const code = LK.encodeLevel(level);
  return /^https?:$/.test(location.protocol) ? location.href.split('#')[0] + '#lvl=' + code : code;
}

// A pasted code or link: saved as a new level. Returns the record, or null if it could not be read.
function importCustomLevelCode(text) {
  const decoded = LK.decodeLevel(text);
  const level = decoded && cleanAnyLevel(decoded);
  return level ? addCustomLevel(level) : null;
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

// A file is a level pack's JSON: { "format": 3, "levels": [ ... ] }, each level with its id.
function customLevelsFileText(list) {
  return JSON.stringify({ format: LK.LEVEL_FORMAT, levels: list.map(customLevelWithId) }, null, 2) + '\n';
}

function exportCustomLevel(rec) {
  return downloadTextFile(safeFileName(rec.level.name) + '.disbelieve.json', customLevelsFileText([rec]));
}

function exportAllCustomLevels() {
  const list = loadCustomLevels();
  if (list.length === 0) return false;
  return downloadTextFile('disbelieve_levels.json', customLevelsFileText(list));
}

// Accepts a level pack, a single level, a bare array, the first editor's files, or a share code / link.
// Returns { added: number, error: string|null }
function importCustomLevelsFromText(text) {
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const rec = importCustomLevelCode(text);
    return rec ? { added: 1, error: null } : { added: 0, error: 'That file is not valid level data.' };
  }

  let incoming = [];
  if (Array.isArray(parsed)) incoming = parsed;
  else if (parsed && Array.isArray(parsed.levels)) incoming = parsed.levels;
  else if (parsed && typeof parsed === 'object') incoming = [parsed];
  else return { added: 0, error: 'No levels found in that file.' };

  const list = loadCustomLevels();
  let added = 0;
  incoming.forEach(raw => {
    // Imported levels always become new entries so nothing gets overwritten.
    const level = cleanAnyLevel(raw);
    if (level && addCustomLevel(level, list)) added++;
  });

  if (added === 0) return { added: 0, error: 'No readable levels in that file.' };
  if (!persistCustomLevels(list)) return { added: 0, error: 'Could not save the imported levels.' };
  return { added, error: null };
}

// Opens the OS file picker and imports whatever the player chooses.
function promptImportCustomLevels(onDone) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.txt,application/json,text/plain';
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
