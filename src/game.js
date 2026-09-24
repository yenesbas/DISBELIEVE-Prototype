// Disbelieve Prototype - game.js
// All game logic in one file

// Removed detailed level-building guide and debug tips to separate files:
// - See 'level_guide.md' for how to build levels
// - See 'debug_and_design_tips.md' for debug mode and design tips

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ===== DISPLAY =====
// The whole game is drawn in a fixed 1200x720 coordinate space, so every
// layout number in this file (and in the editor) is written against these two
// constants and never against the canvas element itself. The canvas is then
// stretched to fit the window - or the entire screen in fullscreen - and its
// backing store follows the display's pixel density, so the same drawing code
// stays sharp at any size. See layoutDisplay() and applyDisplayTransform().
const GAME_WIDTH = 1200;
const GAME_HEIGHT = 720;

// Used when the page around the canvas cannot be measured for some reason.
const WINDOWED_CHROME_FALLBACK = 300;
const WINDOWED_SIDE_MARGIN = 24;
// Past three times the game's own resolution the extra pixels cost more than
// they show, even on a 5K screen.
const MAX_BACKING_SCALE = 3;
const DISPLAY_SETTINGS_KEY = 'disbelieveDisplay';

const gameStage = document.getElementById('gameStage');

let fullscreenPreferred = false; // The last choice the player made, remembered
let fullscreenRestoreDone = false;
let fullscreenRequestPending = false; // A request is in flight (they are async)
let fullscreenRequestTimer = null;    // Gives up on a request that never answers
let fullscreenWasActive = false;      // Last state the game reacted to

function isFullscreenActive() {
  const el = document.fullscreenElement || document.webkitFullscreenElement;
  return !!el && (el === gameStage || el === canvas || el.contains(canvas));
}

function fullscreenSupported() {
  if (!gameStage) return false;
  if (document.fullscreenEnabled === false || document.webkitFullscreenEnabled === false) return false;
  return !!(gameStage.requestFullscreen || gameStage.webkitRequestFullscreen);
}

// How much vertical room the page needs around the canvas: the title and
// controls above it, the death counter below it, the gaps between them and the
// stage's own frame. Measured rather than assumed, because that text rewraps.
function measurePageChrome() {
  const container = gameStage && gameStage.parentElement;
  if (!container) return WINDOWED_CHROME_FALLBACK;

  let used = 0;
  for (let i = 0; i < container.children.length; i++) {
    const child = container.children[i];
    if (child !== gameStage) used += child.getBoundingClientRect().height;
  }

  const containerStyle = window.getComputedStyle(container);
  const gap = parseFloat(containerStyle.rowGap) || 0;
  used += gap * Math.max(0, container.children.length - 1);

  const bodyStyle = window.getComputedStyle(document.body);
  used += (parseFloat(bodyStyle.paddingTop) || 0) + (parseFloat(bodyStyle.paddingBottom) || 0);
  used += Math.max(0, gameStage.offsetHeight - canvas.offsetHeight); // the stage's border

  return used;
}

// Fit the canvas into the space available, keeping the 5:3 shape: the whole
// screen in fullscreen, otherwise the window minus the text around the game.
function layoutDisplay() {
  const fullscreen = isFullscreenActive();

  // CSS pixels per game pixel: as large as the space allows, in a window as
  // much as on the whole screen. Nothing is laid out in page pixels any more,
  // so the game can be bigger than the 1200x720 it is authored at.
  let scale = fullscreen
    ? Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT)
    : Math.min((window.innerWidth - WINDOWED_SIDE_MARGIN) / GAME_WIDTH,
               (window.innerHeight - measurePageChrome()) / GAME_HEIGHT);
  scale = Math.max(scale, 0.3);

  const cssW = Math.round(GAME_WIDTH * scale);
  const cssH = Math.round(GAME_HEIGHT * scale);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';

  // Draw at the display's real pixel density so text and edges stay crisp
  // instead of being upscaled from 1200x720.
  const dpr = window.devicePixelRatio || 1;
  const density = Math.min(scale * dpr, MAX_BACKING_SCALE);
  const backingW = Math.round(GAME_WIDTH * density);
  const backingH = Math.round(GAME_HEIGHT * density);
  if (canvas.width !== backingW || canvas.height !== backingH) {
    // Resizing clears the canvas; the next frame draws everything again.
    canvas.width = backingW;
    canvas.height = backingH;
  }

  // Nearest-neighbour only while the backing store lands on whole device
  // pixels; past the density cap it would double pixels unevenly, and smooth
  // scaling looks better than that.
  canvas.style.imageRendering = Math.abs(backingW - cssW * dpr) < 1 ? 'pixelated' : 'auto';

  document.body.classList.toggle('fullscreen', fullscreen);
}

// Browsers fire fullscreenchange before the viewport has finished resizing,
// so the size read during the event can be the old one. Lay out again once the
// next frames have landed.
function relayoutSoon() {
  requestAnimationFrame(layoutDisplay);
  setTimeout(layoutDisplay, 150);
}

// Every frame starts here: map the fixed game space onto the backing store.
function applyDisplayTransform() {
  ctx.setTransform(canvas.width / GAME_WIDTH, 0, 0, canvas.height / GAME_HEIGHT, 0, 0);
}

// Turn a page position (a mouse event) into game coordinates.
function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (GAME_WIDTH / rect.width),
    y: (event.clientY - rect.top) * (GAME_HEIGHT / rect.height)
  };
}

function loadDisplaySettings() {
  try {
    const saved = localStorage.getItem(DISPLAY_SETTINGS_KEY);
    if (saved) fullscreenPreferred = !!JSON.parse(saved).fullscreen;
  } catch (e) {
    // A blocked localStorage just means there is no remembered preference
  }
}

function saveDisplaySettings() {
  try {
    localStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify({ fullscreen: fullscreenPreferred }));
  } catch (e) {
    console.warn('Could not save display settings:', e);
  }
}

// A one-line message for the rare case where fullscreen is refused. The menus
// already have a notice line; the editor has its own status bar.
function showDisplayNotice(text) {
  if (gameState === 'editor' && typeof setEditorStatus === 'function') {
    setEditorStatus(text, '#ffaa55');
  } else {
    menuNotice = text;
    menuNoticeTimer = 4;
  }
  console.warn(text);
}

function enterFullscreen() {
  if (fullscreenRequestPending || isFullscreenActive()) return;
  if (!fullscreenSupported()) {
    fullscreenPreferred = false;
    saveDisplaySettings();
    showDisplayNotice('FULLSCREEN IS NOT AVAILABLE IN THIS BROWSER');
    return;
  }
  const refused = () => {
    clearTimeout(fullscreenRequestTimer);
    fullscreenRequestPending = false;
    fullscreenPreferred = false;
    saveDisplaySettings();
    showDisplayNotice('THE BROWSER BLOCKED FULLSCREEN');
  };
  const request = gameStage.requestFullscreen || gameStage.webkitRequestFullscreen;
  fullscreenRequestPending = true;
  // Some browsers leave a refused request hanging - neither resolved nor
  // rejected - and that must not block the next attempt for good.
  clearTimeout(fullscreenRequestTimer);
  fullscreenRequestTimer = setTimeout(() => { fullscreenRequestPending = false; }, 1500);
  try {
    const result = request.call(gameStage, { navigationUI: 'hide' });
    if (result && result.catch) result.catch(refused);
  } catch (e) {
    refused();
  }
}

function exitFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (!exit) return;
  try {
    const result = exit.call(document);
    if (result && result.catch) result.catch(() => {});
  } catch (e) {
    // Already out of fullscreen
  }
}

// The one entry point behind the F key, the settings toggle, the pause menu
// and the editor's FULL button.
function toggleFullscreen() {
  fullscreenRestoreDone = true; // The player has chosen; nothing left to restore
  if (isFullscreenActive()) {
    fullscreenPreferred = false;
    saveDisplaySettings();
    exitFullscreen();
  } else {
    fullscreenPreferred = true;
    saveDisplaySettings();
    enterFullscreen();
  }
}

function onFullscreenChange() {
  clearTimeout(fullscreenRequestTimer);
  fullscreenRequestPending = false;
  const fullscreen = isFullscreenActive();
  fullscreenWasActive = fullscreen;
  layoutDisplay();
  relayoutSoon();

  // Leaving through the browser's own ESC counts as a choice too
  if (fullscreenPreferred !== fullscreen) {
    fullscreenPreferred = fullscreen;
    saveDisplaySettings();
  }

  // ESC is taken by the browser to leave fullscreen, so the keypress never
  // reaches the game and the player loses the pause menu they asked for -
  // and a level would keep running while the window resizes. Pause for them.
  if (!fullscreen && gameState === 'playing') {
    gameState = 'paused';
  }
}

// Not every browser fires fullscreenchange reliably - leaving fullscreen can
// go unannounced - so the game loop watches the state as well. Reading
// document.fullscreenElement is cheap; it forces no layout.
function pollFullscreenState() {
  if (isFullscreenActive() !== fullscreenWasActive) onFullscreenChange();
}

// Browsers only allow fullscreen from a user gesture, so a preference carried
// over from the last session waits for the player's first click or keypress.
function restoreFullscreenOnFirstGesture() {
  if (!fullscreenPreferred) return;
  const tryRestore = () => {
    if (fullscreenRestoreDone) return;
    fullscreenRestoreDone = true;
    if (fullscreenPreferred && !isFullscreenActive()) enterFullscreen();
  };
  window.addEventListener('pointerdown', tryRestore, { once: true });
  window.addEventListener('keydown', tryRestore, { once: true });
}

function setupDisplay() {
  loadDisplaySettings();
  fullscreenWasActive = isFullscreenActive();
  layoutDisplay();
  window.addEventListener('resize', layoutDisplay);
  window.addEventListener('orientationchange', layoutDisplay);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);
  restoreFullscreenOnFirstGesture();
}

// The level name and death counter live in the page below the canvas. In
// fullscreen there is no page, so draw them into the corner instead.
function drawFullscreenHud() {
  const active = getActiveLevelData();
  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = '15px monospace';
  if (active && active.name) {
    ctx.fillStyle = 'rgba(232, 228, 245, 0.5)';
    ctx.fillText(active.name, GAME_WIDTH - 16, 26);
  }
  ctx.fillStyle = 'rgba(255, 120, 120, 0.65)';
  ctx.fillText('DEATHS ' + deaths, GAME_WIDTH - 16, 46);
  ctx.restore();
  ctx.textAlign = 'left';
}

// Game constants
const TILE_SIZE = 60;
const GRAVITY = 2100 * 1.5; // Adjusted for time-based physics
const JUMP_FORCE = -840 * 1.25; // Adjusted for time-based physics
const MOVE_SPEED = 380; // Adjusted for time-based physics
const SPIKE_TRIGGER_DISTANCE = 420;
const SPIKE_MOVE_DISTANCE = TILE_SIZE * 2;
const COYOTE_TIME_DURATION = 0.1; // 100ms window to jump after leaving platform

// ===== SPIKE TRAPS =====
// A spike travels `digit` tiles (the character on the map) along one of these
// unit vectors, so a diagonal trap covers exactly the same distance as a
// straight one. 'right' is the classic behaviour and stays the default.
const SPIKE_DIRECTIONS = {
  right:     { dx:  1, dy:  0, arrow: '\u2192' },
  left:      { dx: -1, dy:  0, arrow: '\u2190' },
  up:        { dx:  0, dy: -1, arrow: '\u2191' },
  down:      { dx:  0, dy:  1, arrow: '\u2193' },
  upRight:   { dx:  Math.SQRT1_2, dy: -Math.SQRT1_2, arrow: '\u2197' },
  upLeft:    { dx: -Math.SQRT1_2, dy: -Math.SQRT1_2, arrow: '\u2196' },
  downRight: { dx:  Math.SQRT1_2, dy:  Math.SQRT1_2, arrow: '\u2198' },
  downLeft:  { dx: -Math.SQRT1_2, dy:  Math.SQRT1_2, arrow: '\u2199' }
};
const SPIKE_DIRECTION_IDS = Object.keys(SPIKE_DIRECTIONS);
const DEFAULT_SPIKE_DIRECTION = 'right';

// How quickly a triggered spike covers its distance: the dash takes
// 1 / speed seconds, so 5 is the classic 0.2s snap and 1 is a slow creep.
const DEFAULT_SPIKE_SPEED = 5;
const MIN_SPIKE_SPEED = 0.5;
const MAX_SPIKE_SPEED = 20;

function normalizeSpikeDirection(name) {
  return SPIKE_DIRECTIONS[name] ? name : DEFAULT_SPIKE_DIRECTION;
}

function getSpikeDirectionVector(name) {
  return SPIKE_DIRECTIONS[normalizeSpikeDirection(name)];
}

function normalizeSpikeSpeed(value) {
  const speed = Number(value);
  if (!isFinite(speed) || speed <= 0) return DEFAULT_SPIKE_SPEED;
  return Math.max(MIN_SPIKE_SPEED, Math.min(MAX_SPIKE_SPEED, speed));
}

// Closest of the eight directions to a free vector - used by the editor when
// the ghost block is dragged somewhere off-axis.
function spikeDirectionFromVector(dx, dy) {
  if (dx === 0 && dy === 0) return DEFAULT_SPIKE_DIRECTION;
  const length = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / length;
  const uy = dy / length;

  let best = DEFAULT_SPIKE_DIRECTION;
  let bestDot = -Infinity;
  SPIKE_DIRECTION_IDS.forEach(id => {
    const v = SPIKE_DIRECTIONS[id];
    const dot = ux * v.dx + uy * v.dy;
    if (dot > bestDot) {
      bestDot = dot;
      best = id;
    }
  });
  return best;
}

// Crumbling platform constants (Chapter 3 mechanic)
const CRUMBLE_DELAY = 0.6;           // Seconds player stands on it before it falls
const CRUMBLE_FALL_DURATION = 0.35;  // Seconds the fall animation takes
const CRUMBLE_RESET_DELAY = 3.0;     // Seconds until platform respawns
const CRUMBLE_RESPAWN_DURATION = 0.5; // Seconds the respawn fade-in takes

// Sound system
const sounds = {
  // Short beep sound for jump
  jump: new Audio('Sounds/player_jump.mp3'),
  // Short click sound for spike
  spike: new Audio('Sounds/spike_move.mp3'),
  // Level end victory (played when a level completes, except for final chapter end)
  level_end: new Audio('Sounds/level_end_victory.mp3'),
  // Chapter end (played when all levels completed)
  chapter_end: new Audio('Sounds/chapter_end.mp3'),
  // Background music (loops)
  music: new Audio('Sounds/main_menu.mp3'),
  // Death sound
  death: new Audio('Sounds/player_death.mp3')
};

// Volume controls (0.0 - 1.0)
let masterVolume = 1.0;
let musicVolume = 0.1;
let sfxVolume = 1.0;

// Initialize all sounds
Object.values(sounds).forEach(sound => {
  sound.preload = 'auto';
});

// Ensure music loops
if (sounds.music) {
  sounds.music.loop = true;
}

// Update volumes for all sounds (applies music and master scaling)
function updateVolumes() {
  // Music gets its own musicVolume * master
  if (sounds.music) sounds.music.volume = masterVolume * musicVolume;

  // SFX base volume is set when playing (we preserve original volume property as max)
  // But set a default here for any static sounds
  ['jump', 'spike', 'level_end', 'chapter_end', 'death'].forEach(key => {
    if (sounds[key]) sounds[key].volume = masterVolume * sfxVolume;
  });
}

// Setters used by UI
function setMasterVolume(v) { masterVolume = Math.max(0, Math.min(1, v)); updateVolumes(); }
function setMusicVolume(v) { musicVolume = Math.max(0, Math.min(1, v)); updateVolumes(); }
function setSfxVolume(v) { sfxVolume = Math.max(0, Math.min(1, v)); updateVolumes(); }

// Play background music (safe-guard with .catch())
function playMusic() {
  if (!sounds.music) return;
  try {
    sounds.music.currentTime = 0;
    sounds.music.play().catch(err => {
      // May be blocked until user interaction; ignore silently
    });
  } catch (err) {
    // ignore
  }
}

function pauseMusic() {
  if (!sounds.music) return;
  try { sounds.music.pause(); } catch (e) {}
}

// Try to enable audio on first user interaction (helps with autoplay restrictions)
let audioEnabled = false;
function tryEnableAudio() {
  if (audioEnabled) return;
  audioEnabled = true;
  updateVolumes();
  playMusic();
}

// Simple function to play a sound with error handling and volume scaling
function playSound(soundName) {
  const sound = sounds[soundName];
  if (!sound) return;

  try {
    // SFX should respect master * sfxVolume
    if (soundName !== 'music') {
      sound.volume = masterVolume * sfxVolume;
      sound.currentTime = 0; // reset
      sound.play().catch(err => {
        console.error('Error playing sound:', soundName, err);
      });
    } else {
      // For music key (not used here) just try to play/pause
      playMusic();
    }
  } catch (err) {
    console.error('Error playing sound:', soundName, err);
  }
}

// Wire audio sliders from the HTML and initialize their values
function setupAudioControls() {
  // Update volumes to initial defaults
  updateVolumes();
  // HTML sliders have been removed - volume control is now handled in the settings menu
}

// Level data is now loaded from levels.js
// The chapters array and levels array are defined there

// Legacy compatibility - flatten chapters into single levels array for backwards compatibility
const levels = [];
chapters.forEach(chapter => {
  levels.push(...chapter.levels);
  // Add bonus level at the end of each chapter if it exists
  if (chapter.bonusLevel) {
    levels.push(chapter.bonusLevel);
  }
});

// Helper functions for chapter/level management
function getChapterFromGlobalLevel(globalLevelIndex) {
  let currentIndex = 0;
  
  for (let i = 0; i < chapters.length; i++) {
    const chapterRegularLevels = chapters[i].levels.length;
    const chapterHasBonus = chapters[i].bonusLevel ? 1 : 0;
    const chapterTotalLevels = chapterRegularLevels + chapterHasBonus;
    
    if (globalLevelIndex < currentIndex + chapterTotalLevels) {
      return i;
    }
    currentIndex += chapterTotalLevels;
  }
  
  return 0; // Default to first chapter
}

function getLevelInChapterFromGlobalLevel(globalLevelIndex) {
  let currentIndex = 0;
  
  for (let i = 0; i < chapters.length; i++) {
    const chapterRegularLevels = chapters[i].levels.length;
    const chapterHasBonus = chapters[i].bonusLevel ? 1 : 0;
    const chapterTotalLevels = chapterRegularLevels + chapterHasBonus;
    
    if (globalLevelIndex < currentIndex + chapterTotalLevels) {
      return globalLevelIndex - currentIndex;
    }
    currentIndex += chapterTotalLevels;
  }
  
  return 0; // Default to first level
}

function getGlobalLevelIndex(chapterIndex, levelInChapter) {
  let globalIndex = 0;
  
  // Add all regular levels from previous chapters
  for (let i = 0; i < chapterIndex; i++) {
    globalIndex += chapters[i].levels.length;
    // Add bonus level count for previous chapters
    if (chapters[i].bonusLevel) {
      globalIndex += 1;
    }
  }
  
  // Add the specific level within current chapter
  globalIndex += levelInChapter;
  
  return globalIndex;
}

function getCurrentChapterInfo() {
  if (currentChapter >= 0 && currentChapter < chapters.length) {
    return chapters[currentChapter];
  }
  return null;
}

function getCurrentLevelInfo() {
  const chapterInfo = getCurrentChapterInfo();
  if (chapterInfo && currentLevelInChapter >= 0 && currentLevelInChapter < chapterInfo.levels.length) {
    return chapterInfo.levels[currentLevelInChapter];
  }
  return null;
}

// Visual Style System - Each chapter has unique rendering style
function getCurrentVisualStyle() {
  // Custom levels carry their own style, picked in the editor
  if (customLevelSession) return customLevelSession.chapter.visualStyle || 'default';
  const chapterInfo = getCurrentChapterInfo();
  return chapterInfo?.visualStyle || 'default';
}

// Glitch effect state
let glitchOffset = { x: 0, y: 0 };
let glitchTimer = 0;
let nextGlitchTime = Math.random() * 2;

function updateGlitchEffect(deltaTime) {
  glitchTimer += deltaTime;
  if (glitchTimer >= nextGlitchTime) {
    glitchOffset.x = (Math.random() - 0.5) * 8;
    glitchOffset.y = (Math.random() - 0.5) * 8;
    glitchTimer = 0;
    nextGlitchTime = 0.05 + Math.random() * 0.15;
  }
}

// Sketch wobble effect
let sketchWobble = 0;
function updateSketchWobble(deltaTime) {
  sketchWobble += deltaTime * 2;
}

// ===== CUSTOM LEVELS (LEVEL EDITOR) =====
// While the player is testing or playing one of their own levels the engine
// reads the level from here instead of the built-in chapters.
// Defined in src/editor/ - see custom_levels.js.
let customLevelSession = null;

// The level the engine should currently run (built-in level, or custom one)
function getActiveLevelData() {
  return customLevelSession ? customLevelSession.data : levels[currentLevel];
}

// The chapter that level belongs to (custom levels get a stand-in chapter)
function getActiveChapterData() {
  return customLevelSession ? customLevelSession.chapter : chapters[currentChapter];
}

// Game state
let gameState = 'menu'; // 'menu', 'settings', 'chapterSelect', 'levelSelect', 'playing', 'levelComplete', 'paused', 'customLevels', 'editor'
let previousGameState = null; // Store previous state to return to after settings
let currentChapter = 0;
let currentLevel = 0;
let currentLevelInChapter = 0; // 0-based index within the current chapter
let player = null;
let platforms = [];
let fakeBlocks = []; // Blocks that look solid but player passes through
let invisiblePlatforms = []; // Platforms that are solid but completely invisible
let crumblingPlatforms = []; // Platforms that crumble/erase when stepped on (Chapter 3)
let spikes = [];
let gravityZones = []; // Areas that flip or modify gravity
let door = null;
let spawnPoint = null; // Custom spawn point set by 'S' in level map
let deaths = 0;
let levelDeaths = 0;
let levelTime = 0; // Time spent in current level (in seconds)
let isDead = false;
let deathFlashTimer = 0;
let levelCompleteTimer = 0;
let coyoteTime = 0; // Time remaining to allow jump after leaving platform
const DEATH_FLASH_DURATION = 0.2;
const LEVEL_COMPLETE_DURATION = 1.5;

// Customization unlock notification
let showUnlockNotification = false;
let unlockedItems = []; // Array of {type: 'color'|'trail', name: string, value: string}

// Transition animations
let transitionState = 'none'; // 'none', 'fadeOut', 'fadeIn'
let transitionAlpha = 0;
let transitionSpeed = 3; // Speed of fade transitions
let pendingGameState = null; // State to transition to after fade out

// Level progression system
let completedLevels = new Set(); // Stores global level indices that have been completed
let levelStars = {}; // Stores star ratings (1-3) for each level: { globalLevelIndex: stars }

// Player customization
let playerColor = '#44aaff'; // Default blue (unlocked starter color)
let playerTrail = 'none'; // 'none', 'fade', 'particles', 'dotted', 'dash'
let trailHistory = []; // Store recent positions for trail effect

const playerColors = [
  { name: 'Blue', value: '#44aaff', unlockChapter: -1 }, // Always unlocked (starter color)
  { name: 'Green', value: '#44ff88', unlockChapter: -1 }, // Always unlocked
  { name: 'Purple', value: '#8c44ff', unlockChapter: 0 }, // Chapter 1 color
  { name: 'Orange', value: '#ff8844', unlockChapter: 2 }, // Chapter 3 color
  { name: 'Red', value: '#ff4444', unlockChapter: 4 }, // Future chapter
  { name: 'Cyan', value: '#44ffff', unlockChapter: 5 }, // Future chapter
  { name: 'Pink', value: '#ff44aa', unlockChapter: 6 } // Future chapter
];

const playerTrails = [
  { name: 'None', value: 'none', description: 'No trail', unlockChapter: -1 }, // Always unlocked
  { name: 'Fade', value: 'fade', description: 'Fading trail', unlockChapter: -1 }, // Always unlocked
  { name: 'Dotted', value: 'dotted', description: 'Dotted line trail', unlockChapter: 0 }, // Unlock after Chapter 1
  { name: 'Particles', value: 'particles', description: 'Particle effect', unlockChapter: 1 }, // Unlock after Chapter 2
  { name: 'Dash', value: 'dash', description: 'Dashed segments', unlockChapter: 2 } // Unlock after Chapter 3
];

// Star rating thresholds (deaths required for each star)
const STAR_THRESHOLDS = {
  3: 0,   // 3 stars: 0 deaths (perfect!)
  2: 3,   // 2 stars: 1-3 deaths
  1: 10   // 1 star: 4-10 deaths
  // 0 stars: more than 10 deaths
};

// Calculate stars based on deaths in current level
function calculateStars(deaths) {
  if (deaths === STAR_THRESHOLDS[3]) return 3;
  if (deaths <= STAR_THRESHOLDS[2]) return 2;
  if (deaths <= STAR_THRESHOLDS[1]) return 1;
  return 0;
}

// Load/save progress from localStorage
function loadProgress() {
  try {
    const saved = localStorage.getItem('disbelieveProgress');
    if (saved) {
      const parsed = JSON.parse(saved);
      completedLevels = new Set(parsed.completedLevels || []);
      levelStars = parsed.levelStars || {};
      playerColor = parsed.playerColor || '#44aaff';
      playerTrail = parsed.playerTrail || 'none';
    }
  } catch (e) {
    console.warn('Could not load progress:', e);
  }
}

function saveProgress() {
  try {
    const data = {
      completedLevels: Array.from(completedLevels),
      levelStars: levelStars,
      playerColor: playerColor,
      playerTrail: playerTrail
    };
    localStorage.setItem('disbelieveProgress', JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save progress:', e);
  }
}

function resetProgress() {
  completedLevels = new Set();
  levelStars = {};
  playerColor = '#44aaff'; // Reset to default blue
  playerTrail = 'none';
  deaths = 0;
  localStorage.removeItem('disbelieveProgress');
  console.log('Progress has been reset!');
}

function isChapterCompleted(chapterIndex) {
  if (chapterIndex >= chapters.length) return false;
  
  // Check if all 10 regular levels in the chapter are completed
  for (let i = 0; i < chapters[chapterIndex].levels.length; i++) {
    const globalIndex = getGlobalLevelIndex(chapterIndex, i);
    if (!completedLevels.has(globalIndex)) return false;
  }
  
  return true;
}

function isLevelUnlocked(chapterIndex, levelInChapter) {
  if (DEVELOPER_MODE) return true; // Developer mode unlocks all levels
  // First level of first chapter is always unlocked
  if (chapterIndex === 0 && levelInChapter === 0) return true;
  
  // For first level of a chapter (not chapter 1), check if previous chapter is completed
  if (levelInChapter === 0 && chapterIndex > 0) {
    // Previous chapter must be completed (all 10 regular levels, bonus NOT required)
    return isChapterCompleted(chapterIndex - 1);
  }
  
  // For levels within a chapter, check if previous level in same chapter is completed
  const globalIndex = getGlobalLevelIndex(chapterIndex, levelInChapter);
  const previousGlobalIndex = globalIndex - 1;
  
  return completedLevels.has(previousGlobalIndex);
}

function isBonusLevelUnlocked(chapterIndex) {
  if (DEVELOPER_MODE) return true; // Developer mode unlocks all bonus levels
  // Bonus level unlocks when level 10 of the chapter is completed
  const level10GlobalIndex = getGlobalLevelIndex(chapterIndex, 9); // Level 10 = index 9
  return completedLevels.has(level10GlobalIndex);
}

// Check if a color is unlocked
function isColorUnlocked(color) {
  if (DEVELOPER_MODE) return true; // Developer mode unlocks everything
  if (color.unlockChapter === -1) return true; // Always unlocked
  return isChapterCompleted(color.unlockChapter);
}

// Check if a trail is unlocked
function isTrailUnlocked(trail) {
  if (DEVELOPER_MODE) return true; // Developer mode unlocks everything
  if (trail.unlockChapter === -1) return true; // Always unlocked
  return isChapterCompleted(trail.unlockChapter);
}

// ===== LEVEL EDITOR UNLOCK =====
// The editor is earned, not given: every story level has to be finished AND
// the player needs a two-star average across all of them. With three full
// chapters that is 30 levels and 60 of the 90 possible stars.
const EDITOR_UNLOCK_STAR_AVERAGE = 2;

function getStoryLevelTotal() {
  // Bonus levels are optional, so they never count towards the unlock
  return chapters.reduce((total, chapter) => total + chapter.levels.length, 0);
}

// Everything the menu needs to show how close the player is
function getEditorUnlockProgress() {
  const totalLevels = getStoryLevelTotal();
  let completed = 0;
  let stars = 0;

  chapters.forEach((chapter, chapterIndex) => {
    for (let i = 0; i < chapter.levels.length; i++) {
      const globalIndex = getGlobalLevelIndex(chapterIndex, i);
      if (completedLevels.has(globalIndex)) completed++;
      stars += levelStars[globalIndex] || 0;
    }
  });

  const requiredStars = totalLevels * EDITOR_UNLOCK_STAR_AVERAGE;
  return {
    totalLevels: totalLevels,
    completed: completed,
    stars: stars,
    requiredStars: requiredStars,
    maxStars: totalLevels * 3,
    levelsLeft: Math.max(0, totalLevels - completed),
    starsLeft: Math.max(0, requiredStars - stars),
    unlocked: completed >= totalLevels && stars >= requiredStars
  };
}

function isLevelEditorUnlocked() {
  if (DEVELOPER_MODE) return true; // Developer mode unlocks everything
  return getEditorUnlockProgress().unlocked;
}

// The unlock requirement in one line, for the menu's info panel
function getEditorUnlockHint() {
  const progress = getEditorUnlockProgress();
  if (progress.unlocked) return '';
  return 'Finish all ' + progress.totalLevels + ' levels with ' +
         progress.requiredStars + '\u2605 to unlock.';
}

// Menu notice shown when a locked option is clicked
let menuNotice = '';
let menuNoticeTimer = 0;

// Single entry point for the MY LEVELS button, from mouse and keyboard alike
function tryOpenLevelEditor() {
  if (!isLevelEditorUnlocked()) {
    const progress = getEditorUnlockProgress();
    menuNotice = 'LOCKED - you have ' + progress.completed + '/' + progress.totalLevels +
                 ' levels and ' + progress.stars + '/' + progress.requiredStars + ' \u2605 needed';
    menuNoticeTimer = 4;
    return;
  }
  openCustomLevelBrowser();
}

function getBonusLevelGlobalIndex(chapterIndex) {
  // Calculate global index for bonus level
  // Bonus levels are placed after regular levels: chapter levels + previous bonus levels
  let globalIndex = 0;
  for (let i = 0; i < chapterIndex; i++) {
    globalIndex += chapters[i].levels.length;
    if (chapters[i].bonusLevel) globalIndex += 1; // Add bonus level if exists
  }
  globalIndex += chapters[chapterIndex].levels.length; // Add regular levels for current chapter
  return globalIndex;
}

function markLevelComplete(globalIndex) {
  completedLevels.add(globalIndex);
  
  // Calculate and save star rating
  const stars = calculateStars(levelDeaths);
  const currentStars = levelStars[globalIndex] || 0;
  
  // Only update if new rating is better
  if (stars > currentStars) {
    levelStars[globalIndex] = stars;
  }
  
  saveProgress();
}

// Helper function to start a transition to a new game state
function transitionToState(newState) {
  pendingGameState = newState;
  transitionState = 'fadeOut';
  transitionAlpha = 0;
  selectedButtonIndex = 0; // Reset button selection when transitioning
}

// Get current active buttons based on game state
function getCurrentButtons() {
  let buttons = [];
  if (gameState === 'menu') buttons = window.menuButtons || [];
  else if (gameState === 'chapterSelect') buttons = window.chapterButtons || [];
  else if (gameState === 'levelSelect') buttons = window.levelButtons ? window.levelButtons.filter(b => b.isUnlocked !== false) : [];
  else if (gameState === 'customize') buttons = window.customizeButtons ? window.customizeButtons.filter(b => b.unlocked !== false && b.action !== 'back') : [];
  else if (gameState === 'paused') buttons = window.pauseButtons || [];
  else if (gameState === 'settings') buttons = window.settingsButtons || [];
  
  // Add buttonIndex to each button for keyboard navigation
  buttons.forEach((btn, idx) => {
    btn.buttonIndex = idx;
  });
  
  return buttons;
}

// MASTER DEBUG SWITCH - Set to false to disable ALL debug features
const ENABLE_DEBUG_FEATURES = true;

// DEBUG MODE - Only works if ENABLE_DEBUG_FEATURES is true
let DEBUG_MODE = false;

// DEVELOPER MODE - Secret cheat code activated
let DEVELOPER_MODE = false;

// GRAVITY ZONES FEATURE - Set to true to enable gravity flip zones
const ENABLE_GRAVITY_ZONES = true;

// Input handling
const keys = {
  left: false,
  right: false,
  space: false,
  r: false
};

// Mouse position tracking for hover effects
let mouseX = 0;
let mouseY = 0;

// Keyboard navigation
let selectedButtonIndex = 0; // Index of currently selected button for keyboard navigation

// Secret cheat code tracking
let recentKeys = ''; // Track recent keypresses for cheat code
const CHEAT_CODE = 'lolipop'; // Secret code to activate developer mode

// Track document visibility
let isVisible = true;

// Game state variables
let isPaused = false;
let lastTime = 0;

function pauseGame() {
    isPaused = true;
    // Reset all controls
    keys.left = false;
    keys.right = false;
    keys.space = false;
    keys.r = false;
    // Stop player movement
    if (player) {
        player.vx = 0;
        player.vy = 0; // Also stop vertical movement
    }
}

function resumeGame() {
    isPaused = false;
    lastTime = performance.now();
}

// Initialize game
function init() {
  loadProgress(); // Load saved progress
  setupDisplay(); // Size the canvas to the window / screen (see DISPLAY above)
  setupAudioControls();
  // Attempt to enable audio when the user interacts (click or key) to satisfy browser autoplay policies
  document.addEventListener('click', tryEnableAudio, { once: true });
  document.addEventListener('keydown', tryEnableAudio, { once: true });

  // Handle visibility change (alt-tab, switching tabs, etc.)
  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
    if (!isVisible) {
      // Reset all controls when tab becomes invisible
      keys.left = false;
      keys.right = false;
      keys.space = false;
      keys.r = false;
      if (player) {
        player.vx = 0;
      }
    }
  });

  // Handle window blur/focus
  window.addEventListener('blur', () => {
    pauseGame();
  });

  window.addEventListener('focus', () => {
    resumeGame();
  });

  // Start game loop
  lastTime = performance.now();
  gameLoop();
}

// Load a specific level by chapter and level within chapter
function loadLevelFromChapter(chapterIndex, levelInChapter) {
  customLevelSession = null; // Built-in level: leave any custom level behind
  currentChapter = chapterIndex;
  currentLevelInChapter = levelInChapter;
  currentLevel = getGlobalLevelIndex(chapterIndex, levelInChapter);
  levelDeaths = 0;
  levelTime = 0;
  parseLevel();
  resetPlayer();
  gameState = 'playing';
}

// Load a specific level by global index (for backwards compatibility)
function loadLevel(globalLevelIndex) {
  customLevelSession = null; // Built-in level: leave any custom level behind
  currentLevel = globalLevelIndex;
  currentChapter = getChapterFromGlobalLevel(globalLevelIndex);
  currentLevelInChapter = getLevelInChapterFromGlobalLevel(globalLevelIndex);
  levelDeaths = 0;
  levelTime = 0;
  parseLevel();
  resetPlayer();
  gameState = 'playing';
}

// Parse level from string array
function parseLevel() {
  platforms = [];
  fakeBlocks = [];
  invisiblePlatforms = [];
  crumblingPlatforms = [];
  spikes = [];
  door = null;
  spawnPoint = null; // Reset custom spawn point for each level

  const activeLevel = getActiveLevelData();
  const levelMap = activeLevel.map;
  const customTriggers = activeLevel.spikeTriggers || []; // Get custom triggers if defined
  const customTriggerLengths = activeLevel.spikeTriggerLengths || []; // Get custom trigger lengths
  const customTriggerAreas = activeLevel.spikeTriggerAreas || []; // Free-form trigger rectangles
  const customDirections = activeLevel.spikeDirections || []; // Which way each spike shoots
  const customSpeeds = activeLevel.spikeSpeeds || []; // How fast each spike shoots
  const defaultTriggerOffset = -0.5; // Changed from 2 to -0.5 - spikes trigger when player crosses them

  let spikeIndex = 0; // Track which spike we're on for custom triggers

  for (let row = 0; row < levelMap.length; row++) {
    for (let col = 0; col < levelMap[row].length; col++) {
      const char = levelMap[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      if (char === '#') {
        platforms.push({ x, y, width: TILE_SIZE, height: TILE_SIZE });
      } else if (char === 'F') {
        // Fake block - looks like platform but has no collision
        fakeBlocks.push({ x, y, width: TILE_SIZE, height: TILE_SIZE });
      } else if (char === 'I') {
        // Invisible platform - has collision but is completely invisible
        invisiblePlatforms.push({ x, y, width: TILE_SIZE, height: TILE_SIZE });
      } else if (char === 'E') {
        // Crumbling/erasing platform - falls when stepped on, respawns after a delay
        crumblingPlatforms.push({
          x, y, width: TILE_SIZE, height: TILE_SIZE,
          state: 'solid',  // 'solid', 'crumbling', 'fallen', 'respawning'
          timer: 0,
          alpha: 1.0
        });
      } else if (/^[0-9]$/.test(char) || char === '^') {
        // Handle spikes with movement distances 0-9 or backward compatibility '^'
        const moveTiles = char === '^' ? 2 : parseInt(char, 10);
        const moveDistance = TILE_SIZE * moveTiles;

        // Which way it shoots, and how fast it covers that distance
        const direction = normalizeSpikeDirection(customDirections[spikeIndex]);
        const vector = getSpikeDirectionVector(direction);
        const moveSpeed = normalizeSpikeSpeed(customSpeeds[spikeIndex]);

        const spikeTopY = y + 20; // Spike's actual visual y position (top)

        // The trigger: an explicit rectangle wins when the level defines one,
        // otherwise the classic vertical line built from spikeTriggers /
        // spikeTriggerLengths. Areas are stored relative to the spike's tile,
        // so a trap keeps its shape when the spike is moved in the editor.
        const area = customTriggerAreas[spikeIndex];
        let triggerX, triggerY, triggerWidth, triggerHeight;
        let triggerOffset, triggerLength;

        if (area && typeof area === 'object') {
          triggerX = x + (Number(area.x) || 0);
          triggerY = y + (Number(area.y) || 0);
          triggerWidth = Math.max(0, Number(area.w) || 0);
          triggerHeight = Math.max(0, Number(area.h) || 0);
          triggerOffset = (x - triggerX) / TILE_SIZE; // debug display only
          triggerLength = null;
        } else {
          // Determine trigger position (vertical line to the left of spike)
          triggerOffset = customTriggers[spikeIndex] !== undefined
            ? customTriggers[spikeIndex]
            : defaultTriggerOffset;

          triggerX = x - (triggerOffset * TILE_SIZE); // Position of vertical trigger line
          triggerWidth = 0; // A bare line: the player only has to cross it

          // Determine trigger length (vertical span)
          triggerLength = customTriggerLengths[spikeIndex] !== undefined && customTriggerLengths[spikeIndex] !== null
            ? customTriggerLengths[spikeIndex]
            : null; // null means full-height

          if (triggerLength === null || triggerLength === 0) {
            // Full-height trigger (default behavior)
            triggerY = 0;
            triggerHeight = GAME_HEIGHT;
          } else if (triggerLength > 0) {
            // POSITIVE: extends UPWARD from spike top
            triggerY = spikeTopY - triggerLength;
            triggerHeight = triggerLength;
          } else {
            // NEGATIVE: extends DOWNWARD from spike top
            triggerY = spikeTopY;
            triggerHeight = Math.abs(triggerLength);
          }
        }

        spikes.push({
          x: x,
          y: spikeTopY,
          originalX: x,
          originalY: spikeTopY,
          width: TILE_SIZE,
          height: TILE_SIZE - 20, // Slightly shorter spike
          moveDistance: moveDistance, // Custom movement distance per spike
          moveX: vector.dx * moveDistance, // Travel along X once triggered
          moveY: vector.dy * moveDistance, // Travel along Y once triggered
          direction: direction, // One of SPIKE_DIRECTIONS
          moveSpeed: moveSpeed, // Dash takes 1 / moveSpeed seconds
          triggerX: triggerX, // X position where the trigger starts
          triggerY: triggerY, // Y position where the trigger starts
          triggerWidth: triggerWidth, // Width of the trigger (0 = a bare line)
          triggerHeight: triggerHeight, // Height of trigger line
          triggerOffset: triggerOffset, // How many tiles left (for debug display)
          triggerLength: triggerLength, // Length in pixels (null = full height)
          triggered: false,
          moved: false,
          moving: false,
          moveTimer: 0
        });

        spikeIndex++;
      } else if (char === 'D') {
        door = { x, y, width: TILE_SIZE, height: TILE_SIZE };
      } else if (char === 'S') {
        // Custom spawn point - store coordinates
        spawnPoint = { x: x + 15, y: y }; // Offset by 15 for center alignment like default spawn
      }
    }
  }
  
  // Parse gravity zones if feature is enabled
  if (ENABLE_GRAVITY_ZONES) {
    gravityZones = [];
    const levelData = getActiveLevelData();
    const chapterData = getActiveChapterData() || {};
    
    // First, detect 'G' and 'g' markers in the map to find zone boundaries
    const zoneMarkers = [];
    for (let row = 0; row < levelMap.length; row++) {
      for (let col = 0; col < levelMap[row].length; col++) {
        const char = levelMap[row][col];
        if (char === 'G' || char === 'g') {
          zoneMarkers.push({ row, col, char });
        }
      }
    }
    
    // Group connected markers into zones
    const processedPositions = new Set();
    const detectedZones = [];
    
    zoneMarkers.forEach(marker => {
      const key = `${marker.row},${marker.col}`;
      if (processedPositions.has(key)) return;
      
      // Find all connected 'G' and 'g' markers (flood fill)
      const zone = { minRow: marker.row, maxRow: marker.row, minCol: marker.col, maxCol: marker.col };
      const stack = [marker];
      
      while (stack.length > 0) {
        const current = stack.pop();
        const currentKey = `${current.row},${current.col}`;
        
        if (processedPositions.has(currentKey)) continue;
        processedPositions.add(currentKey);
        
        zone.minRow = Math.min(zone.minRow, current.row);
        zone.maxRow = Math.max(zone.maxRow, current.row);
        zone.minCol = Math.min(zone.minCol, current.col);
        zone.maxCol = Math.max(zone.maxCol, current.col);
        
        // Check adjacent cells
        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
          const newRow = current.row + dr;
          const newCol = current.col + dc;
          if (newRow >= 0 && newRow < levelMap.length && 
              newCol >= 0 && newCol < levelMap[newRow].length) {
            const char = levelMap[newRow][newCol];
            if ((char === 'G' || char === 'g') && !processedPositions.has(`${newRow},${newCol}`)) {
              stack.push({ row: newRow, col: newCol, char });
            }
          }
        });
      }
      
      detectedZones.push(zone);
    });
    
    // Convert detected zones to gravity zone objects
    detectedZones.forEach((zone, index) => {
      // Check chapter config first, then level config
      const zoneConfig = (chapterData.gravityZones && chapterData.gravityZones[index]) || 
                        (levelData.gravityZones && levelData.gravityZones[index]) || {};
      
      // Calculate pixel coordinates
      const x = zone.minCol * TILE_SIZE;
      const y = zone.minRow * TILE_SIZE;
      const width = (zone.maxCol - zone.minCol + 1) * TILE_SIZE;
      const height = (zone.maxRow - zone.minRow + 1) * TILE_SIZE;
      
      // Merge detected position with config
      gravityZones.push({
        id: index,
        x: x,
        y: y,
        width: width,
        height: height,
        type: zoneConfig.type || 'flip',
        trigger: zoneConfig.trigger || 'enter',
        duration: zoneConfig.duration !== undefined ? zoneConfig.duration : null,
        cooldown: zoneConfig.cooldown !== undefined ? zoneConfig.cooldown : 0.5,
        oneShot: zoneConfig.oneShot || false,
        initialActive: zoneConfig.initialActive || false,
        hasActivated: false, // Runtime state
        visual: {
          color: zoneConfig.visual?.color || '#44ddff',
          secondaryColor: zoneConfig.visual?.secondaryColor || '#ff44dd',
          alpha: zoneConfig.visual?.alpha !== undefined ? zoneConfig.visual.alpha : 0.35,
          stripeAngle: zoneConfig.visual?.stripeAngle || 45,
          stripeWidth: zoneConfig.visual?.stripeWidth || 8,
          stripeSpacing: zoneConfig.visual?.stripeSpacing || 20,
          animated: zoneConfig.visual?.animated !== undefined ? zoneConfig.visual.animated : true,
          animSpeed: zoneConfig.visual?.animSpeed || 40,
          showArrow: zoneConfig.visual?.showArrow !== undefined ? zoneConfig.visual.showArrow : true,
          glowWhenActive: zoneConfig.visual?.glowWhenActive !== undefined ? zoneConfig.visual.glowWhenActive : true
        },
        sound: {
          enter: zoneConfig.sound?.enter || 'gravity_flip',
          exit: zoneConfig.sound?.exit || 'gravity_restore'
        }
      });
    });
  }
}

// Reset player to starting position
function resetPlayer() {
  // Use custom spawn point if available, otherwise default position
  const startX = spawnPoint ? spawnPoint.x : TILE_SIZE + 15;
  const startY = spawnPoint ? spawnPoint.y : TILE_SIZE * 2;

  player = {
    x: startX,
    y: startY,
    width: 45,
    height: 45,
    vx: 0,
    vy: 0,
    onGround: false,
    hasJumped: false,
    
    // Gravity system
    gravityScale: 1,              // 1 = normal, -1 = inverted
    currentGravityZone: new Set(), // Set of active zone IDs (supports overlapping zones)
    gravityFlipTimer: 0,          // Time remaining for temporary gravity flip
    gravityFlipCooldown: 0,       // Cooldown timer for zone reactivation
    gravityLocked: false,         // If true, gravity cannot be changed
    lastGravityZone: null,        // Last zone entered (for cooldown tracking)
    hasBeenFlipped: false,        // Track if player experienced gravity flip (for tutorial)
    
    // Visual feedback
    gravityFlipParticles: [],     // Particle effects during flip
    gravityIndicatorAlpha: 0      // UI indicator fade
  };

  // Reset all spikes
  spikes.forEach(spike => {
    spike.x = spike.originalX;
    spike.y = spike.originalY;
    spike.triggered = false;
    spike.moved = false;
    spike.moving = false;
    spike.moveTimer = 0;
  });

  // Reset all crumbling platforms
  crumblingPlatforms.forEach(p => {
    p.state = 'solid';
    p.timer = 0;
    p.alpha = 1.0;
  });

  isDead = false;
  deathFlashTimer = 0;
  trailHistory = []; // Clear trail when resetting
}

// Update game state
function update(deltaTime) {
  // Visual effects are now static - no animation updates needed

  // Fade out the "still locked" note on the main menu
  if (menuNoticeTimer > 0) menuNoticeTimer = Math.max(0, menuNoticeTimer - deltaTime);

  // Menu-style screens animate continuously, including while fading in or out
  if (UI_SCREENS.indexOf(gameState) !== -1) updateUiAnimation(gameState, deltaTime);
  else uiScreenKey = null;

  // Handle transitions
  if (transitionState === 'fadeOut') {
    transitionAlpha += transitionSpeed * deltaTime;
    if (transitionAlpha >= 1) {
      transitionAlpha = 1;
      transitionState = 'fadeIn';
      gameState = pendingGameState;
      pendingGameState = null;
      // Let the editor screens clean up / refresh when they are entered
      if (typeof onGameStateEntered === 'function') onGameStateEntered(gameState);
    }
    return; // Don't update game during transition
  } else if (transitionState === 'fadeIn') {
    transitionAlpha -= transitionSpeed * deltaTime;
    if (transitionAlpha <= 0) {
      transitionAlpha = 0;
      transitionState = 'none';
    }
    return; // Don't update game during transition
  }

  // Menu state
  if (gameState === 'menu') {
    return;
  }

  // Settings state
  if (gameState === 'settings') {
    return;
  }

  // Chapter selection state
  if (gameState === 'chapterSelect') {
    return;
  }

  // Level selection state
  if (gameState === 'levelSelect') {
    return;
  }

  // Level editor screens (My Levels browser + the editor itself)
  if (gameState === 'customLevels' || gameState === 'editor') {
    if (typeof updateEditor === 'function') updateEditor(deltaTime);
    return;
  }

  // Paused state
  if (gameState === 'paused') {
    return;
  }

  // Level complete state
  if (gameState === 'levelComplete') {
    levelCompleteTimer -= deltaTime;

    // A custom level goes back to wherever it was started from
    if (customLevelSession) {
      if (levelCompleteTimer <= 0) endCustomLevelSession();
      return;
    }

    if (levelCompleteTimer <= 0) {
      // Check if there are more levels in current chapter
      if (currentLevelInChapter < chapters[currentChapter].levels.length - 1) {
        // Move to next level in current chapter
        loadLevelFromChapter(currentChapter, currentLevelInChapter + 1);
        updateStats();
      } else {
        // Chapter complete - check for unlocked customization items
        unlockedItems = [];
        
        // Check for newly unlocked colors
        playerColors.forEach(color => {
          if (color.unlockChapter === currentChapter) {
            unlockedItems.push({
              type: 'color',
              name: color.name,
              value: color.value
            });
          }
        });
        
        // Check for newly unlocked trails
        playerTrails.forEach(trail => {
          if (trail.unlockChapter === currentChapter) {
            unlockedItems.push({
              type: 'trail',
              name: trail.name,
              value: trail.value
            });
          }
        });
        
        // Show unlock notification if there are new items
        if (unlockedItems.length > 0) {
          showUnlockNotification = true;
          gameState = 'unlockNotification';
        } else {
          // No unlocks, proceed normally
          if (currentChapter < chapters.length - 1) {
            // More chapters available, go to chapter select
            gameState = 'chapterSelect';
            currentChapter = 0;
            currentLevel = 0;
            currentLevelInChapter = 0;
          } else {
            // All chapters complete, return to main menu
            gameState = 'menu';
            currentChapter = 0;
            currentLevel = 0;
            currentLevelInChapter = 0;
          }
        }
      }
    }
    return;
  }

  // Playing state
  if (isDead) {
    deathFlashTimer -= deltaTime;
    if (deathFlashTimer <= 0) {
      resetPlayer();
    }
    return;
  }

  // Only update game logic if we're actually playing (not paused)
  if (gameState !== 'playing') {
    return;
  }

  if (isPaused) {
    return; // Skip update if game is paused due to window blur
  }

  // Update level time (only when not dead)
  if (!isDead) {
    levelTime += deltaTime;
  }
  
  // Update gravity system timers
  if (ENABLE_GRAVITY_ZONES) {
    // Timer for temporary gravity flips
    if (player.gravityFlipTimer > 0) {
      player.gravityFlipTimer -= deltaTime;
      if (player.gravityFlipTimer <= 0) {
        player.gravityScale = 1; // Reset to normal
        player.gravityIndicatorAlpha = 1.0;
        // playSound('gravity_restore'); // Uncomment when sound file exists
      }
    }
    
    // Cooldown timer
    if (player.gravityFlipCooldown > 0) {
      player.gravityFlipCooldown -= deltaTime;
    }
    
    // Fade UI indicator
    if (player.gravityIndicatorAlpha > 0) {
      player.gravityIndicatorAlpha -= deltaTime * 2;
    }
    
    // Update gravity particles
    player.gravityFlipParticles = player.gravityFlipParticles.filter(p => {
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime * 2;
      return p.life > 0;
    });
  }

  // Horizontal movement
  if (keys.left) {
    player.vx = -MOVE_SPEED;
  } else if (keys.right) {
    player.vx = MOVE_SPEED;
  } else {
    player.vx = 0;
  }

  // Coyote time: Set timer when on ground, decrement when airborne
  if (player.onGround) {
    coyoteTime = COYOTE_TIME_DURATION;
  } else if (coyoteTime > 0) {
    coyoteTime -= deltaTime;
  }

  // Jumping (allow jump if on ground OR within coyote time window)
  if (keys.space && (player.onGround || coyoteTime > 0) && !player.hasJumped) {
    // Jump force inverts based on gravity direction
    // JUMP_FORCE is negative (-1050), so multiply by gravityScale:
    // Normal gravity (scale=1): -1050 * 1 = -1050 (upward)
    // Inverted gravity (scale=-1): -1050 * -1 = +1050 (downward in inverted world)
    player.vy = JUMP_FORCE * player.gravityScale;
    player.onGround = false;
    coyoteTime = 0; // Use up coyote time immediately
    player.hasJumped = true;
    playSound('jump'); // Play jump sound
  }

  // Release jump key
  if (!keys.space) {
    player.hasJumped = false;
  }

  // Apply gravity (scaled by deltaTime and gravity direction)
  const effectiveGravity = GRAVITY * player.gravityScale;
  player.vy += effectiveGravity * deltaTime;

  // Update horizontal position first (scaled by deltaTime)
  player.x += player.vx * deltaTime;

  // Keep player in bounds horizontally
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > GAME_WIDTH) {
    player.x = GAME_WIDTH - player.width;
  }

  // Horizontal collision check
  platforms.forEach(platform => {
    if (checkCollision(player, platform)) {
      if (player.vx > 0) {
        // Moving right, push back to left side of platform
        player.x = platform.x - player.width;
      } else if (player.vx < 0) {
        // Moving left, push back to right side of platform
        player.x = platform.x + platform.width;
      }
    }
  });

  // Invisible platform horizontal collision check
  invisiblePlatforms.forEach(platform => {
    if (checkCollision(player, platform)) {
      if (player.vx > 0) {
        // Moving right, push back to left side of platform
        player.x = platform.x - player.width;
      } else if (player.vx < 0) {
        // Moving left, push back to right side of platform
        player.x = platform.x + platform.width;
      }
    }
  });

  // Crumbling platform horizontal collision (only when solid or crumbling)
  crumblingPlatforms.forEach(platform => {
    if (platform.state === 'solid' || platform.state === 'crumbling') {
      if (checkCollision(player, platform)) {
        if (player.vx > 0) {
          player.x = platform.x - player.width;
        } else if (player.vx < 0) {
          player.x = platform.x + platform.width;
        }
      }
    }
  });

  // Update vertical position (scaled by deltaTime)
  player.y += player.vy * deltaTime;

  // Vertical collision check
  player.onGround = false;

  platforms.forEach(platform => {
    if (checkCollision(player, platform)) {
      if (player.gravityScale > 0) {
        // Normal gravity: check if player is falling onto platform (landing on top)
        if (player.vy > 0) {
          player.y = platform.y - player.height;
          player.vy = 0;
          player.onGround = true;
        }
        // Check if player hit platform from below (hitting ceiling)
        else if (player.vy < 0) {
          player.y = platform.y + platform.height;
          player.vy = 0;
        }
      } else {
        // Inverted gravity: ceiling becomes floor
        if (player.vy < 0) {
          player.y = platform.y + platform.height;
          player.vy = 0;
          player.onGround = true;
        }
        // Check if player hit from "above" (hitting floor in inverted gravity)
        else if (player.vy > 0) {
          player.y = platform.y - player.height;
          player.vy = 0;
        }
      }
    }
  });

  // Invisible platform vertical collision check
  invisiblePlatforms.forEach(platform => {
    if (checkCollision(player, platform)) {
      if (player.gravityScale > 0) {
        // Normal gravity: check if player is falling onto platform (landing on top)
        if (player.vy > 0) {
          player.y = platform.y - player.height;
          player.vy = 0;
          player.onGround = true;
        }
        // Check if player hit platform from below (hitting ceiling)
        else if (player.vy < 0) {
          player.y = platform.y + platform.height;
          player.vy = 0;
        }
      } else {
        // Inverted gravity: ceiling becomes floor
        if (player.vy < 0) {
          player.y = platform.y + platform.height;
          player.vy = 0;
          player.onGround = true;
        }
        // Check if player hit from "above" (hitting floor in inverted gravity)
        else if (player.vy > 0) {
          player.y = platform.y - player.height;
          player.vy = 0;
        }
      }
    }
  });

  // Crumbling platform vertical collision (only when solid or crumbling)
  crumblingPlatforms.forEach(platform => {
    if (platform.state === 'solid' || platform.state === 'crumbling') {
      if (checkCollision(player, platform)) {
        if (player.gravityScale > 0) {
          if (player.vy > 0) {
            player.y = platform.y - player.height;
            player.vy = 0;
            player.onGround = true;
            if (platform.state === 'solid') {
              platform.state = 'crumbling';
              platform.timer = 0;
            }
          } else if (player.vy < 0) {
            player.y = platform.y + platform.height;
            player.vy = 0;
          }
        } else {
          // Inverted gravity: ceiling becomes floor
          if (player.vy < 0) {
            player.y = platform.y + platform.height;
            player.vy = 0;
            player.onGround = true;
            if (platform.state === 'solid') {
              platform.state = 'crumbling';
              platform.timer = 0;
            }
          } else if (player.vy > 0) {
            player.y = platform.y - player.height;
            player.vy = 0;
          }
        }
      }
    }
  });

  // Update crumbling platform timers
  crumblingPlatforms.forEach(platform => {
    if (platform.state === 'crumbling') {
      platform.timer += deltaTime;
      if (platform.timer >= CRUMBLE_DELAY) {
        platform.state = 'fallen';
        platform.timer = 0;
        platform.alpha = 0;
      }
    } else if (platform.state === 'fallen') {
      platform.timer += deltaTime;
      if (platform.timer >= CRUMBLE_RESET_DELAY) {
        platform.state = 'respawning';
        platform.timer = 0;
        platform.alpha = 0;
      }
    } else if (platform.state === 'respawning') {
      platform.timer += deltaTime;
      platform.alpha = platform.timer / CRUMBLE_RESPAWN_DURATION;
      if (platform.timer >= CRUMBLE_RESPAWN_DURATION) {
        platform.state = 'solid';
        platform.timer = 0;
        platform.alpha = 1.0;
      }
    }
  });

  // Check spike triggers (position-based)
  checkSpikeTriggers();
  
  // Check gravity zones
  if (ENABLE_GRAVITY_ZONES) {
    checkGravityZones(deltaTime);
  }

  // Update moving spikes
  spikes.forEach(spike => {
    if (spike.moving) {
      // The dash takes 1 / moveSpeed seconds, whatever the distance
      spike.moveTimer += deltaTime * spike.moveSpeed;
      if (spike.moveTimer >= 1) {
        spike.moveTimer = 1;
        spike.moving = false;
        spike.moved = true;
      }

      // Interpolate along the spike's own travel vector (any of 8 directions)
      spike.x = spike.originalX + spike.moveX * spike.moveTimer;
      spike.y = spike.originalY + spike.moveY * spike.moveTimer;
    }
  });

  // Spike collision (death)
  spikes.forEach(spike => {
    if (checkCollision(player, spike)) {
      die();
    }
  });

  // Door collision (level complete)
  if (door && checkCollision(player, door)) {
    completeLevel();
  }

  // Fall off screen = death
  if (player.y > GAME_HEIGHT + 100) {
    die();
  }
  
  // Fall off top of screen = death (for inverted gravity levels)
  // Player dies if they go 5 blocks (300 pixels) above the screen
  if (player.y < -300) {
    die();
  }
  
  // Update trail history (only during gameplay)
  if (gameState === 'playing' && !isDead) {
    trailHistory.push({ x: player.x, y: player.y, alpha: 1.0 });
    
    // Keep only last 15 positions
    if (trailHistory.length > 15) {
      trailHistory.shift();
    }
    
    // Fade out trail positions
    trailHistory.forEach((pos, index) => {
      pos.alpha -= deltaTime * 3;
      if (pos.alpha < 0) pos.alpha = 0;
    });
  }
}

// Complete current level
function completeLevel() {
  gameState = 'levelComplete';
  levelCompleteTimer = LEVEL_COMPLETE_DURATION;

  // Custom levels have their own records and never touch chapter progress
  if (customLevelSession) {
    if (customLevelSession.id && customLevelSession.returnState !== 'editor') {
      recordCustomLevelWin(customLevelSession.id, levelDeaths, levelTime);
    }
    tryEnableAudio();
    playSound('level_end');
    return;
  }

  // Mark this level as completed
  markLevelComplete(currentLevel);
  
  // Play appropriate completion sound: normal level end, but if this is the final level play chapter end
  tryEnableAudio();
  if (currentLevel < levels.length - 1) {
    playSound('level_end');
  } else {
    // Final chapter completed
    playSound('chapter_end');
  }
}

// Check if player crosses vertical trigger lines to activate spikes
function checkSpikeTriggers() {
  spikes.forEach(spike => {
    // Skip spikes with 0 movement distance (stationary spikes) - they have no trigger
    if (spike.moveDistance === 0) {
      return;
    }
    
    if (!spike.triggered && !spike.moved) {
      const playerRightEdge = player.x + player.width;
      const playerLeftEdge = player.x;
      const playerTop = player.y;
      const playerBottom = player.y + player.height;

      // Check if player is within the vertical bounds of the trigger
      const withinVerticalBounds = (playerBottom >= spike.triggerY) && (playerTop <= spike.triggerY + spike.triggerHeight);

      // A trigger with a width is a box the player has to touch; a trigger
      // without one is the classic line the player has to cross.
      const withinHorizontalBounds = spike.triggerWidth > 0
        ? (playerRightEdge >= spike.triggerX) && (playerLeftEdge <= spike.triggerX + spike.triggerWidth)
        : (playerLeftEdge < spike.triggerX) && (playerRightEdge >= spike.triggerX);

      // Trigger when the player is inside the trigger on both axes
      if (withinHorizontalBounds && withinVerticalBounds) {
        spike.triggered = true;
        spike.moving = true;
        spike.moveTimer = 0;
        playSound('spike'); // Play spike movement sound
      }
    }
  });
}

// Check if player is in a gravity zone and activate it
function checkGravityZones(deltaTime) {
  gravityZones.forEach(zone => {
    const isInZone = checkCollision(player, zone);
    const wasInZone = player.currentGravityZone.has(zone.id);
    
    // Initialize zone cooldown if not exists
    if (!zone.cooldownTimer) zone.cooldownTimer = 0;
    
    // Update per-zone cooldown
    if (zone.cooldownTimer > 0) {
      zone.cooldownTimer -= deltaTime;
    }
    
    if (isInZone && !wasInZone) {
      // Player just entered zone
      player.currentGravityZone.add(zone.id);
      if (zone.trigger === 'enter' && zone.cooldownTimer <= 0 && !player.gravityLocked) {
        activateGravityZone(zone);
      }
    } else if (!isInZone && wasInZone) {
      // Player just exited zone
      player.currentGravityZone.delete(zone.id);
      if (zone.type === 'momentary') {
        deactivateGravityZone(zone);
      }
    }
    
    // Contact trigger activates continuously while inside
    if (isInZone && zone.trigger === 'contact' && zone.cooldownTimer <= 0 && !player.gravityLocked) {
      activateGravityZone(zone);
    }
  });
}

// Activate a gravity zone
function activateGravityZone(zone) {
  // Check one-shot
  if (zone.oneShot && zone.hasActivated) return;
  
  // Check per-zone cooldown (no longer global)
  if (zone.cooldownTimer > 0) return;
  
  // Apply gravity change
  const oldGravity = player.gravityScale;
  
  switch (zone.type) {
    case 'flip':
      player.gravityScale *= -1;
      break;
    case 'toggle':
      player.gravityScale *= -1;
      break;
    case 'momentary':
      player.gravityScale = -1;
      break;
  }
  
  // Only trigger effects if gravity actually changed
  if (oldGravity !== player.gravityScale) {
    // Set duration timer if specified
    if (zone.duration) {
      player.gravityFlipTimer = zone.duration;
    }
    
    // Set per-zone cooldown (prevents rapid re-triggering of THIS zone)
    zone.cooldownTimer = zone.cooldown || 1.0;
    zone.hasActivated = true;
    player.hasBeenFlipped = true;
    
    // Trigger effects
    // playSound(zone.sound.enter); // Uncomment when sound file exists
    spawnGravityFlipParticles(player.x, player.y);
    player.gravityIndicatorAlpha = 1.0; // Show UI indicator
    
    // Dampen momentum to prevent instant death on flip
    player.vy *= 0.5;
  }
}

// Deactivate a gravity zone (for momentary zones)
function deactivateGravityZone(zone) {
  if (player.gravityScale !== 1) {
    player.gravityScale = 1; // Restore normal gravity
    // playSound(zone.sound.exit); // Uncomment when sound file exists
    player.gravityIndicatorAlpha = 1.0;
  }
}

// Spawn particle effects for gravity flip
function spawnGravityFlipParticles(x, y) {
  for (let i = 0; i < 20; i++) {
    player.gravityFlipParticles.push({
      x: x + player.width / 2,
      y: y + player.height / 2,
      vx: (Math.random() - 0.5) * 200,
      vy: (Math.random() - 0.5) * 200,
      life: 1.0,
      color: player.gravityScale < 0 ? '#44ddff' : '#ff44dd'
    });
  }
}

// Check collision between two rectangles
function checkCollision(rect1, rect2) {
  return rect1.x < rect2.x + rect2.width &&
         rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height &&
         rect1.y + rect1.height > rect2.y;
}

// Player dies
function die() {
  if (!isDead) {
    isDead = true;
    deathFlashTimer = DEATH_FLASH_DURATION;
    deaths++;
    levelDeaths++;
    playSound('death');
    updateStats();
  }
}

// Update stats display
function updateStats() {
  document.getElementById('deathCount').textContent = `Deaths: ${deaths}`;
  if (gameState === 'playing' || gameState === 'levelComplete') {
    const activeLevel = getActiveLevelData();
    document.getElementById('levelName').textContent = activeLevel ? activeLevel.name : '';
  }
}

// Update trigger info display below canvas
function updateTriggerInfo() {
  // DEVELOPER FEATURE: Show trigger zone info for level designers
  if (!ENABLE_DEBUG_FEATURES || !DEBUG_MODE) {
    document.getElementById('triggerInfo').textContent = '';
    return;
  }
  const lines = spikes.map((s, i) => 
    `Spike ${i+1}: triggerX=${s.triggerX.toFixed(0)} triggerLen=${s.triggerLength === null ? 'full' : s.triggerLength.toFixed(0)}px triggerOffset=${s.triggerOffset.toFixed(0)}`
  );
  document.getElementById('triggerInfo').textContent = lines.join(' | ');
}

// ===== VISUAL STYLE RENDERING SYSTEM =====
// Each chapter has its own unique visual style

// Helper: Draw background based on visual style
function drawStyledBackground(style) {
  switch(style) {
    case 'neon':
      // Neon glow - dark background with gradient
      const neonGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      neonGradient.addColorStop(0, '#0a0a1a');
      neonGradient.addColorStop(1, '#1a0a2a');
      ctx.fillStyle = neonGradient;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      
      // Add subtle grid
      ctx.strokeStyle = 'rgba(100, 100, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 0; x < GAME_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GAME_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < GAME_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GAME_WIDTH, y);
        ctx.stroke();
      }
      break;
      
    case 'sketch':
      // Hand-drawn paper texture (static)
      ctx.fillStyle = '#f5f5dc'; // Beige paper color
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      
      // Add paper texture (static pattern)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      // Use deterministic pattern instead of random
      for (let i = 0; i < 200; i++) {
        const x = (i * 37) % GAME_WIDTH;
        const y = (i * 53) % GAME_HEIGHT;
        ctx.fillRect(x, y, 2, 2);
      }
      break;
      
    case 'glitch':
      // Digital corruption
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      
      // Random scan lines
      ctx.strokeStyle = 'rgba(0, 255, 100, 0.1)';
      ctx.lineWidth = 1;
      for (let y = 0; y < GAME_HEIGHT; y += 4) {
        if (Math.random() > 0.5) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(GAME_WIDTH, y);
          ctx.stroke();
        }
      }
      break;
      
    case 'surreal':
      // Abstract/surreal - static gradient colors
      const surrealGradient = ctx.createRadialGradient(
        GAME_WIDTH/2, GAME_HEIGHT/2, 0,
        GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH
      );
      surrealGradient.addColorStop(0, 'hsl(240, 40%, 15%)');
      surrealGradient.addColorStop(1, 'hsl(280, 40%, 10%)');
      ctx.fillStyle = surrealGradient;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      break;
      
    default:
      // Default minimalist style
      ctx.fillStyle = DEVELOPER_MODE ? '#1a1a3a' : '#2a2a2a';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
}

// Helper: Draw platform based on visual style
function drawStyledPlatform(x, y, width, height, style, isFake = false) {
  // NOTE: Fake blocks MUST look identical to real blocks - that's the deception!
  // The isFake parameter is kept for potential future use but NOT used for rendering
  
  switch(style) {
    case 'neon':
      // Neon glow effect (same for all blocks)
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00ffff';
      ctx.fillStyle = '#006666';
      ctx.fillRect(x, y, width, height);
      
      // Bright outline
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      ctx.shadowBlur = 0;
      break;
      
    case 'sketch':
      // Hand-drawn style (static, no wobble)
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(x, y, width, height);
      
      // Sketchy outline (multiple lines for hand-drawn effect) - static
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const offset = i * 0.5; // Small static offset, not animated
        ctx.strokeRect(x + offset, y + offset, width, height);
      }
      
      // Crosshatch shading
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 8) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i, y + height);
        ctx.stroke();
      }
      break;
      
    case 'glitch':
      // Digital corruption (static blocks with RGB split effect)
      // RGB split effect - subtle, no offset
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fillRect(x - 2, y, width, height);
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
      ctx.fillRect(x + 2, y, width, height);
      
      // Main platform (same color for all blocks)
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(x, y, width, height);
      
      // Glitch outline
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      break;
      
    case 'surreal':
      // Abstract flowing colors (static)
      const hue = ((x + y) / 10 % 360); // Position-based hue, not time-based
      ctx.fillStyle = `hsl(${hue}, 60%, 40%)`;
      
      // Static rectangle with position-based colors
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = `hsl(${hue + 30}, 80%, 60%)`;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      break;
      
    default:
      // Default minimalist style
      ctx.fillStyle = '#666';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = '#555';
      ctx.strokeRect(x, y, width, height);
  }
}

// Helper: Draw crumbling/erasing platform (Chapter 3 mechanic)
function drawStyledCrumblingPlatform(platform, style) {
  if (platform.state === 'fallen') return; // Fully erased, don't draw

  const { x, y, width, height, state, timer, alpha } = platform;

  // Compute animation values
  let displayAlpha = 1.0;
  let shakeX = 0;
  let crackProgress = 0; // 0 = no cracks, 1 = fully cracked

  if (state === 'crumbling') {
    const progress = timer / CRUMBLE_DELAY;
    crackProgress = progress;
    // Shake intensifies as platform crumbles: small at start, big near fall
    shakeX = Math.sin(timer * 35) * (progress * 5);
    // Alpha starts dropping in the last 40% of the crumble delay
    displayAlpha = progress > 0.6 ? 1.0 - ((progress - 0.6) / 0.4) : 1.0;
  } else if (state === 'respawning') {
    displayAlpha = alpha; // alpha goes 0→1 during respawn
    crackProgress = 0;
  }

  const rx = x + shakeX; // Render x with shake applied

  ctx.save();
  ctx.globalAlpha = displayAlpha;

  if (style === 'sketch') {
    // === SKETCH STYLE ===
    // Lighter fill than regular platforms to visually distinguish
    ctx.fillStyle = state === 'respawning' ? '#888888' : '#4a4a4a';
    ctx.fillRect(rx, y, width, height);

    // Sketchy pencil outline (slightly imprecise lines for hand-drawn feel)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const off = i * 0.5;
      ctx.strokeRect(rx + off, y + off, width, height);
    }

    // Diagonal hatch lines (sparser than regular to look different)
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 14) {
      ctx.beginPath();
      ctx.moveTo(rx + i, y);
      ctx.lineTo(rx + i, y + height);
      ctx.stroke();
    }

    // Crack lines: drawn as scribbled eraser marks
    if (crackProgress > 0) {
      ctx.strokeStyle = 'rgba(245,245,220,0.9)'; // near-paper color = eraser
      ctx.lineWidth = 2;
      // Crack 1 — horizontal crack from left
      const crack1Width = crackProgress * width * 0.55;
      ctx.beginPath();
      ctx.moveTo(rx + 4, y + height * 0.45);
      ctx.lineTo(rx + 4 + crack1Width * 0.5, y + height * 0.5);
      ctx.lineTo(rx + 4 + crack1Width, y + height * 0.42);
      ctx.stroke();
      // Crack 2 — diagonal from top right (appears after 50% crumble)
      if (crackProgress > 0.5) {
        const crack2Progress = (crackProgress - 0.5) / 0.5;
        const crack2Len = crack2Progress * width * 0.45;
        ctx.beginPath();
        ctx.moveTo(rx + width - 6, y + 4);
        ctx.lineTo(rx + width - 6 - crack2Len * 0.4, y + 4 + crack2Len * 0.6);
        ctx.lineTo(rx + width - 6 - crack2Len * 0.7, y + 4 + crack2Len);
        ctx.stroke();
      }
    }

    // Pencil "E" hint label (small, in corner — visible only on solid state)
    if (state === 'solid' || state === 'respawning') {
      ctx.fillStyle = 'rgba(245,245,220,0.7)';
      ctx.font = `bold ${Math.floor(height * 0.4)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('~', rx + width / 2, y + height / 2);
    }

  } else if (style === 'neon') {
    // === NEON STYLE ===
    const crumbleColor = state === 'crumbling' ? '#ff6600' : '#00aaaa';
    ctx.shadowBlur = 12;
    ctx.shadowColor = crumbleColor;
    ctx.fillStyle = state === 'crumbling' ? '#663300' : '#004444';
    ctx.fillRect(rx, y, width, height);
    ctx.strokeStyle = crumbleColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, y, width, height);
    // Crack glow
    if (crackProgress > 0) {
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rx + 4, y + height * 0.5);
      ctx.lineTo(rx + 4 + crackProgress * width * 0.6, y + height * 0.45);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

  } else {
    // === DEFAULT STYLE ===
    ctx.fillStyle = state === 'crumbling' ? '#888' : '#aaa';
    ctx.fillRect(rx, y, width, height);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, y, width, height);
    // Crack lines
    if (crackProgress > 0) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(rx + 5, y + height * 0.5);
      ctx.lineTo(rx + 5 + crackProgress * width * 0.6, y + height * 0.45);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  ctx.restore();
}

// Helper: Draw spike based on visual style
function drawStyledSpike(spike, style) {
  const x = spike.x;
  const y = spike.y;
  const width = spike.width;
  const height = spike.height;
  
  // All spikes use the same jagged shape, just different colors/effects
  const spikeSplits = 10;
  
  switch(style) {
    case 'neon':
      // Neon spikes with glow (same shape as default)
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff0055';
      ctx.fillStyle = spike.moving ? '#ff0055' : '#dd0044';
      
      ctx.beginPath();
      ctx.moveTo(x + (width / spikeSplits) * 2, y);
      for (let i = 1; i < spikeSplits - 1; i = i + 2) {
        ctx.lineTo(x + (i * width) / spikeSplits, y + (height/5) * 3);
        ctx.lineTo(x + ((i+1) * width) / spikeSplits, y);
      }
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#ff44aa';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
      
    case 'sketch':
      // Hand-drawn sketchy spikes (same shape as default)
      ctx.fillStyle = spike.moving ? '#ff0000' : '#dd0000';
      
      ctx.beginPath();
      ctx.moveTo(x + (width / spikeSplits) * 2, y);
      for (let i = 1; i < spikeSplits - 1; i = i + 2) {
        ctx.lineTo(x + (i * width) / spikeSplits, y + (height/5) * 3);
        ctx.lineTo(x + ((i+1) * width) / spikeSplits, y);
      }
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      ctx.fill();
      
      // Multiple sketch lines for hand-drawn effect
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      for (let i = 0; i < 2; i++) {
        ctx.stroke();
      }
      break;
      
    case 'glitch':
      // Glitchy spikes (same shape as default)
      ctx.fillStyle = spike.moving ? '#ff0000' : '#dd0000';
      
      ctx.beginPath();
      ctx.moveTo(x + (width / spikeSplits) * 2, y);
      for (let i = 1; i < spikeSplits - 1; i = i + 2) {
        ctx.lineTo(x + (i * width) / spikeSplits, y + (height/5) * 3);
        ctx.lineTo(x + ((i+1) * width) / spikeSplits, y);
      }
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = spike.moving ? '#ff4444' : '#cc0000';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
      
    case 'surreal':
      // Abstract colored spikes (same shape as default)
      ctx.fillStyle = spike.moving ? 'hsl(350, 100%, 50%)' : 'hsl(350, 80%, 45%)';
      
      ctx.beginPath();
      ctx.moveTo(x + (width / spikeSplits) * 2, y);
      for (let i = 1; i < spikeSplits - 1; i = i + 2) {
        ctx.lineTo(x + (i * width) / spikeSplits, y + (height/5) * 3);
        ctx.lineTo(x + ((i+1) * width) / spikeSplits, y);
      }
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = 'hsl(350, 100%, 70%)';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
      
    default:
      // Default spike rendering
      ctx.fillStyle = spike.moving ? '#ff0000' : '#dd0000';
      
      ctx.beginPath();
      ctx.moveTo(x + (width / spikeSplits) * 2, y);
      for (let i = 1; i < spikeSplits - 1; i = i + 2) {
        ctx.lineTo(x + (i * width) / spikeSplits, y + (height/5) * 3);
        ctx.lineTo(x + ((i+1) * width) / spikeSplits, y);
      }
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#aa0000';
      ctx.lineWidth = 2;
      ctx.stroke();
  }
}

// Helper: Draw player based on visual style
function drawStyledPlayer(x, y, width, height, style) {
  switch(style) {
    case 'neon':
      // Glowing player
      ctx.shadowBlur = 20;
      ctx.shadowColor = playerColor;
      ctx.fillStyle = playerColor;
      ctx.fillRect(x, y, width, height);
      ctx.shadowBlur = 0;
      
      // Bright outline
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      break;
      
    case 'sketch':
      // Sketchy player (static)
      ctx.fillStyle = playerColor;
      ctx.fillRect(x, y, width, height);
      
      // Multiple sketch outlines - static offset
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const offset = i * 0.5; // Small static offset
        ctx.strokeRect(x + offset, y + offset, width, height);
      }
      break;
      
    case 'glitch':
      // Glitchy player with subtle RGB split (no position offset)
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fillRect(x - 2, y, width, height);
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
      ctx.fillRect(x + 2, y, width, height);
      
      // Main player
      ctx.fillStyle = playerColor;
      ctx.fillRect(x, y, width, height);
      break;
      
    case 'surreal':
      // Abstract player (static, no rotation)
      ctx.fillStyle = playerColor;
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      break;
      
    default:
      // Default player rendering
      ctx.fillStyle = playerColor;
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
  }
}

function updateTriggerInfo() {
  if (!ENABLE_DEBUG_FEATURES) return; // Exit if debug features disabled
  
  const triggerInfoElement = document.getElementById('triggerInfo');
  if (!triggerInfoElement) return; // Exit if element doesn't exist

  if (gameState !== 'playing' || spikes.length === 0) {
    triggerInfoElement.textContent = '';
    return;
  }

  let infoText = 'Spike Triggers: ';
  spikes.forEach((spike, index) => {
    const status = spike.moved ? '✓' : (spike.triggered ? '→' : '○');
    const arrow = getSpikeDirectionVector(spike.direction).arrow;
    infoText += `[${index + 1}: ${arrow}${spike.moveDistance / TILE_SIZE} @x${spike.moveSpeed} ${status}] `;
  });

  triggerInfoElement.textContent = infoText;
}

// Helper: Draw door based on visual style
function drawStyledDoor(door, style) {
  const x = door.x;
  const y = door.y;
  const width = door.width;
  const height = door.height;
  
  switch(style) {
    case 'neon':
      // Neon glowing door
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#44ff44';
      ctx.fillStyle = '#00ff44';
      ctx.fillRect(x, y, width, height);
      
      // Bright neon outline
      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      
      // Glowing center line
      ctx.strokeStyle = '#88ffaa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width / 2, y + height);
      ctx.stroke();
      
      // Neon door knob
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(x + width * 0.7, y + height * 0.5, 6, 6);
      ctx.shadowBlur = 0;
      break;
      
    case 'sketch':
      // Hand-drawn sketchy door
      ctx.fillStyle = '#44ff44';
      ctx.fillRect(x, y, width, height);
      
      // Sketchy outline (multiple lines)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const offset = i * 0.5;
        ctx.strokeRect(x + offset, y + offset, width, height);
      }
      
      // Sketchy center line
      ctx.strokeStyle = '#33cc33';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width / 2, y + height);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Sketchy door knob
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(x + width * 0.7, y + height * 0.5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
      
    case 'glitch':
      // Glitchy digital door with RGB split
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.fillRect(x - 2, y, width, height);
      ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
      ctx.fillRect(x + 2, y, width, height);
      
      // Main door
      ctx.fillStyle = '#00ff44';
      ctx.fillRect(x, y, width, height);
      
      // Glitch outline
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      
      // Glitchy center line
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width / 2, y + height);
      ctx.stroke();
      
      // Pixelated door knob
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(x + width * 0.7 - 3, y + height * 0.5 - 3, 6, 6);
      break;
      
    case 'surreal':
      // Abstract flowing door
      const hue = ((x + y) / 10 % 360);
      ctx.fillStyle = `hsl(${hue + 120}, 70%, 50%)`;
      ctx.fillRect(x, y, width, height);
      
      // Flowing outline
      ctx.strokeStyle = `hsl(${hue + 150}, 80%, 60%)`;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      
      // Abstract center line
      ctx.strokeStyle = `hsl(${hue + 180}, 90%, 70%)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width / 2, y + height);
      ctx.stroke();
      
      // Surreal door knob
      ctx.fillStyle = `hsl(${hue + 60}, 100%, 70%)`;
      ctx.fillRect(x + width * 0.7, y + height * 0.5, 6, 6);
      break;
      
    default:
      // Default green door with yellow outline
      ctx.fillStyle = '#44ff44';
      ctx.fillRect(x, y, width, height);
      
      ctx.strokeStyle = '#ffff44';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      
      ctx.strokeStyle = '#33cc33';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width / 2, y + height);
      ctx.stroke();
      
      ctx.fillStyle = '#ffff44';
      ctx.fillRect(x + width * 0.7, y + height * 0.5, 6, 6);
  }
}

// Helper: Draw gravity zone based on visual style
function drawStyledGravityZone(zone, isActive, style) {
  const x = zone.x;
  const y = zone.y;
  const width = zone.width;
  const height = zone.height;
  const visual = zone.visual;
  
  switch(style) {
    case 'neon':
      // Neon glowing gravity zone
      const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
      gradient.addColorStop(0, visual.color);
      gradient.addColorStop(1, visual.secondaryColor);
      
      ctx.globalAlpha = visual.alpha;
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);
      ctx.globalAlpha = 1.0;
      
      // Animated diagonal stripes
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
      
      ctx.strokeStyle = visual.secondaryColor;
      ctx.lineWidth = visual.stripeWidth;
      ctx.globalAlpha = visual.alpha * 0.6;
      
      const offset = visual.animated ? (Date.now() / 1000 * visual.animSpeed) % visual.stripeSpacing : 0;
      
      for (let i = -height; i < width + height; i += visual.stripeSpacing) {
        ctx.beginPath();
        const x1 = x + i + offset;
        const y1 = y;
        const x2 = x + i - height + offset;
        const y2 = y + height;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      
      ctx.restore();
      
      // Glowing border when active
      if (visual.glowWhenActive && isActive) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = visual.color;
      } else {
        ctx.strokeStyle = visual.color;
        ctx.lineWidth = 2;
      }
      ctx.strokeRect(x, y, width, height);
      ctx.shadowBlur = 0;
      
      // Arrow
      if (visual.showArrow) {
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const arrowSize = Math.min(width, height) * 0.2;
        
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.8;
        
        const direction = (player && player.gravityScale > 0) ? -1 : 1;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + arrowSize * direction);
        ctx.lineTo(centerX - arrowSize / 2, centerY - arrowSize * direction);
        ctx.lineTo(centerX + arrowSize / 2, centerY - arrowSize * direction);
        ctx.closePath();
        ctx.fill();
        
        ctx.globalAlpha = 1.0;
      }
      break;
      
    case 'sketch':
      // Hand-drawn sketchy gravity zone
      ctx.fillStyle = 'rgba(68, 221, 255, 0.2)';
      ctx.fillRect(x, y, width, height);
      
      // Sketchy border (multiple lines)
      ctx.strokeStyle = '#44ddff';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const offset = i * 0.5;
        ctx.strokeRect(x + offset, y + offset, width, height);
      }
      
      // Hand-drawn diagonal lines (with subtle animation) - with clipping
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
      
      ctx.strokeStyle = 'rgba(255, 68, 221, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      const sketchOffset = visual.animated ? (Date.now() / 1000 * 10) % 15 : 0;
      
      for (let i = -height; i < width + height; i += 15) {
        ctx.beginPath();
        ctx.moveTo(x + i + sketchOffset, y);
        ctx.lineTo(x + i - height + sketchOffset, y + height);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      
      ctx.restore();
      
      // Sketchy arrow
      if (visual.showArrow) {
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const arrowSize = Math.min(width, height) * 0.2;
        
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 0.6;
        
        const direction = (player && player.gravityScale > 0) ? -1 : 1;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + arrowSize * direction);
        ctx.lineTo(centerX - arrowSize / 2, centerY - arrowSize * direction);
        ctx.lineTo(centerX + arrowSize / 2, centerY - arrowSize * direction);
        ctx.closePath();
        ctx.fill();
        
        // Sketchy outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.globalAlpha = 1.0;
      }
      
      if (isActive) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);
      }
      break;
      
    case 'glitch':
      // Glitchy digital gravity zone
      // RGB split effect
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(x - 2, y, width, height);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = '#0000ff';
      ctx.fillRect(x + 2, y, width, height);
      ctx.globalAlpha = 1.0;
      
      // Main zone
      ctx.fillStyle = 'rgba(68, 221, 255, 0.25)';
      ctx.fillRect(x, y, width, height);
      
      // Pixelated stripes (with animation) - with clipping
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
      
      ctx.fillStyle = 'rgba(255, 68, 221, 0.3)';
      const pixelSize = 4;
      const glitchOffset = visual.animated ? (Date.now() / 1000 * 15) % 20 : 0;
      
      for (let i = -height; i < width + height; i += 20) {
        for (let py = y; py < y + height; py += pixelSize) {
          const px = x + i - (py - y) + glitchOffset;
          ctx.fillRect(px, py, pixelSize * 2, pixelSize);
        }
      }
      
      ctx.restore();
      
      // Sharp border
      ctx.strokeStyle = isActive ? '#00ffff' : '#44ddff';
      ctx.lineWidth = isActive ? 3 : 2;
      ctx.strokeRect(x, y, width, height);
      
      // Glitch arrow
      if (visual.showArrow) {
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const arrowSize = Math.min(width, height) * 0.2;
        
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.9;
        
        const direction = (player && player.gravityScale > 0) ? -1 : 1;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + arrowSize * direction);
        ctx.lineTo(centerX - arrowSize / 2, centerY - arrowSize * direction);
        ctx.lineTo(centerX + arrowSize / 2, centerY - arrowSize * direction);
        ctx.closePath();
        ctx.fill();
        
        ctx.globalAlpha = 1.0;
      }
      break;
      
    case 'surreal':
      // Abstract flowing gravity zone
      const hue = ((x + y) / 10 % 360);
      
      // Flowing gradient
      const gradient2 = ctx.createRadialGradient(
        x + width / 2, y + height / 2, 0,
        x + width / 2, y + height / 2, Math.max(width, height) / 2
      );
      gradient2.addColorStop(0, `hsla(${hue}, 70%, 50%, 0.3)`);
      gradient2.addColorStop(1, `hsla(${hue + 60}, 70%, 50%, 0.2)`);
      
      ctx.fillStyle = gradient2;
      ctx.fillRect(x, y, width, height);
      
      // Flowing wavy lines (with animation) - with clipping
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
      
      ctx.strokeStyle = `hsla(${hue + 120}, 80%, 60%, 0.4)`;
      ctx.lineWidth = 2;
      
      const surrealTime = visual.animated ? Date.now() / 1000 : 0;
      
      for (let i = 0; i < height; i += 10) {
        ctx.beginPath();
        ctx.moveTo(x, y + i);
        for (let j = 0; j <= width; j += 5) {
          const wave = Math.sin((j / width) * Math.PI * 2 + (i / 10) + surrealTime) * 5;
          ctx.lineTo(x + j, y + i + wave);
        }
        ctx.stroke();
      }
      
      ctx.restore();
      
      // Surreal border
      ctx.strokeStyle = isActive ? `hsl(${hue + 180}, 90%, 70%)` : `hsl(${hue}, 80%, 60%)`;
      ctx.lineWidth = isActive ? 3 : 2;
      ctx.strokeRect(x, y, width, height);
      
      // Abstract arrow
      if (visual.showArrow) {
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const arrowSize = Math.min(width, height) * 0.2;
        
        ctx.fillStyle = `hsl(${hue + 240}, 100%, 70%)`;
        ctx.globalAlpha = 0.8;
        
        const direction = (player && player.gravityScale > 0) ? -1 : 1;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + arrowSize * direction);
        ctx.lineTo(centerX - arrowSize / 2, centerY - arrowSize * direction);
        ctx.lineTo(centerX + arrowSize / 2, centerY - arrowSize * direction);
        ctx.closePath();
        ctx.fill();
        
        ctx.globalAlpha = 1.0;
      }
      break;
      
    default:
      // Default gravity zone (original style)
      const defaultGradient = ctx.createLinearGradient(x, y, x + width, y + height);
      defaultGradient.addColorStop(0, visual.color);
      defaultGradient.addColorStop(1, visual.secondaryColor);
      
      ctx.globalAlpha = visual.alpha;
      ctx.fillStyle = defaultGradient;
      ctx.fillRect(x, y, width, height);
      ctx.globalAlpha = 1.0;
      
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
      
      ctx.strokeStyle = visual.secondaryColor;
      ctx.lineWidth = visual.stripeWidth;
      ctx.globalAlpha = visual.alpha * 0.6;
      
      const defaultOffset = visual.animated ? (Date.now() / 1000 * visual.animSpeed) % visual.stripeSpacing : 0;
      
      for (let i = -height; i < width + height; i += visual.stripeSpacing) {
        ctx.beginPath();
        const x1 = x + i + defaultOffset;
        const y1 = y;
        const x2 = x + i - height + defaultOffset;
        const y2 = y + height;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      
      ctx.restore();
      
      if (visual.glowWhenActive && isActive) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = visual.color;
      } else {
        ctx.strokeStyle = visual.color;
        ctx.lineWidth = 2;
      }
      ctx.strokeRect(x, y, width, height);
      ctx.shadowBlur = 0;
      
      if (visual.showArrow) {
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const arrowSize = Math.min(width, height) * 0.2;
        
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.8;
        
        const direction = (player && player.gravityScale > 0) ? -1 : 1;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + arrowSize * direction);
        ctx.lineTo(centerX - arrowSize / 2, centerY - arrowSize * direction);
        ctx.lineTo(centerX + arrowSize / 2, centerY - arrowSize * direction);
        ctx.closePath();
        ctx.fill();
        
        ctx.globalAlpha = 1.0;
      }
  }
}

// Render game
function render() {
  // The canvas may have been resized for the window or for fullscreen
  applyDisplayTransform();

  // Get current visual style
  const visualStyle = (gameState === 'playing' || gameState === 'paused' || gameState === 'levelComplete') 
    ? getCurrentVisualStyle() 
    : 'default';

  // Clear screen with styled background
  drawStyledBackground(visualStyle);

  // Menu screen
  if (gameState === 'menu') {
    drawMenu();
    renderTransition();
    return;
  }

  // Customization screen
  if (gameState === 'customize') {
    drawCustomization();
    renderTransition();
    return;
  }

  // Settings screen
  if (gameState === 'settings') {
    drawSettings();
    renderTransition();
    return;
  }

  // Chapter selection screen
  if (gameState === 'chapterSelect') {
    drawChapterSelect();
    renderTransition();
    return;
  }

  // Level selection screen
  if (gameState === 'levelSelect') {
    drawLevelSelect();
    renderTransition();
    return;
  }

  // My Levels browser
  if (gameState === 'customLevels') {
    drawCustomLevelBrowser();
    renderTransition();
    return;
  }

  // Level editor
  if (gameState === 'editor') {
    drawEditor();
    renderTransition();
    return;
  }

  // Don't return early for paused - we need to draw the game first
  // Then we'll draw the pause menu overlay on top

  // Draw platforms (solid blocks) with visual style
  platforms.forEach(platform => {
    drawStyledPlatform(platform.x, platform.y, platform.width, platform.height, visualStyle, false);
  });

  // Draw invisible platforms (only visible in debug mode)
  if (ENABLE_DEBUG_FEATURES && DEBUG_MODE) {
    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)'; // Cyan with transparency
    invisiblePlatforms.forEach(platform => {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      
      // Add cyan outline
      ctx.strokeStyle = 'cyan';
      ctx.lineWidth = 2;
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
      
      // Add text label
      ctx.fillStyle = 'cyan';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('I', platform.x + platform.width/2, platform.y + platform.height/2 + 5);
    });
    ctx.lineWidth = 1; // Reset line width
  }

  // Draw crumbling platforms (before fake blocks so they appear under deception layer)
  crumblingPlatforms.forEach(platform => {
    drawStyledCrumblingPlatform(platform, visualStyle);
  });

  // Draw fake blocks with visual style (may look different from real platforms in some styles)
  fakeBlocks.forEach(fakeBlock => {
    drawStyledPlatform(fakeBlock.x, fakeBlock.y, fakeBlock.width, fakeBlock.height, visualStyle, true);
  });

  // Draw gravity zones with visual style
  if (ENABLE_GRAVITY_ZONES) {
    gravityZones.forEach(zone => {
      const isActive = player && player.currentGravityZone === zone.id;
      
      // Draw gravity zone with chapter-specific visual style
      drawStyledGravityZone(zone, isActive, visualStyle);
      
      // Debug info
      if (DEBUG_MODE) {
        ctx.fillStyle = '#ffff00';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Zone ${zone.id} (${zone.type})`, zone.x + 5, zone.y + 15);
      }
    });
  }

  // Draw door with visual style
  if (door) {
    drawStyledDoor(door, visualStyle);
  }

  // Draw spikes with visual style
  spikes.forEach(spike => {
    // Draw invisible trigger line (only if DEBUG_MODE is enabled)
    if (DEBUG_MODE && !spike.moved && !spike.triggered) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)'; // Yellow, transparent
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]); // Dashed line

      if (spike.triggerWidth > 0) {
        // Free-form trigger box
        ctx.fillStyle = 'rgba(255, 255, 0, 0.08)';
        ctx.fillRect(spike.triggerX, spike.triggerY, spike.triggerWidth, spike.triggerHeight);
        ctx.strokeRect(spike.triggerX, spike.triggerY, spike.triggerWidth, spike.triggerHeight);
      } else {
        // Classic trigger line
        ctx.beginPath();
        ctx.moveTo(spike.triggerX, spike.triggerY);
        ctx.lineTo(spike.triggerX, spike.triggerY + spike.triggerHeight);
        ctx.stroke();
      }
      ctx.setLineDash([]); // Reset to solid line

      // Draw small label showing the trap's shape, direction and speed
      ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
      ctx.font = '12px monospace';
      let shapeLabel;
      if (spike.triggerWidth > 0) {
        shapeLabel = `${Math.round(spike.triggerWidth)}x${Math.round(spike.triggerHeight)}px`;
      } else if (spike.triggerLength === null || spike.triggerLength === 0) {
        shapeLabel = 'full';
      } else if (spike.triggerLength > 0) {
        shapeLabel = `↑${spike.triggerLength}px`;
      } else {
        shapeLabel = `↓${Math.abs(spike.triggerLength)}px`;
      }
      const arrow = getSpikeDirectionVector(spike.direction).arrow;
      ctx.fillText(`${arrow}${spike.moveDistance / TILE_SIZE} [${shapeLabel}] x${spike.moveSpeed}`,
        spike.triggerX - 15, spike.y - 5);
    }

    // Draw spike with visual style
    drawStyledSpike(spike, visualStyle);
  });

  // Draw player trail effect (before player so it appears behind)
  if (!isDead && (gameState === 'playing' || gameState === 'paused')) {
    drawPlayerTrail();
  }

  // Draw player (always default style, doesn't change with chapters)
  if (!isDead && (gameState === 'playing' || gameState === 'paused')) {
    drawPlayer(player.x, player.y, player.width, player.height);
    
    // Developer mode indicator
    if (DEVELOPER_MODE) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('🎮 DEV MODE', 10, 25);
    }
  }
  
  // Draw gravity flip particles
  if (ENABLE_GRAVITY_ZONES && player) {
    player.gravityFlipParticles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    });
    ctx.globalAlpha = 1.0;
    
    // Draw gravity indicator UI
    if (player.gravityIndicatorAlpha > 0 && gameState === 'playing') {
      const text = player.gravityScale < 0 ? 'GRAVITY INVERTED' : 'GRAVITY NORMAL';
      const color = player.gravityScale < 0 ? '#ff4444' : '#44ff44';
      
      ctx.save();
      ctx.globalAlpha = player.gravityIndicatorAlpha;
      ctx.fillStyle = color;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(text, GAME_WIDTH / 2, 50);
      ctx.restore();
    }
  }

  // Death flash
  if (isDead && deathFlashTimer > 0 && gameState === 'playing') {
    ctx.fillStyle = `rgba(255, 0, 0, ${deathFlashTimer / DEATH_FLASH_DURATION * 0.5})`;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw "X_X" face (scaled)
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('X_X', player.x - 8, player.y + 30);
  }

  // Level complete window
  if (gameState === 'levelComplete') {
    drawLevelCompletePopup();
  }

  // Update trigger info display below canvas
  updateTriggerInfo();
  
  // Chapter-complete unlock window
  if (gameState === 'unlockNotification') {
    drawUnlockPopup();
  }

  // Banner while playing / testing a player-made level
  if (customLevelSession && gameState === 'playing' && typeof drawCustomSessionOverlay === 'function') {
    drawCustomSessionOverlay();
  }

  // In fullscreen the page's level name and death counter are off screen
  if (isFullscreenActive() && (gameState === 'playing' || gameState === 'levelComplete')) {
    drawFullscreenHud();
  }

  // Draw pause menu overlay if paused (must be after game is drawn)
  if (gameState === 'paused') {
    drawPauseMenu();
  }
  
  // Render transition overlay last (on top of everything)
  renderTransition();
}

// Render transition fade effect
function renderTransition() {
  if (transitionState !== 'none' && transitionAlpha > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${transitionAlpha})`;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
}

// A popup window: dimmed game behind, rounded card in front, both fading in.
// Returns the card box so the caller can lay content out inside it.
function uiPopup(w, h, accent, dim) {
  const intro = easeOutCubic(clamp01(screenIntro / 0.28));

  ctx.fillStyle = 'rgba(8, 7, 13, ' + (0.82 * intro).toFixed(3) + ')';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  if (dim) {
    ctx.fillStyle = dim;
    ctx.globalAlpha = intro;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.globalAlpha = 1;
  }

  const x = GAME_WIDTH / 2 - w / 2;
  const y = GAME_HEIGHT / 2 - h / 2;

  ctx.save();
  ctx.globalAlpha = intro;
  ctx.translate(0, (1 - intro) * 18);
  ctx.shadowColor = accent;
  ctx.shadowBlur = 26;
  uiCard(x, y, w, h, { fill: 'rgba(18, 16, 27, 0.97)', border: accent, lineWidth: 3, scan: true });
  ctx.shadowBlur = 0;
  return { x: x, y: y, w: w, h: h, intro: intro };
}

// Label left, value right - the row shape used across the popups
function uiPopupRow(box, y, label, value, labelColor) {
  const pad = 54;
  ctx.textAlign = 'left';
  ctx.font = '15px Arial, sans-serif';
  ctx.fillStyle = labelColor || '#8a84a0';
  ctx.fillText(label, box.x + pad, y);
  ctx.textAlign = 'right';
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.fillStyle = '#e8e4f5';
  ctx.fillText(value, box.x + box.w - pad, y);
}

// Overshooting ease, so the stars land with a bit of snap
function easeOutBack(t) {
  const c = 1.70158;
  const p = t - 1;
  return 1 + (c + 1) * p * p * p + c * p * p;
}

// The three stars, popping in one after another
function uiStarBurst(centerX, y, earned, baseSize, delay, gap) {
  const step = gap === undefined ? 0.15 : gap;
  const start = delay === undefined ? 0.15 : delay;
  for (let i = 0; i < 3; i++) {
    const t = clamp01((screenIntro - (start + i * step)) / 0.3);
    if (t <= 0) continue;
    const size = baseSize * easeOutBack(t);
    const filled = i < earned;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = size + 'px monospace';
    if (filled) {
      ctx.shadowColor = '#ffcc44';
      ctx.shadowBlur = 18 * t;
      ctx.fillStyle = '#ffcc44';
    } else {
      ctx.fillStyle = '#3f3a52';
    }
    ctx.fillText('★', centerX + (i - 1) * (baseSize * 1.15), y);
    ctx.restore();
  }
}

function formatLevelTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + (s < 10 ? '0' + s : s);
}

// Level complete window
function drawLevelCompletePopup() {
  const stars = calculateStars(levelDeaths);
  const accent = stars === 3 ? '#55dd88' : (stars > 0 ? '#ffcc44' : '#ff8866');
  const box = uiPopup(540, 430, accent);

  ctx.textAlign = 'center';
  ctx.font = 'bold 44px Impact, monospace';
  ctx.fillStyle = accent;
  ctx.fillText('LEVEL COMPLETE', GAME_WIDTH / 2, box.y + 64);

  const active = getActiveLevelData();
  if (active && active.name) {
    ctx.font = '14px monospace';
    ctx.fillStyle = '#7a6f9a';
    ctx.fillText(active.name, GAME_WIDTH / 2, box.y + 92);
  }

  uiStarBurst(GAME_WIDTH / 2, box.y + 172, stars, 46);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(box.x + 54, box.y + 206, box.w - 108, 1);

  uiPopupRow(box, box.y + 248, 'TIME', formatLevelTime(levelTime), '#88ddff');
  uiPopupRow(box, box.y + 286, 'DEATHS', String(levelDeaths), '#ff8888');
  uiPopupRow(box, box.y + 324, 'RATING', stars + ' / 3', '#ffcc44');

  const messages = [
    'Keep practicing. You can do better.',
    'Good effort. Try again for more stars.',
    'Great job. Keep improving.',
    'PERFECT. Not a single death.'
  ];
  ctx.textAlign = 'center';
  ctx.font = stars === 3 ? 'bold 17px Arial, sans-serif' : '17px Arial, sans-serif';
  ctx.fillStyle = accent;
  ctx.fillText(messages[stars], GAME_WIDTH / 2, box.y + 370);

  // What happens next, with the auto-advance timer draining underneath
  let footer;
  if (customLevelSession) {
    footer = customLevelSession.returnState === 'editor' ? 'Back to the editor' : 'Back to your levels';
  } else if (currentLevel < levels.length - 1) {
    footer = 'Next level loading';
  } else {
    footer = 'You beat every level  ·  ' + deaths + ' deaths in total';
  }
  ctx.font = '14px Arial, sans-serif';
  ctx.fillStyle = '#8a84a0';
  ctx.fillText(footer, GAME_WIDTH / 2, box.y + 404);

  const barW = box.w - 200;
  const barX = GAME_WIDTH / 2 - barW / 2;
  const left = clamp01(levelCompleteTimer / LEVEL_COMPLETE_DURATION);
  ctx.fillStyle = '#292437';
  uiRoundRect(barX, box.y + 414, barW, 4, 2);
  ctx.fill();
  ctx.fillStyle = accent;
  uiRoundRect(barX, box.y + 414, Math.max(2, barW * (1 - left)), 4, 2);
  ctx.fill();

  ctx.restore();
  ctx.textAlign = 'left';
}

// Chapter-complete unlock window
function drawUnlockPopup() {
  // Height follows the list, so one unlock doesn't leave half a card empty
  const itemCount = Math.max(1, unlockedItems.length);
  const box = uiPopup(600, 270 + (itemCount - 1) * 78, '#8c44ff');

  ctx.textAlign = 'center';
  ctx.font = 'bold 44px Impact, monospace';
  ctx.fillStyle = '#ffcc44';
  ctx.fillText('NEW UNLOCKS', GAME_WIDTH / 2, box.y + 68);

  ctx.font = '16px Arial, sans-serif';
  ctx.fillStyle = '#8a84a0';
  ctx.fillText('Chapter complete. You earned:', GAME_WIDTH / 2, box.y + 98);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(box.x + 48, box.y + 118, box.w - 96, 1);

  const rowH = 78;
  const listTop = box.y + 150;
  unlockedItems.forEach((item, index) => {
    const appear = easeOutCubic(clamp01((screenIntro - (0.2 + index * 0.14)) / 0.4));
    if (appear <= 0.001) return;
    const y = listTop + index * rowH;

    ctx.save();
    ctx.globalAlpha = appear;
    ctx.translate((1 - appear) * -20, 0);

    uiCard(box.x + 48, y - 26, box.w - 96, 60, {
      radius: 9, fill: 'rgba(33, 29, 46, 0.9)', border: '#463f5c', lineWidth: 1
    });

    // Clip to the row: the trail sample streams in from off the card edge
    ctx.save();
    uiRoundRect(box.x + 48, y - 26, box.w - 96, 60, 9);
    ctx.clip();

    // Swatch: the real colour, or a little trail sample
    const swX = box.x + 70;
    if (item.type === 'color') {
      ctx.fillStyle = item.value;
      uiRoundRect(swX, y - 14, 34, 34, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      drawTrailPreview(item.value, swX + 12, y - 11, 28);
      ctx.fillStyle = playerColor;
      uiRoundRect(swX + 12, y - 11, 28, 28, 5);
      ctx.fill();
    }

    ctx.textAlign = 'left';
    ctx.font = 'bold 21px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(item.name + (item.type === 'color' ? ' Color' : ' Trail'), swX + 60, y - 1);
    ctx.font = '13px Arial, sans-serif';
    ctx.fillStyle = '#8a84a0';
    ctx.fillText('Equip it in CUSTOMIZE', swX + 60, y + 18);
    ctx.restore();   // row clip
    ctx.restore();
  });

  // Pulsing prompt so it reads as "waiting for you"
  const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(uiTime * 3));
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillStyle = '#55dd88';
  ctx.fillText('PRESS SPACE OR ENTER TO CONTINUE', GAME_WIDTH / 2, box.y + box.h - 34);
  ctx.restore();

  ctx.restore();
  ctx.textAlign = 'left';
}

// Draw pause menu
function drawPauseMenu() {
  // Darken the game, then blur the edges of attention with a vignette
  ctx.fillStyle = 'rgba(8, 7, 13, 0.82)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  const vignette = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  vignette.addColorStop(0, 'rgba(140, 68, 255, 0.07)');
  vignette.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(140, 68, 255, 0.07)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const intro = easeOutCubic(clamp01(screenIntro / 0.35));

  ctx.save();
  ctx.globalAlpha = intro;
  ctx.textAlign = 'center';
  ctx.font = 'bold 72px Impact, monospace';
  ctx.fillStyle = '#9844ff';
  ctx.fillText('PAUSED', GAME_WIDTH / 2, 178 - (1 - intro) * 14);
  ctx.font = '15px monospace';
  ctx.fillStyle = '#7a6f9a';
  const active = getActiveLevelData();
  if (active && active.name) ctx.fillText(active.name, GAME_WIDTH / 2, 208);
  ctx.restore();

  window.pauseButtons = [];

  const entries = [
    { label: 'RESUME', action: 'resume', accent: '#55dd88' },
    { label: 'RESTART', action: 'restart', accent: '#44aaff' },
    { label: isFullscreenActive() ? 'EXIT FULLSCREEN' : 'FULLSCREEN',
      action: 'fullscreen', accent: '#44ddcc' },
    { label: 'SETTINGS', action: 'settings', accent: '#8c44ff' },
    { label: customLevelSession
        ? (customLevelSession.returnState === 'editor' ? 'BACK TO EDITOR' : 'BACK TO MY LEVELS')
        : 'QUIT TO MENU',
      action: 'quit', accent: '#ff6b6b' }
  ];

  const bw = 340, bh = 58, gap = 14;
  entries.forEach((entry, index) => {
    const btn = {
      x: GAME_WIDTH / 2 - bw / 2,
      y: 260 + index * (bh + gap),
      width: bw, height: bh,
      action: entry.action,
      buttonIndex: index
    };
    window.pauseButtons.push(btn);

    const appear = uiStagger(index, 0.05, 0.05);
    if (appear <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = appear;
    ctx.translate(0, (1 - appear) * 12);
    uiActionButton(btn, entry.label, {
      accent: entry.accent,
      font: '24px Arial, sans-serif',
      chevron: true
    });
    ctx.restore();
  });

  ctx.save();
  ctx.globalAlpha = easeOutCubic(clamp01((screenIntro - 0.3) / 0.5));
  ctx.fillStyle = '#4a4560';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ESC  resume      R  restart      F  fullscreen', GAME_WIDTH / 2, 682);
  ctx.restore();
  ctx.textAlign = 'left';
}

// ===== SHARED MENU WIDGETS =====
// Every menu screen is built from these, so they all share one look: the
// drifting deception grid behind, an Impact header, rounded cards with an
// accent tab, and content that staggers in when the screen appears.

// Standard header. Returns the y the content below it should start at.
function uiScreenHeader(title, subtitle, accent) {
  const intro = easeOutCubic(clamp01(screenIntro / 0.5));
  ctx.save();
  ctx.globalAlpha = intro;
  ctx.translate((1 - intro) * -24, 0);
  ctx.textAlign = 'left';
  ctx.font = 'bold 54px Impact, monospace';
  ctx.fillStyle = accent || '#9844ff';
  ctx.fillText(title, 90, 104);
  if (subtitle) {
    ctx.font = '17px monospace';
    ctx.fillStyle = '#7a6f9a';
    ctx.fillText(subtitle, 92, 134);
  }
  ctx.restore();

  // Hairline under the header, drawing itself out from the left
  const rule = easeOutCubic(clamp01((screenIntro - 0.15) / 0.6));
  ctx.fillStyle = 'rgba(152, 68, 255, 0.25)';
  ctx.fillRect(90, 152, 1020 * rule, 1);
  return 190;
}

// Eased progress value, shared by every bar on every screen so they all glide
// up to their real value instead of snapping in on the first frame.
function uiBarValue(key, target) {
  if (!menuBarFill[key]) menuBarFill[key] = { shown: 0, target: 0 };
  menuBarFill[key].target = clamp01(target);
  return menuBarFill[key].shown;
}

function uiCard(x, y, w, h, opts) {
  const o = opts || {};
  uiRoundRect(x, y, w, h, o.radius === undefined ? 12 : o.radius);
  ctx.fillStyle = o.fill || 'rgba(21, 19, 31, 0.9)';
  ctx.fill();
  ctx.strokeStyle = o.border || '#3a3550';
  ctx.lineWidth = o.lineWidth || 2;
  ctx.stroke();

  if (o.scan) {
    ctx.save();
    uiRoundRect(x, y, w, h, o.radius === undefined ? 12 : o.radius);
    ctx.clip();
    const scanY = y + ((uiTime * 55) % (h + 120)) - 60;
    const glow = ctx.createLinearGradient(0, scanY - 45, 0, scanY + 45);
    glow.addColorStop(0, 'rgba(140, 68, 255, 0)');
    glow.addColorStop(0.5, 'rgba(140, 68, 255, 0.08)');
    glow.addColorStop(1, 'rgba(140, 68, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x, scanY - 45, w, 90);
    ctx.restore();
  }
}

// The menu's button look, reused everywhere. `btn` is the hit box the screen
// already stores; this only draws it.
function uiActionButton(btn, label, opts) {
  const o = opts || {};
  const active = o.active !== undefined ? o.active : isButtonHovered(btn);
  const locked = !!o.locked;
  const accent = o.accent || '#8c44ff';
  const h = btn.height;

  ctx.save();
  if (active && !locked) {
    ctx.shadowColor = accent;
    ctx.shadowBlur = 16;
  }
  uiRoundRect(btn.x, btn.y, btn.width, h, o.radius === undefined ? 8 : o.radius);
  ctx.fillStyle = locked
    ? 'rgba(28, 26, 38, 0.9)'
    : (o.danger
        ? (active ? 'rgba(90, 40, 46, 0.95)' : 'rgba(58, 30, 36, 0.9)')
        : (active ? 'rgba(58, 50, 84, 0.95)' : 'rgba(35, 31, 48, 0.88)'));
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = locked ? '#3d3a4d' : (active ? accent : (o.danger ? '#7a4a52' : '#463f5c'));
  ctx.lineWidth = active ? 3 : 2;
  ctx.stroke();

  if (o.tab !== false) {
    const tabH = (h - 18) * (active ? 1 : 0.4);
    ctx.fillStyle = locked ? '#55506b' : accent;
    uiRoundRect(btn.x + 8, btn.y + (h - tabH) / 2, 4, tabH, 2);
    ctx.fill();
  }

  ctx.textAlign = o.center ? 'center' : 'left';
  ctx.font = o.font || '26px Arial, sans-serif';
  ctx.fillStyle = locked ? '#7e7a90' : (o.textColor || (active ? '#ffffff' : '#c9c4da'));
  const labelX = o.center ? btn.x + btn.width / 2 : btn.x + (o.tab === false ? 18 : 28);
  ctx.fillText(label, labelX, btn.y + h / 2 + (o.font && /1[0-9]px/.test(o.font) ? 5 : 9));

  if (o.chevron && active && !locked) {
    ctx.textAlign = 'right';
    ctx.font = '22px Arial, sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText('›', btn.x + btn.width - 20, btn.y + h / 2 + 8);
  }
  ctx.restore();
}

// Bottom-left back button, in the same place on every screen
function uiBackButton(label) {
  const btn = { x: 90, y: 636, width: 150, height: 46, action: 'back' };
  const intro = easeOutCubic(clamp01((screenIntro - 0.3) / 0.5));
  ctx.save();
  ctx.globalAlpha = intro;
  uiActionButton(btn, label || '◀ BACK', { font: '18px Arial, sans-serif', accent: '#8c44ff' });
  ctx.restore();
  return btn;
}

function uiFooter(text) {
  ctx.save();
  ctx.globalAlpha = easeOutCubic(clamp01((screenIntro - 0.5) / 0.6));
  ctx.fillStyle = '#4a4560';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, GAME_WIDTH / 2, 700);
  ctx.restore();
  ctx.textAlign = 'left';
}

// Per-item stagger, so lists and grids deal themselves in
function uiStagger(index, step, delay) {
  return easeOutCubic(clamp01((screenIntro - ((delay === undefined ? 0.2 : delay) + index * (step === undefined ? 0.05 : step))) / 0.45));
}

function uiStarRow(x, y, stars, size, dim) {
  ctx.textAlign = 'left';
  ctx.font = size + 'px monospace';
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < stars ? '#ffcc44' : (dim || '#3f3a52');
    ctx.fillText('★', x + i * (size * 0.95), y);
  }
}

// ===== MAIN MENU =====
// The menu is a two-column console: the title and buttons on the left, and an
// info panel on the right that describes whatever entry is highlighted. Giving
// the detail text its own column is what keeps long copy - the level editor
// unlock requirement especially - from ever crowding the buttons.

const MENU_ENTRIES = [
  { label: 'START GAME', action: 'startGame',   accent: '#44aaff', blurb: 'Face the story, one chapter at a time.' },
  { label: 'MY LEVELS',  action: 'levelEditor', accent: '#8c44ff', blurb: 'Build, test and play levels of your own.' },
  { label: 'CUSTOMIZE',  action: 'customize',   accent: '#ffcc44', blurb: 'Change your cube and the trail it leaves.' },
  { label: 'SETTINGS',   action: 'settings',    accent: '#55dd88', blurb: 'Audio levels and everything else.' }
];

// Screens that use the shared menu look and its animation clock
const UI_SCREENS = ['menu', 'chapterSelect', 'levelSelect', 'customize', 'settings', 'paused',
                   'levelComplete', 'unlockNotification'];

const MENU_LAYOUT = {
  colX: 90, btnW: 380, btnH: 62, btnGap: 74, btnTop: 250,
  panelX: 560, panelY: 120, panelW: 560, panelH: 470, pad: 32
};

let uiTime = 0;           // drives every looping animation, on every screen
let screenIntro = 0;      // seconds since the current screen appeared
let uiScreenKey = null;   // which screen screenIntro is measuring
let menuActiveIndex = 0;   // entry the info panel is describing
let menuPanelIndex = 0;    // entry it is currently showing, during a crossfade
let menuPanelFade = 1;
let menuButtonSlide = [];
let menuBarFill = {};
let uiMotes = null;
let uiGlitch = { timer: 0, next: 0.6, split: 0, sliceY: 0, sliceH: 0, sliceDx: 0 };

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

// Frame-rate independent lerp, so the menu animates the same at 60 and 144 Hz
function approach(current, target, dt, rate) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function uiRoundRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Blocks drifting up the background, half of them only pretending to be solid
function buildUiMotes() {
  const motes = [];
  for (let i = 0; i < 18; i++) {
    motes.push({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      size: 14 + Math.random() * 34,
      speed: 5 + Math.random() * 15,
      phase: Math.random() * Math.PI * 2,
      rate: 0.3 + Math.random() * 0.5
    });
  }
  return motes;
}

// Every menu-style screen shares this clock, so they all breathe in time and
// each one replays its intro when you arrive on it.
function updateUiAnimation(screen, deltaTime) {
  const dt = Math.min(deltaTime, 0.1); // a tab switch shouldn't teleport everything

  if (uiScreenKey !== screen) {
    uiScreenKey = screen;
    screenIntro = 0;
    menuPanelFade = 1;
    menuBarFill = {};
    menuButtonSlide = MENU_ENTRIES.map(() => 0);
  }
  uiTime += dt;
  screenIntro += dt;
  if (!uiMotes) uiMotes = buildUiMotes();

  uiMotes.forEach(m => {
    m.y -= m.speed * dt;
    if (m.y < -m.size) {
      m.y = GAME_HEIGHT + m.size;
      m.x = Math.random() * GAME_WIDTH;
    }
  });

  // Progress bars ease toward their real value instead of snapping in
  Object.keys(menuBarFill).forEach(key => {
    const b = menuBarFill[key];
    b.shown = approach(b.shown, b.target, dt, 7);
  });

  // The rest is main-menu specific
  if (screen !== 'menu') return;

  // Title glitch: short bursts with quiet gaps between them
  uiGlitch.timer += dt;
  if (uiGlitch.timer >= uiGlitch.next) {
    uiGlitch.timer = 0;
    uiGlitch.next = 0.4 + Math.random() * 2.6;
    uiGlitch.split = 3 + Math.random() * 6;
    uiGlitch.sliceY = Math.random();
    uiGlitch.sliceH = 6 + Math.random() * 16;
    uiGlitch.sliceDx = (Math.random() - 0.5) * 30;
  }
  uiGlitch.split = approach(uiGlitch.split, 0, dt, 7);

  // The panel follows the mouse when it is over a button, keyboard focus otherwise
  const buttons = window.menuButtons || [];
  let active = Math.min(Math.max(0, selectedButtonIndex), MENU_ENTRIES.length - 1);
  buttons.forEach((b, i) => {
    if (mouseX >= b.x && mouseX <= b.x + b.width && mouseY >= b.y && mouseY <= b.y + b.height) active = i;
  });
  menuActiveIndex = active;

  MENU_ENTRIES.forEach((entry, i) => {
    menuButtonSlide[i] = approach(menuButtonSlide[i] || 0, i === active ? 18 : 0, dt, 14);
  });

  // Crossfade the panel out and back in when the highlight moves
  if (menuPanelIndex !== active) {
    menuPanelFade = approach(menuPanelFade, 0, dt, 24);
    if (menuPanelFade < 0.06) menuPanelIndex = active;
  } else {
    menuPanelFade = approach(menuPanelFade, 1, dt, 16);
  }
}

function drawUiBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, DEVELOPER_MODE ? '#171739' : '#15121e');
  sky.addColorStop(1, DEVELOPER_MODE ? '#0b0b1e' : '#08070d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Slow drifting grid
  const cell = 60;
  const drift = (uiTime * 10) % cell;
  ctx.strokeStyle = 'rgba(152, 68, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -cell; x <= GAME_WIDTH + cell; x += cell) {
    ctx.moveTo(x + drift, 0);
    ctx.lineTo(x + drift, GAME_HEIGHT);
  }
  for (let y = -cell; y <= GAME_HEIGHT + cell; y += cell) {
    ctx.moveTo(0, y - drift);
    ctx.lineTo(GAME_WIDTH, y - drift);
  }
  ctx.stroke();

  // Some blocks are solid, some are only outlines - the game's whole premise
  (uiMotes || []).forEach(m => {
    const breathe = 0.5 + 0.5 * Math.sin(uiTime * m.rate * 2 + m.phase);
    ctx.globalAlpha = 0.08 + 0.13 * breathe;
    if (Math.sin(uiTime * m.rate + m.phase) > 0.5) {
      ctx.fillStyle = '#8c44ff';
      ctx.fillRect(m.x, m.y, m.size, m.size);
    } else {
      ctx.strokeStyle = '#8c44ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(m.x, m.y, m.size, m.size);
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  });
}

function drawMenuTitle() {
  const x = MENU_LAYOUT.colX;
  const y = 142;
  const intro = easeOutCubic(clamp01(screenIntro / 0.7));
  const split = uiGlitch.split;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = 'bold 84px Impact, monospace';
  ctx.globalAlpha = intro;
  ctx.translate((1 - intro) * -40, 0);

  if (split > 0.4) {
    // Chromatic split, the cheap trick that reads instantly as "signal error"
    ctx.globalAlpha = intro * 0.5;
    ctx.fillStyle = '#ff2b6b';
    ctx.fillText('DISBELIEVE', x - split, y);
    ctx.fillStyle = '#2bf0ff';
    ctx.fillText('DISBELIEVE', x + split, y);
    ctx.globalAlpha = intro;
  }

  ctx.fillStyle = '#9844ff';
  ctx.fillText('DISBELIEVE', x, y);

  if (split > 0.4) {
    // One horizontal band of the title slides out of place
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 40, y - 68 + uiGlitch.sliceY * 72, 560, uiGlitch.sliceH);
    ctx.clip();
    ctx.fillStyle = '#e8dcff';
    ctx.fillText('DISBELIEVE', x + uiGlitch.sliceDx, y);
    ctx.restore();
  }
  ctx.restore();

  // Tagline types out, with a cursor that keeps blinking afterwards
  const tagline = 'Can you survive the deception?';
  const shown = tagline.slice(0, Math.floor(clamp01((screenIntro - 0.5) / 1.1) * tagline.length));
  ctx.save();
  ctx.globalAlpha = intro;
  ctx.textAlign = 'left';
  ctx.font = '19px monospace';
  ctx.fillStyle = '#7a6f9a';
  ctx.fillText(shown, x, 184);
  if (Math.sin(uiTime * 6) > 0) {
    ctx.fillStyle = '#9844ff';
    ctx.fillRect(x + ctx.measureText(shown).width + 3, 170, 10, 17);
  }
  ctx.restore();
}

// One labelled progress bar. Returns the y its bottom edge sits on.
function uiStat(x, y, w, label, valueText, ratio, color, key) {
  const fillValue = uiBarValue(key, ratio);

  ctx.textAlign = 'left';
  ctx.font = '13px Arial, sans-serif';
  ctx.fillStyle = '#8a84a0';
  ctx.fillText(label, x, y);
  ctx.textAlign = 'right';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillStyle = '#e8e4f5';
  ctx.fillText(valueText, x + w, y);

  const barY = y + 11;
  ctx.fillStyle = '#292437';
  uiRoundRect(x, barY, w, 8, 4);
  ctx.fill();

  const fill = fillValue;
  if (fill > 0.004) {
    ctx.fillStyle = color;
    uiRoundRect(x, barY, Math.max(8, w * fill), 8, 4);
    ctx.fill();
  }
  return barY + 8;
}

function drawMenuPanelBody(entry, locked, x, y, w) {
  const progress = getEditorUnlockProgress();

  if (entry.action === 'startGame') {
    let cursor = y;
    cursor = uiStat(x, cursor, w, 'LEVELS COMPLETED', progress.completed + ' / ' + progress.totalLevels,
                          progress.completed / progress.totalLevels, '#44aaff', 'story-levels') + 38;
    cursor = uiStat(x, cursor, w, 'STARS EARNED', progress.stars + ' / ' + progress.maxStars,
                          progress.stars / progress.maxStars, '#ffcc44', 'story-stars') + 46;

    ctx.textAlign = 'left';
    ctx.font = '13px Arial, sans-serif';
    ctx.fillStyle = '#6d6786';
    ctx.fillText('CHAPTERS', x, cursor);
    cursor += 28;

    chapters.forEach((chapter, chapterIndex) => {
      let done = 0;
      for (let i = 0; i < chapter.levels.length; i++) {
        if (completedLevels.has(getGlobalLevelIndex(chapterIndex, i))) done++;
      }
      const complete = done === chapter.levels.length;
      ctx.textAlign = 'left';
      ctx.font = '15px Arial, sans-serif';
      ctx.fillStyle = complete ? '#55dd88' : (done > 0 ? '#c9c4da' : '#6d6786');
      ctx.fillText(chapter.name, x, cursor);
      ctx.textAlign = 'right';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillStyle = complete ? '#55dd88' : '#8a84a0';
      ctx.fillText(done + ' / ' + chapter.levels.length, x + w, cursor);
      cursor += 27;
    });
    return;
  }

  if (entry.action === 'levelEditor') {
    if (locked) {
      // The reason this redesign exists: the unlock detail gets a whole column
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 90, 90, 0.12)';
      uiRoundRect(x, y - 17, 104, 26, 13);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 120, 120, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = 'bold 13px Arial, sans-serif';
      ctx.fillStyle = '#ff8a8a';
      ctx.fillText('\u{1F512} LOCKED', x + 13, y + 1);

      let cursor = y + 48;
      ctx.font = '16px Arial, sans-serif';
      ctx.fillStyle = '#c9c4da';
      ctx.fillText(getEditorUnlockHint(), x, cursor);
      cursor += 44;

      cursor = uiStat(x, cursor, w, 'LEVELS FINISHED', progress.completed + ' / ' + progress.totalLevels,
                            progress.completed / progress.totalLevels, '#8c44ff', 'unlock-levels') + 38;
      cursor = uiStat(x, cursor, w, 'STARS EARNED', progress.stars + ' / ' + progress.requiredStars,
                            progress.stars / progress.requiredStars, '#8c44ff', 'unlock-stars') + 40;

      const remaining = [];
      if (progress.levelsLeft > 0) {
        remaining.push(progress.levelsLeft + (progress.levelsLeft === 1 ? ' level' : ' levels'));
      }
      if (progress.starsLeft > 0) remaining.push(progress.starsLeft + '★');
      ctx.textAlign = 'left';
      ctx.font = '15px Arial, sans-serif';
      ctx.fillStyle = '#8a84a0';
      ctx.fillText(remaining.length ? remaining.join(' and ') + ' to go' : 'Requirements met.', x, cursor);
      return;
    }

    const saved = (typeof loadCustomLevels === 'function') ? loadCustomLevels() : [];
    ctx.textAlign = 'left';
    ctx.font = 'bold 44px Impact, monospace';
    ctx.fillStyle = '#8c44ff';
    ctx.fillText(saved.length, x, y + 24);
    ctx.font = '15px Arial, sans-serif';
    ctx.fillStyle = '#8a84a0';
    ctx.fillText(saved.length === 1 ? 'level saved' : 'levels saved', x + 46, y + 24);

    let cursor = y + 70;
    saved.slice(0, 5).forEach(level => {
      ctx.textAlign = 'left';
      ctx.font = '15px Arial, sans-serif';
      ctx.fillStyle = '#c9c4da';
      ctx.fillText(level.name || 'Untitled', x, cursor);
      cursor += 26;
    });
    if (!saved.length) {
      ctx.font = '15px Arial, sans-serif';
      ctx.fillStyle = '#6d6786';
      ctx.fillText('Nothing built yet. Open it and make something.', x, cursor);
    }
    return;
  }

  if (entry.action === 'customize') {
    // A live preview of the cube, idling the way it does in game
    const bob = Math.sin(uiTime * 2.2) * 5;
    const size = 70;
    const px = x + 10;
    const py = y + 30 + bob;

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(px - 12, y + 30 + size + 8, size + 24, 4);
    drawPlayer(px, py, size, size);

    ctx.textAlign = 'left';
    ctx.font = '13px Arial, sans-serif';
    ctx.fillStyle = '#6d6786';
    ctx.fillText('COLOR', px + size + 40, y + 42);
    ctx.fillStyle = playerColor;
    uiRoundRect(px + size + 40, y + 52, 26, 26, 5);
    ctx.fill();
    ctx.font = '15px monospace';
    ctx.fillStyle = '#c9c4da';
    ctx.fillText(playerColor.toUpperCase(), px + size + 76, y + 71);

    ctx.font = '13px Arial, sans-serif';
    ctx.fillStyle = '#6d6786';
    ctx.fillText('TRAIL', px + size + 40, y + 110);
    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = '#c9c4da';
    ctx.fillText(playerTrail === 'none' ? 'None' : playerTrail.charAt(0).toUpperCase() + playerTrail.slice(1),
                 px + size + 40, y + 134);
    return;
  }

  if (entry.action === 'settings') {
    let cursor = y;
    cursor = uiStat(x, cursor, w, 'MUSIC', Math.round(musicVolume * 100) + '%',
                          musicVolume, '#55dd88', 'set-music') + 38;
    cursor = uiStat(x, cursor, w, 'SOUND EFFECTS', Math.round(sfxVolume * 100) + '%',
                          sfxVolume, '#55dd88', 'set-sfx') + 46;

    ctx.textAlign = 'left';
    ctx.font = '13px Arial, sans-serif';
    ctx.fillStyle = '#6d6786';
    ctx.fillText('CONTROLS', x, cursor);
    cursor += 28;
    [['Move', 'A / D  or  ← →'], ['Jump', 'SPACE  or  W'], ['Restart', 'R'], ['Pause', 'ESC']]
      .forEach(row => {
        ctx.textAlign = 'left';
        ctx.font = '15px Arial, sans-serif';
        ctx.fillStyle = '#c9c4da';
        ctx.fillText(row[0], x, cursor);
        ctx.textAlign = 'right';
        ctx.font = '14px monospace';
        ctx.fillStyle = '#8a84a0';
        ctx.fillText(row[1], x + w, cursor);
        cursor += 27;
      });
  }
}

function drawMenuPanel(editorUnlocked) {
  const L = MENU_LAYOUT;
  const intro = easeOutCubic(clamp01((screenIntro - 0.3) / 0.7));
  if (intro <= 0.001) return;

  ctx.save();
  ctx.globalAlpha = intro;

  uiRoundRect(L.panelX, L.panelY, L.panelW, L.panelH, 12);
  ctx.fillStyle = 'rgba(21, 19, 31, 0.9)';
  ctx.fill();
  ctx.strokeStyle = '#3a3550';
  ctx.lineWidth = 2;
  ctx.stroke();

  // A scanline sweeping down the card, so it never looks like a static box
  ctx.save();
  uiRoundRect(L.panelX, L.panelY, L.panelW, L.panelH, 12);
  ctx.clip();
  const scanY = L.panelY + ((uiTime * 55) % (L.panelH + 120)) - 60;
  const glow = ctx.createLinearGradient(0, scanY - 45, 0, scanY + 45);
  glow.addColorStop(0, 'rgba(140, 68, 255, 0)');
  glow.addColorStop(0.5, 'rgba(140, 68, 255, 0.08)');
  glow.addColorStop(1, 'rgba(140, 68, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(L.panelX, scanY - 45, L.panelW, 90);
  ctx.restore();

  const entry = MENU_ENTRIES[menuPanelIndex] || MENU_ENTRIES[0];
  const locked = entry.action === 'levelEditor' && !editorUnlocked;
  const x = L.panelX + L.pad;
  const w = L.panelW - L.pad * 2;

  // Content fades out and back in when the highlighted entry changes
  ctx.globalAlpha = intro * menuPanelFade;
  ctx.translate(0, (1 - menuPanelFade) * 8);

  ctx.textAlign = 'left';
  ctx.font = 'bold 32px Impact, monospace';
  ctx.fillStyle = locked ? '#7e7a90' : entry.accent;
  ctx.fillText(entry.label, x, L.panelY + 62);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x, L.panelY + 78, w, 1);

  ctx.font = '15px Arial, sans-serif';
  ctx.fillStyle = '#8a84a0';
  ctx.fillText(entry.blurb, x, L.panelY + 108);

  drawMenuPanelBody(entry, locked, x, L.panelY + 160, w);
  ctx.restore();
}

// Draw main menu
function drawMenu() {
  const L = MENU_LAYOUT;
  const editorUnlocked = isLevelEditorUnlocked();

  drawUiBackground();
  drawMenuTitle();
  drawMenuPanel(editorUnlocked);

  window.menuButtons = [];

  MENU_ENTRIES.forEach((entry, index) => {
    const locked = entry.action === 'levelEditor' && !editorUnlocked;
    const rowY = L.btnTop + index * L.btnGap;
    const slide = menuButtonSlide[index] || 0;

    // The hit box covers both the resting and the slid-out position, so the
    // button can never slide out from under the cursor and start flickering
    const button = {
      x: L.colX,
      y: rowY,
      width: L.btnW + 18,
      height: L.btnH,
      action: entry.action,
      buttonIndex: index,
      locked: locked
    };
    window.menuButtons.push(button);

    const appear = easeOutCubic(clamp01((screenIntro - (0.15 + index * 0.08)) / 0.5));
    if (appear <= 0.001) return;

    const active = index === menuActiveIndex;
    const bx = L.colX + slide;

    ctx.save();
    ctx.globalAlpha = appear;
    ctx.translate((1 - appear) * -30, 0);

    if (active && !locked) {
      // A soft glow so the highlighted row reads from across the screen
      ctx.shadowColor = entry.accent;
      ctx.shadowBlur = 18;
    }
    uiRoundRect(bx, rowY, L.btnW, L.btnH, 8);
    ctx.fillStyle = locked
      ? 'rgba(28, 26, 38, 0.9)'
      : (active ? 'rgba(58, 50, 84, 0.95)' : 'rgba(35, 31, 48, 0.88)');
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = locked ? '#3d3a4d' : (active ? entry.accent : '#463f5c');
    ctx.lineWidth = active ? 3 : 2;
    ctx.stroke();

    // Accent tab on the left edge, which stretches when the row is active
    const tabH = (L.btnH - 18) * (active ? 1 : 0.4);
    ctx.fillStyle = locked ? '#55506b' : entry.accent;
    uiRoundRect(bx + 8, rowY + (L.btnH - tabH) / 2, 4, tabH, 2);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = '30px Arial, sans-serif';
    ctx.fillStyle = locked ? '#7e7a90' : (active ? '#ffffff' : '#c9c4da');
    ctx.fillText(entry.label, bx + 28, rowY + 41);

    if (locked) {
      ctx.textAlign = 'right';
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText('\u{1F512}', bx + L.btnW - 18, rowY + 40);
    } else if (active) {
      ctx.textAlign = 'right';
      ctx.font = '22px Arial, sans-serif';
      ctx.fillStyle = entry.accent;
      ctx.fillText('›', bx + L.btnW - 20, rowY + 42);
    }
    ctx.restore();
  });

  // Feedback after clicking something that is still locked
  if (menuNoticeTimer > 0 && menuNotice) {
    const fade = clamp01(menuNoticeTimer / 0.8);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    const noticeW = ctx.measureText(menuNotice).width + 44;
    const noticeX = GAME_WIDTH / 2 - noticeW / 2;
    uiRoundRect(noticeX, 626, noticeW, 38, 19);
    ctx.fillStyle = 'rgba(255, 90, 90, 0.14)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 120, 120, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ff8866';
    ctx.fillText(menuNotice, GAME_WIDTH / 2, 650);
    ctx.restore();
  }

  ctx.globalAlpha = easeOutCubic(clamp01((screenIntro - 0.8) / 0.6));
  ctx.fillStyle = '#4a4560';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('↑ ↓  navigate      ENTER  select      F  fullscreen      Hint: DISBELIEVE WHAT YOU SEE',
               GAME_WIDTH / 2, 694);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'left';
}

// Draw player with current customization
function drawPlayer(x, y, width, height) {
  const outlineColor = adjustBrightness(playerColor, -0.3);
  
  // Always draw as square
  ctx.fillStyle = playerColor;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  
  // Eyes - scaled proportionally to player size
  const scale = width / 45; // 45 is the default player size
  const eyeWidth = 9 * scale;
  const eyeHeight = 9 * scale;
  const pupilWidth = 4 * scale;
  const pupilHeight = 4 * scale;
  const eyeOffsetX = 12 * scale;
  const eyeOffsetY = 12 * scale;
  const eyeSpacing = 12 * scale;
  const pupilOffsetX = 3 * scale;
  const pupilOffsetY = 3 * scale;
  
  ctx.fillStyle = 'white';
  ctx.fillRect(x + eyeOffsetX, y + eyeOffsetY, eyeWidth, eyeHeight);
  ctx.fillRect(x + eyeOffsetX + eyeSpacing, y + eyeOffsetY, eyeWidth, eyeHeight);
  ctx.fillStyle = 'black';
  ctx.fillRect(x + eyeOffsetX + pupilOffsetX, y + eyeOffsetY + pupilOffsetY, pupilWidth, pupilHeight);
  ctx.fillRect(x + eyeOffsetX + eyeSpacing + pupilOffsetX, y + eyeOffsetY + pupilOffsetY, pupilWidth, pupilHeight);
}

// Draw player trail effect
function drawPlayerTrail() {
  if (playerTrail === 'none' || trailHistory.length === 0) return;
  
  if (playerTrail === 'fade') {
    // Fading trail - draw previous positions with decreasing opacity
    trailHistory.forEach((pos, index) => {
      const alpha = pos.alpha * 0.5;
      const trailColor = playerColor.replace('#', '');
      const r = parseInt(trailColor.substr(0, 2), 16);
      const g = parseInt(trailColor.substr(2, 2), 16);
      const b = parseInt(trailColor.substr(4, 2), 16);
      
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fillRect(pos.x, pos.y, player.width, player.height);
    });
  } else if (playerTrail === 'particles') {
    // Particle trail - small squares scattered randomly behind
    trailHistory.forEach((pos, index) => {
      if (index % 2 === 0) { // Only every other position
        const alpha = pos.alpha * 0.7;
        const trailColor = playerColor.replace('#', '');
        const r = parseInt(trailColor.substr(0, 2), 16);
        const g = parseInt(trailColor.substr(2, 2), 16);
        const b = parseInt(trailColor.substr(4, 2), 16);
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        const size = 8;
        
        // Generate 3-5 random particles per trail position
        const numParticles = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numParticles; i++) {
          // Random offset within player bounds
          const offsetX = (Math.random() - 0.5) * player.width;
          const offsetY = (Math.random() - 0.5) * player.height;
          const particleSize = size * (0.5 + Math.random() * 0.5); // Vary particle size
          
          ctx.fillRect(
            pos.x + player.width/2 + offsetX - particleSize/2, 
            pos.y + player.height/2 + offsetY - particleSize/2, 
            particleSize, 
            particleSize
          );
        }
      }
    });
  } else if (playerTrail === 'dotted') {
    // Dotted trail - circular dots following the player
    trailHistory.forEach((pos, index) => {
      if (index % 3 === 0) { // Only every third position to create spacing
        const alpha = pos.alpha * 0.6;
        const trailColor = playerColor.replace('#', '');
        const r = parseInt(trailColor.substr(0, 2), 16);
        const g = parseInt(trailColor.substr(2, 2), 16);
        const b = parseInt(trailColor.substr(4, 2), 16);
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        const dotRadius = 6 + (pos.alpha * 4); // Dots shrink as they fade
        ctx.arc(pos.x + player.width/2, pos.y + player.height/2, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  } else if (playerTrail === 'dash') {
    // Dashed trail - rectangular segments with gaps
    trailHistory.forEach((pos, index) => {
      const segmentLength = 3; // How many positions to draw before gap
      const gapLength = 2; // How many positions to skip
      const cycle = segmentLength + gapLength;
      
      if (index % cycle < segmentLength) { // Only draw during segment, not gap
        const alpha = pos.alpha * 0.55;
        const trailColor = playerColor.replace('#', '');
        const r = parseInt(trailColor.substr(0, 2), 16);
        const g = parseInt(trailColor.substr(2, 2), 16);
        const b = parseInt(trailColor.substr(4, 2), 16);
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        // Draw thinner rectangles for dash effect
        const dashWidth = player.width * 0.8;
        const dashHeight = player.height * 0.8;
        const offsetX = (player.width - dashWidth) / 2;
        const offsetY = (player.height - dashHeight) / 2;
        ctx.fillRect(pos.x + offsetX, pos.y + offsetY, dashWidth, dashHeight);
      }
    });
  }
}

// Helper to adjust color brightness
function adjustBrightness(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent * 100);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

// Check if mouse is hovering over a button or if it's selected via keyboard
function isButtonHovered(button) {
  const mouseHover = mouseX >= button.x && mouseX <= button.x + button.width &&
         mouseY >= button.y && mouseY <= button.y + button.height;
  
  // Also highlight if this button is selected via keyboard navigation
  // Use buttonIndex property if available
  if (button.buttonIndex !== undefined) {
    return mouseHover || button.buttonIndex === selectedButtonIndex;
  }
  
  return mouseHover;
}

// Draw customization screen
function drawCustomization() {
  drawUiBackground();
  uiScreenHeader('CUSTOMIZE', DEVELOPER_MODE ? 'DEVELOPER MODE — everything unlocked' : 'Make the cube yours', '#ffcc44');

  window.customizeButtons = [];
  let customizeButtonIndex = 0;

  // ---- Live preview card on the right ----
  const cardX = 750, cardY = 196, cardW = 360, cardH = 400;
  uiCard(cardX, cardY, cardW, cardH, { scan: true });
  ctx.textAlign = 'left';
  ctx.font = 'bold 22px Impact, monospace';
  ctx.fillStyle = '#ffcc44';
  ctx.fillText('PREVIEW', cardX + 26, cardY + 44);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(cardX + 26, cardY + 58, cardW - 52, 1);

  // The cube runs on the spot, trailing whatever effect is selected
  const runX = cardX + cardW / 2;
  const runY = cardY + 190;
  const bob = Math.abs(Math.sin(uiTime * 3)) * 16;
  const size = 58;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(cardX + 50, runY + 4, cardW - 100, 3);
  drawTrailPreview(playerTrail, runX - size / 2, runY - size - bob, size);
  drawPlayer(runX - size / 2, runY - size - bob, size, size);

  ctx.textAlign = 'center';
  ctx.font = '13px Arial, sans-serif';
  ctx.fillStyle = '#6d6786';
  ctx.fillText('COLOR', cardX + cardW / 2, cardY + 268);
  ctx.font = '18px monospace';
  ctx.fillStyle = '#e8e4f5';
  ctx.fillText(getColorName(playerColor), cardX + cardW / 2, cardY + 294);
  ctx.font = '13px Arial, sans-serif';
  ctx.fillStyle = '#6d6786';
  ctx.fillText('TRAIL', cardX + cardW / 2, cardY + 336);
  ctx.font = '18px Arial, sans-serif';
  ctx.fillStyle = '#e8e4f5';
  ctx.fillText(getTrailName(playerTrail), cardX + cardW / 2, cardY + 362);

  // ---- Colors ----
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px Impact, monospace';
  ctx.fillStyle = '#c9c4da';
  ctx.fillText('COLOR', 90, 222);

  const sw = 62, swGap = 14, perRow = 8;
  playerColors.forEach((color, index) => {
    const col = index % perRow;
    const row = Math.floor(index / perRow);
    const x = 90 + col * (sw + swGap);
    const y = 240 + row * (sw + swGap);
    const isUnlocked = isColorUnlocked(color);
    const box = {
      x: x, y: y, width: sw, height: sw,
      buttonIndex: isUnlocked ? customizeButtonIndex : undefined,
      action: 'color', value: color.value, unlocked: isUnlocked
    };
    if (isUnlocked) customizeButtonIndex++;
    window.customizeButtons.push(box);

    const appear = uiStagger(index, 0.025);
    if (appear <= 0.001) return;
    const selected = playerColor === color.value && isUnlocked;
    const active = isUnlocked && isButtonHovered(box);

    ctx.save();
    ctx.globalAlpha = appear;
    if (selected) { ctx.shadowColor = color.value; ctx.shadowBlur = 16; }
    uiRoundRect(x, y, sw, sw, 9);
    ctx.fillStyle = isUnlocked ? color.value : '#26232f';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = selected ? '#ffffff' : (active ? '#c9c4da' : (isUnlocked ? 'rgba(0,0,0,0.35)' : '#332f42'));
    ctx.lineWidth = selected ? 3 : 2;
    ctx.stroke();
    if (!isUnlocked) {
      ctx.textAlign = 'center';
      ctx.font = '22px Arial, sans-serif';
      ctx.fillText('\u{1F512}', x + sw / 2, y + sw / 2 + 8);
    }
    ctx.restore();
  });

  const colorRows = Math.ceil(playerColors.length / perRow);
  const trailTop = 240 + colorRows * (sw + swGap) + 34;

  // ---- Trails ----
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px Impact, monospace';
  ctx.fillStyle = '#c9c4da';
  ctx.fillText('TRAIL', 90, trailTop);

  const tw = 112, th = 84, tGap = 12;
  playerTrails.forEach((trail, index) => {
    const x = 90 + index * (tw + tGap);
    const y = trailTop + 18;
    const isUnlocked = isTrailUnlocked(trail);
    const box = {
      x: x, y: y, width: tw, height: th,
      buttonIndex: isUnlocked ? customizeButtonIndex : undefined,
      action: 'trail', value: trail.value, unlocked: isUnlocked
    };
    if (isUnlocked) customizeButtonIndex++;
    window.customizeButtons.push(box);

    const appear = uiStagger(playerColors.length + index, 0.04);
    if (appear <= 0.001) return;
    const selected = playerTrail === trail.value && isUnlocked;
    const active = isUnlocked && isButtonHovered(box);

    ctx.save();
    ctx.globalAlpha = appear;
    if (selected) { ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 14; }
    uiCard(x, y, tw, th, {
      radius: 9,
      fill: !isUnlocked ? 'rgba(22, 20, 30, 0.85)'
           : (active || selected ? 'rgba(58, 50, 84, 0.95)' : 'rgba(33, 29, 46, 0.9)'),
      border: selected ? '#ffcc44' : (!isUnlocked ? '#332f42' : (active ? '#c9c4da' : '#463f5c')),
      lineWidth: selected ? 3 : 2
    });
    ctx.shadowBlur = 0;

    if (isUnlocked) {
      drawTrailPreview(trail.value, x + tw / 2 - 11, y + 22, 22);
      ctx.fillStyle = playerColor;
      uiRoundRect(x + tw / 2 - 11, y + 22, 22, 22, 4);
      ctx.fill();
    } else {
      ctx.textAlign = 'center';
      ctx.font = '22px Arial, sans-serif';
      ctx.fillText('\u{1F512}', x + tw / 2, y + 40);
    }
    ctx.textAlign = 'center';
    ctx.font = '13px Arial, sans-serif';
    ctx.fillStyle = isUnlocked ? (selected ? '#ffcc44' : '#8a84a0') : '#55506b';
    ctx.fillText(trail.name, x + tw / 2, y + th - 14);
    ctx.restore();
  });

  const backBtn = uiBackButton();
  backBtn.action = 'back';
  window.customizeButtons.push(backBtn);
  window.backButton = backBtn;

  uiFooter('← →  navigate      ENTER  equip      ESC  back to menu');
  ctx.textAlign = 'left';
}

// Get chapter-specific colors
function getChapterColors(chapterIndex) {
  const colors = [
    { primary: '#8c44ff', secondary: '#6622dd', accent: '#a055ff' }, // Chapter 1: Purple
    { primary: '#44aaff', secondary: '#2288dd', accent: '#55bbff' }, // Chapter 2: Blue
    { primary: '#ff8844', secondary: '#dd6622', accent: '#ff9955' }, // Chapter 3: Orange
    { primary: '#44ff88', secondary: '#22dd66', accent: '#55ff99' }  // Chapter 4: Green
  ];
  return colors[chapterIndex % colors.length];
}

// Get chapter completion percentage
function getChapterCompletion(chapterIndex) {
  if (chapterIndex >= chapters.length) return 0;
  
  const chapter = chapters[chapterIndex];
  const totalLevels = chapter.levels.length; // Only count regular levels, not bonus
  let completedCount = 0;
  
  // Count completed regular levels only
  for (let i = 0; i < chapter.levels.length; i++) {
    const globalIndex = getGlobalLevelIndex(chapterIndex, i);
    if (completedLevels.has(globalIndex)) completedCount++;
  }
  
  return totalLevels > 0 ? (completedCount / totalLevels) * 100 : 0;
}

// Draw chapter selection screen
function drawTrailPreview(trailValue, x, y, size) {
  if (!trailValue || trailValue === 'none') return;
  const rgb = hexToRgbParts(playerColor);
  const drift = (Math.sin(uiTime * 3) + 1) * 2;

  if (trailValue === 'fade') {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(' + rgb + ', ' + (0.42 - i * 0.1).toFixed(2) + ')';
      ctx.fillRect(x - (i + 1) * (size * 0.42) - drift, y, size, size);
    }
  } else if (trailValue === 'particles') {
    for (let i = 0; i < 10; i++) {
      const p = (i * 7919) % 100 / 100;
      ctx.fillStyle = 'rgba(' + rgb + ', ' + (0.5 - p * 0.35).toFixed(2) + ')';
      const px = x - 6 - p * size * 1.8 - drift;
      const py = y + (((i * 37) % 20) / 20) * size;
      ctx.fillRect(px, py, size * 0.22, size * 0.22);
    }
  } else if (trailValue === 'dotted') {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(' + rgb + ', ' + (0.5 - i * 0.11).toFixed(2) + ')';
      const d = size * 0.3;
      ctx.fillRect(x - (i + 1) * (size * 0.5) - drift, y + size / 2 - d / 2, d, d);
    }
  } else if (trailValue === 'dash') {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(' + rgb + ', ' + (0.5 - i * 0.11).toFixed(2) + ')';
      ctx.fillRect(x - (i + 1) * (size * 0.55) - drift, y + size * 0.35, size * 0.42, size * 0.3);
    }
  }
}

function hexToRgbParts(hex) {
  const h = hex.replace('#', '');
  return parseInt(h.substr(0, 2), 16) + ', ' + parseInt(h.substr(2, 2), 16) + ', ' + parseInt(h.substr(4, 2), 16);
}

function getColorName(value) {
  const found = playerColors.find(c => c.value === value);
  return found ? found.name : value.toUpperCase();
}

function getTrailName(value) {
  const found = playerTrails.find(t => t.value === value);
  return found ? found.name : 'None';
}

function drawChapterSelect() {
  drawUiBackground();
  uiScreenHeader('SELECT CHAPTER', 'Three chapters, each one lying to you differently', '#9844ff');

  window.chapterButtons = [];

  const cardW = 1020;
  const cardH = 128;
  const gap = 18;
  const top = 196;

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const btn = {
      x: 90,
      y: top + i * (cardH + gap),
      width: cardW,
      height: cardH,
      chapter: i,
      buttonIndex: i
    };
    window.chapterButtons.push(btn);

    const appear = uiStagger(i, 0.08);
    if (appear <= 0.001) continue;

    const colors = getChapterColors(i);
    const completion = getChapterCompletion(i);
    const done = completion === 100;
    const active = isButtonHovered(btn);
    const accent = done ? '#55dd88' : colors.primary;

    ctx.save();
    ctx.globalAlpha = appear;
    ctx.translate((1 - appear) * -30, 0);

    if (active) { ctx.shadowColor = accent; ctx.shadowBlur = 18; }
    uiCard(btn.x, btn.y, cardW, cardH, {
      fill: active ? 'rgba(52, 45, 76, 0.95)' : 'rgba(30, 27, 42, 0.9)',
      border: active ? accent : '#463f5c',
      lineWidth: active ? 3 : 2
    });
    ctx.shadowBlur = 0;

    // Accent tab down the left edge
    ctx.fillStyle = accent;
    uiRoundRect(btn.x + 8, btn.y + 14, 4, cardH - 28, 2);
    ctx.fill();

    // Big chapter numeral
    ctx.textAlign = 'left';
    ctx.font = 'bold 72px Impact, monospace';
    ctx.fillStyle = active ? accent : '#4a4363';
    ctx.fillText(i + 1, btn.x + 34, btn.y + 88);

    // Name and description
    ctx.font = '28px Arial, sans-serif';
    ctx.fillStyle = active ? '#ffffff' : '#c9c4da';
    ctx.fillText(chapter.name.replace('Chapter ' + (i + 1) + ': ', ''), btn.x + 120, btn.y + 52);

    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = '#8a84a0';
    ctx.fillText(chapter.description, btn.x + 120, btn.y + 80);

    // Level dots, one per level, filled as they are completed
    let completedCount = 0;
    for (let l = 0; l < chapter.levels.length; l++) {
      if (completedLevels.has(getGlobalLevelIndex(i, l))) completedCount++;
    }
    const dotY = btn.y + 102;
    for (let l = 0; l < chapter.levels.length; l++) {
      const filled = completedLevels.has(getGlobalLevelIndex(i, l));
      ctx.fillStyle = filled ? accent : '#3a3550';
      uiRoundRect(btn.x + 120 + l * 15, dotY, 9, 9, 2);
      ctx.fill();
    }

    // Progress on the right
    const barW = 170;
    const barX = btn.x + cardW - barW - 34;
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillStyle = '#8a84a0';
    ctx.fillText(completedCount + ' / ' + chapter.levels.length + ' LEVELS', btn.x + cardW - 34, btn.y + 48);

    const barY = btn.y + 62;
    ctx.fillStyle = '#292437';
    uiRoundRect(barX, barY, barW, 8, 4);
    ctx.fill();
    const fill = uiBarValue('chapter' + i, completion / 100);
    if (fill > 0.004) {
      ctx.fillStyle = accent;
      uiRoundRect(barX, barY, Math.max(8, barW * fill), 8, 4);
      ctx.fill();
    }

    ctx.textAlign = 'right';
    ctx.font = 'bold 22px Impact, monospace';
    ctx.fillStyle = done ? '#55dd88' : '#c9c4da';
    ctx.fillText(done ? '✓  COMPLETE' : Math.floor(completion) + '%', btn.x + cardW - 34, btn.y + 100);

    ctx.restore();
  }

  window.backButton = uiBackButton();
  uiFooter('↑ ↓  navigate      ENTER  select      ESC  back to menu');
  ctx.textAlign = 'left';
}

// Draw level selection screen
function drawLevelSelect() {
  const chapterInfo = getCurrentChapterInfo();
  if (!chapterInfo) {
    gameState = 'chapterSelect';
    return;
  }

  drawUiBackground();
  const colors = getChapterColors(currentChapter);
  uiScreenHeader(
    chapterInfo.name.replace('Chapter ' + (currentChapter + 1) + ': ', '').toUpperCase(),
    'Chapter ' + (currentChapter + 1) + '  ·  ' + chapterInfo.description,
    colors.primary
  );

  window.levelButtons = [];
  let buttonIndexCounter = 0;

  const tile = 104;
  const gap = 20;
  const perRow = 5;
  const rows = Math.ceil(chapterInfo.levels.length / perRow);
  const gridW = perRow * tile + (perRow - 1) * gap;
  const gridX = GAME_WIDTH / 2 - gridW / 2;
  const gridY = 210;

  for (let i = 0; i < chapterInfo.levels.length; i++) {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const bx = gridX + col * (tile + gap);
    const by = gridY + row * (tile + gap);

    const isUnlocked = isLevelUnlocked(currentChapter, i);
    const globalIndex = getGlobalLevelIndex(currentChapter, i);
    const isCompleted = completedLevels.has(globalIndex);

    const levelBtn = {
      x: bx, y: by, width: tile, height: tile,
      levelInChapter: i,
      isUnlocked: isUnlocked,
      buttonIndex: isUnlocked ? buttonIndexCounter : undefined
    };
    if (isUnlocked) buttonIndexCounter++;
    window.levelButtons.push(levelBtn);

    const appear = uiStagger(i, 0.03);
    if (appear <= 0.001) continue;

    const active = isUnlocked && isButtonHovered(levelBtn);
    const accent = isCompleted ? '#55dd88' : colors.primary;

    ctx.save();
    ctx.globalAlpha = appear;
    ctx.translate(0, (1 - appear) * 18);

    if (active) { ctx.shadowColor = accent; ctx.shadowBlur = 16; }
    uiCard(bx, by, tile, tile, {
      radius: 10,
      fill: !isUnlocked ? 'rgba(22, 20, 30, 0.85)'
           : (active ? 'rgba(58, 50, 84, 0.95)' : 'rgba(33, 29, 46, 0.9)'),
      border: !isUnlocked ? '#332f42' : (active ? accent : (isCompleted ? 'rgba(85, 221, 136, 0.45)' : '#463f5c')),
      lineWidth: active ? 3 : 2
    });
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    if (!isUnlocked) {
      ctx.font = '30px Arial, sans-serif';
      ctx.fillText('\u{1F512}', bx + tile / 2, by + tile / 2 + 12);
    } else {
      ctx.font = 'bold 40px Impact, monospace';
      ctx.fillStyle = isCompleted ? '#55dd88' : (active ? '#ffffff' : '#c9c4da');
      ctx.fillText(i + 1, bx + tile / 2, by + 52);

      if (isCompleted) {
        uiStarRow(bx + tile / 2 - 25, by + 80, levelStars[globalIndex] || 0, 17);
      } else {
        ctx.font = '12px monospace';
        ctx.fillStyle = '#6d6786';
        ctx.fillText('PRESS ' + (i < 9 ? i + 1 : 0), bx + tile / 2, by + 80);
      }
    }
    ctx.restore();
  }

  // Bonus level, off on its own below the grid
  if (chapterInfo.bonusLevel && isBonusLevelUnlocked(currentChapter)) {
    const bonusGlobalIndex = getBonusLevelGlobalIndex(currentChapter);
    const isBonusCompleted = completedLevels.has(bonusGlobalIndex);
    const bw = 228;
    const bonusBtn = {
      x: GAME_WIDTH / 2 - bw / 2,
      y: gridY + rows * (tile + gap) + 18,
      width: bw, height: 72,
      levelInChapter: -1,
      isUnlocked: true,
      isBonus: true,
      buttonIndex: buttonIndexCounter
    };
    window.levelButtons.push(bonusBtn);

    const appear = uiStagger(chapterInfo.levels.length, 0.03);
    if (appear > 0.001) {
      const active = isButtonHovered(bonusBtn);
      const accent = isBonusCompleted ? '#55dd88' : '#ffcc44';
      ctx.save();
      ctx.globalAlpha = appear;
      if (active) { ctx.shadowColor = accent; ctx.shadowBlur = 18; }
      uiCard(bonusBtn.x, bonusBtn.y, bw, 72, {
        radius: 10,
        fill: active ? 'rgba(70, 58, 30, 0.95)' : 'rgba(44, 37, 22, 0.9)',
        border: active ? accent : 'rgba(255, 204, 68, 0.45)',
        lineWidth: active ? 3 : 2
      });
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center';
      ctx.font = 'bold 26px Impact, monospace';
      ctx.fillStyle = accent;
      ctx.fillText('BONUS LEVEL', bonusBtn.x + bw / 2, bonusBtn.y + 32);
      if (isBonusCompleted) {
        uiStarRow(bonusBtn.x + bw / 2 - 25, bonusBtn.y + 56, levelStars[bonusGlobalIndex] || 0, 17);
      } else {
        ctx.font = '12px monospace';
        ctx.fillStyle = '#9a8a5a';
        ctx.fillText('PRESS B', bonusBtn.x + bw / 2, bonusBtn.y + 56);
      }
      ctx.restore();
    }
  }

  window.backButton = uiBackButton();
  uiFooter('← →  navigate      ENTER  play      ESC  back to chapters');
  ctx.textAlign = 'left';
}

// Draw settings screen
function drawSettings() {
  drawUiBackground();
  uiScreenHeader('SETTINGS', 'Audio and progress', '#55dd88');

  window.settingsButtons = [];

  const cardX = 90, cardY = 196, cardW = 620, cardH = 300;
  uiCard(cardX, cardY, cardW, cardH, { scan: true });

  ctx.textAlign = 'left';
  ctx.font = 'bold 22px Impact, monospace';
  ctx.fillStyle = '#55dd88';
  ctx.fillText('AUDIO', cardX + 30, cardY + 46);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(cardX + 30, cardY + 60, cardW - 60, 1);

  // leave room on the right for the percentage, which the knob must never reach
  const sliderW = 340;
  const sliderX = cardX + 150;
  const rows = [
    { label: 'MASTER', value: masterVolume, type: 'master', y: cardY + 112 },
    { label: 'MUSIC',  value: musicVolume,  type: 'music',  y: cardY + 182 },
    { label: 'SFX',    value: sfxVolume,    type: 'sfx',    y: cardY + 252 }
  ];

  window.volumeSliders = rows.map(row => ({
    x: sliderX, y: row.y - 9, width: sliderW, height: 18, type: row.type
  }));

  rows.forEach((row, i) => {
    const appear = uiStagger(i, 0.08);
    ctx.save();
    ctx.globalAlpha = appear;

    ctx.textAlign = 'left';
    ctx.font = '15px Arial, sans-serif';
    ctx.fillStyle = '#8a84a0';
    ctx.fillText(row.label, cardX + 30, row.y + 5);

    // Track
    ctx.fillStyle = '#292437';
    uiRoundRect(sliderX, row.y - 4, sliderW, 8, 4);
    ctx.fill();
    // Fill
    ctx.fillStyle = '#55dd88';
    uiRoundRect(sliderX, row.y - 4, Math.max(8, sliderW * row.value), 8, 4);
    ctx.fill();
    // Knob
    const knobX = sliderX + sliderW * row.value;
    const hovered = mouseX >= sliderX - 10 && mouseX <= sliderX + sliderW + 10 &&
                    mouseY >= row.y - 14 && mouseY <= row.y + 14;
    ctx.fillStyle = '#e8e4f5';
    ctx.beginPath();
    ctx.arc(knobX, row.y, hovered ? 10 : 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#55dd88';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'right';
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.fillStyle = '#e8e4f5';
    ctx.fillText(Math.round(row.value * 100) + '%', cardX + cardW - 30, row.y + 5);
    ctx.restore();
  });

  // ---- Display card ----
  const dY = cardY + cardH + 16, dH = 112;
  uiCard(cardX, dY, cardW, dH, {});
  ctx.textAlign = 'left';
  ctx.font = 'bold 22px Impact, monospace';
  ctx.fillStyle = '#44ddcc';
  ctx.fillText('DISPLAY', cardX + 30, dY + 38);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(cardX + 30, dY + 52, cardW - 60, 1);

  const fullscreenOn = isFullscreenActive();
  const fullscreenButton = {
    x: cardX + 30, y: dY + 64, width: 260, height: 44, action: 'fullscreen'
  };
  uiActionButton(fullscreenButton, fullscreenOn ? 'FULLSCREEN  ON' : 'FULLSCREEN  OFF', {
    font: '16px Arial, sans-serif', center: true, tab: false,
    accent: '#44ddcc', textColor: fullscreenOn ? '#9ff5ea' : '#c9c4da'
  });
  window.fullscreenButton = fullscreenButton;

  ctx.textAlign = 'left';
  ctx.font = '14px monospace';
  ctx.fillStyle = '#6d6688';
  ctx.fillText('F  toggles fullscreen any time', cardX + 310, dY + 84);
  ctx.fillText('ESC  leaves it', cardX + 310, dY + 102);

  // ---- Progress card ----
  const pX = 750, pW = 360;
  uiCard(pX, cardY, pW, cardH, {});
  ctx.textAlign = 'left';
  ctx.font = 'bold 22px Impact, monospace';
  ctx.fillStyle = '#ff8a8a';
  ctx.fillText('PROGRESS', pX + 26, cardY + 46);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(pX + 26, cardY + 60, pW - 52, 1);

  const progress = getEditorUnlockProgress();
  let cursor = cardY + 100;
  cursor = uiStat(pX + 26, cursor, pW - 52, 'LEVELS COMPLETED',
                  progress.completed + ' / ' + progress.totalLevels,
                  progress.completed / progress.totalLevels, '#44aaff', 'set-levels') + 38;
  cursor = uiStat(pX + 26, cursor, pW - 52, 'STARS EARNED',
                  progress.stars + ' / ' + progress.maxStars,
                  progress.stars / progress.maxStars, '#ffcc44', 'set-stars') + 44;

  const resetButton = {
    x: pX + 26, y: cursor, width: pW - 52, height: 46,
    action: 'reset', buttonIndex: 1
  };
  uiActionButton(resetButton, 'RESET PROGRESS', {
    font: '16px Arial, sans-serif', center: true, tab: false, danger: true,
    accent: '#ff6b6b', textColor: '#ff9a9a'
  });
  window.resetButton = resetButton;

  const backBtn = uiBackButton();
  backBtn.buttonIndex = 0;
  window.settingsButtons.push(backBtn, fullscreenButton, resetButton);
  window.backButton = backBtn;

  uiFooter('Drag the sliders to set volume      F  fullscreen      ESC  back');
  ctx.textAlign = 'left';
}

// Game loop
function gameLoop(currentTime = 0) {
  pollFullscreenState(); // In case the browser changed it without telling us

  if (isPaused) {
    requestAnimationFrame(gameLoop);
    return;
  }

  // Calculate delta time
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  // Update and render
  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

// Handle mouse clicks on buttons
function handleClick(event) {
  const point = canvasPointFromEvent(event);
  const x = point.x;
  const y = point.y;

  // Check menu buttons
  if (gameState === 'menu' && window.menuButtons) {
    window.menuButtons.forEach(button => {
      if (x >= button.x && x <= button.x + button.width &&
          y >= button.y && y <= button.y + button.height) {
        if (button.action === 'startGame') {
          transitionToState('chapterSelect');
        } else if (button.action === 'settings') {
          previousGameState = gameState;
          transitionToState('settings');
        } else if (button.action === 'customize') {
          previousGameState = gameState;
          transitionToState('customize');
        } else if (button.action === 'levelEditor') {
          tryOpenLevelEditor();
        }
      }
    });
  }

  // My Levels browser (level editor hub)
  if (gameState === 'customLevels') {
    handleCustomLevelClick(x, y);
    return;
  }

  // Check customization buttons
  if (gameState === 'customize' && window.customizeButtons) {
    window.customizeButtons.forEach(button => {
      if (x >= button.x && x <= button.x + button.width &&
          y >= button.y && y <= button.y + button.height) {
        // Only allow selection if unlocked
        if (button.unlocked === false) return;
        
        if (button.action === 'color') {
          playerColor = button.value;
          saveProgress();
        } else if (button.action === 'trail') {
          playerTrail = button.value;
          saveProgress();
        } else if (button.action === 'back') {
          transitionToState(previousGameState || 'menu');
        }
      }
    });
  }

  // Check settings buttons
  if (gameState === 'settings' && window.backButton) {
    const button = window.backButton;
    if (x >= button.x && x <= button.x + button.width &&
        y >= button.y && y <= button.y + button.height) {
      transitionToState(previousGameState || 'menu');
    }
    
    // Check the fullscreen toggle
    if (window.fullscreenButton) {
      const fsBtn = window.fullscreenButton;
      if (x >= fsBtn.x && x <= fsBtn.x + fsBtn.width &&
          y >= fsBtn.y && y <= fsBtn.y + fsBtn.height) {
        toggleFullscreen();
      }
    }

    // Check reset button
    if (window.resetButton) {
      const resetBtn = window.resetButton;
      if (x >= resetBtn.x && x <= resetBtn.x + resetBtn.width &&
          y >= resetBtn.y && y <= resetBtn.y + resetBtn.height) {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone!')) {
          resetProgress();
        }
      }
    }
  }

  // Check chapter selection buttons
  if (gameState === 'chapterSelect' && window.chapterButtons) {
    window.chapterButtons.forEach(button => {
      if (x >= button.x && x <= button.x + button.width &&
          y >= button.y && y <= button.y + button.height) {
        currentChapter = button.chapter;
        transitionToState('levelSelect');
      }
    });
    
    // Check back button
    if (window.backButton) {
      const backBtn = window.backButton;
      if (x >= backBtn.x && x <= backBtn.x + backBtn.width &&
          y >= backBtn.y && y <= backBtn.y + backBtn.height) {
        transitionToState('menu');
      }
    }
  }

  // Check level selection buttons
  if (gameState === 'levelSelect' && window.levelButtons) {
    window.levelButtons.forEach(button => {
      if (x >= button.x && x <= button.x + button.width &&
          y >= button.y && y <= button.y + button.height) {
        if (button.isUnlocked) {
          if (button.isBonus) {
            // Load bonus level
            const bonusGlobalIndex = getBonusLevelGlobalIndex(currentChapter);
            loadLevel(bonusGlobalIndex);
            transitionToState('playing');
          } else {
            // Load regular level
            loadLevelFromChapter(currentChapter, button.levelInChapter);
            transitionToState('playing');
          }
        }
      }
    });
    
    // Check back button
    if (window.backButton) {
      const backBtn = window.backButton;
      if (x >= backBtn.x && x <= backBtn.x + backBtn.width &&
          y >= backBtn.y && y <= backBtn.y + backBtn.height) {
        transitionToState('chapterSelect');
      }
    }
  }

  // Check pause menu buttons
  if (gameState === 'paused' && window.pauseButtons) {
    window.pauseButtons.forEach(button => {
      if (x >= button.x && x <= button.x + button.width &&
          y >= button.y && y <= button.y + button.height) {
        if (button.action === 'resume') {
          gameState = 'playing';
        } else if (button.action === 'restart') {
          if (customLevelSession) {
            restartCustomLevelSession();
          } else {
            loadLevel(currentLevel);
            gameState = 'playing';
          }
        } else if (button.action === 'fullscreen') {
          toggleFullscreen();
        } else if (button.action === 'settings') {
          previousGameState = 'playing'; // Return to playing after settings
          transitionToState('settings');
        } else if (button.action === 'quit') {
          if (customLevelSession) endCustomLevelSession();
          else transitionToState('menu');
        }
      }
    });
  }
}

// Keyboard event listeners
window.addEventListener('keydown', (e) => {
  // Enable audio on any key press
  tryEnableAudio();

  // The level editor screens handle their own keys (see src/editor/)
  if (gameState === 'editor' || gameState === 'customLevels') return;

  // F: fullscreen, from anywhere
  if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    toggleFullscreen();
    return;
  }

  // Track keypresses for cheat code (only letters)
  if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
    recentKeys += e.key.toLowerCase();
    // Keep only last 10 characters to prevent memory issues
    if (recentKeys.length > 10) {
      recentKeys = recentKeys.slice(-10);
    }
    
    // Check if cheat code was entered (toggle developer mode)
    if (recentKeys.includes(CHEAT_CODE)) {
      if (!DEVELOPER_MODE) {
        // Activate developer mode
        DEVELOPER_MODE = true;
        console.log('🎮 DEVELOPER MODE ACTIVATED! All customizations unlocked!');
      } else {
        // Deactivate developer mode and reset progress
        DEVELOPER_MODE = false;
        resetProgress();
        console.log('❌ DEVELOPER MODE DEACTIVATED! Progress reset.');
      }
      // Reset recent keys to prevent re-triggering
      recentKeys = '';
    }
  }

  // Handle unlock notification dismissal
  if (gameState === 'unlockNotification') {
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault();
      showUnlockNotification = false;
      unlockedItems = [];
      
      // Continue to appropriate state
      if (currentChapter < chapters.length - 1) {
        // More chapters available, go to chapter select
        gameState = 'chapterSelect';
        currentChapter = 0;
        currentLevel = 0;
        currentLevelInChapter = 0;
      } else {
        // All chapters complete, return to main menu
        gameState = 'menu';
        currentChapter = 0;
        currentLevel = 0;
        currentLevelInChapter = 0;
      }
    }
    return;
  }

  // Arrow key navigation for menus (not during gameplay)
  if (['menu', 'chapterSelect', 'levelSelect', 'customize', 'paused', 'settings'].includes(gameState)) {
    const buttons = getCurrentButtons();
    
    if (e.code === 'ArrowDown') {
      e.preventDefault();
      if (buttons.length > 0) {
        selectedButtonIndex = (selectedButtonIndex + 1) % buttons.length;
      }
      return;
    }
    
    if (e.code === 'ArrowUp') {
      e.preventDefault();
      if (buttons.length > 0) {
        selectedButtonIndex = (selectedButtonIndex - 1 + buttons.length) % buttons.length;
      }
      return;
    }
    
    // Enter key to activate selected button
    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault();
      if (buttons.length > 0 && buttons[selectedButtonIndex]) {
        const button = buttons[selectedButtonIndex];
        
        // Menu buttons
        if (gameState === 'menu') {
          if (button.action === 'startGame') {
            transitionToState('chapterSelect');
          } else if (button.action === 'settings') {
            previousGameState = gameState;
            transitionToState('settings');
          } else if (button.action === 'customize') {
            previousGameState = gameState;
            transitionToState('customize');
          } else if (button.action === 'levelEditor') {
            tryOpenLevelEditor();
          }
        }
        
        // Chapter select buttons
        if (gameState === 'chapterSelect') {
          currentChapter = button.chapter;
          transitionToState('levelSelect');
        }
        
        // Level select buttons
        if (gameState === 'levelSelect' && button.isUnlocked) {
          if (button.isBonus) {
            const bonusGlobalIndex = getBonusLevelGlobalIndex(currentChapter);
            loadLevel(bonusGlobalIndex);
          } else {
            loadLevelFromChapter(currentChapter, button.levelInChapter);
          }
        }
        
        // Customize buttons
        if (gameState === 'customize') {
          if (button.action === 'color' && button.unlocked !== false) {
            playerColor = button.value;
            saveProgress();
          } else if (button.action === 'trail' && button.unlocked !== false) {
            playerTrail = button.value;
            saveProgress();
          }
        }
        
        // Pause menu buttons
        if (gameState === 'paused') {
          if (button.action === 'resume') {
            gameState = 'playing';
          } else if (button.action === 'restart') {
            if (customLevelSession) {
              restartCustomLevelSession();
            } else {
              loadLevel(currentLevel);
              gameState = 'playing';
            }
          } else if (button.action === 'fullscreen') {
            toggleFullscreen();
          } else if (button.action === 'settings') {
            previousGameState = 'playing';
            transitionToState('settings');
          } else if (button.action === 'quit') {
            if (customLevelSession) endCustomLevelSession();
            else transitionToState('menu');
          }
        }
        
        // Settings buttons
        if (gameState === 'settings') {
          if (button === window.resetButton) {
            if (confirm('Are you sure you want to reset all progress? This cannot be undone!')) {
              resetProgress();
            }
          } else if (button.action === 'fullscreen') {
            toggleFullscreen();
          }
        }
      }
      return;
    }
  }

  // Movement keys (only during gameplay)
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    keys.left = true;
  }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    keys.right = true;
  }
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    keys.space = true;
    e.preventDefault(); // Prevent page scrolling
  }
  if (e.code === 'KeyR') {
    keys.r = true;
    // Quick restart of the current level
    if (gameState === 'playing') {
      if (customLevelSession) {
        restartCustomLevelSession();
      } else {
        loadLevel(currentLevel);
        gameState = 'playing';
      }
    }
  }

  // Debug mode toggle
  if (ENABLE_DEBUG_FEATURES && e.code === 'KeyT') {
    DEBUG_MODE = !DEBUG_MODE;
  }
  
  // Gravity zone debug controls (only in debug mode)
  if (ENABLE_DEBUG_FEATURES && DEBUG_MODE && ENABLE_GRAVITY_ZONES && player && gameState === 'playing') {
    // G key: manually toggle gravity
    if (e.code === 'KeyG') {
      player.gravityScale *= -1;
      player.gravityIndicatorAlpha = 1.0;
      spawnGravityFlipParticles(player.x, player.y);
    }
    
    // H key: lock/unlock gravity (prevent zones from changing it)
    if (e.code === 'KeyH') {
      player.gravityLocked = !player.gravityLocked;
    }
  }

  // Number keys for quick chapter selection (only in chapterSelect state)
  if (gameState === 'chapterSelect') {
    let chapterIndex = -1;
    
    if (e.code === 'Digit1' || e.code === 'Numpad1') chapterIndex = 0;
    else if (e.code === 'Digit2' || e.code === 'Numpad2') chapterIndex = 1;
    else if (e.code === 'Digit3' || e.code === 'Numpad3') chapterIndex = 2;
    else if (e.code === 'Digit4' || e.code === 'Numpad4') chapterIndex = 3;
    else if (e.code === 'Digit5' || e.code === 'Numpad5') chapterIndex = 4;
    else if (e.code === 'Digit6' || e.code === 'Numpad6') chapterIndex = 5;
    else if (e.code === 'Digit7' || e.code === 'Numpad7') chapterIndex = 6;
    else if (e.code === 'Digit8' || e.code === 'Numpad8') chapterIndex = 7;
    else if (e.code === 'Digit9' || e.code === 'Numpad9') chapterIndex = 8;
    
    // Select chapter if valid
    if (chapterIndex >= 0 && chapterIndex < chapters.length) {
      currentChapter = chapterIndex;
      transitionToState('levelSelect');
    }
  }

  // Number keys for quick level selection (only in levelSelect state)
  if (gameState === 'levelSelect') {
    let levelIndex = -1;
    
    // Check for number keys 1-9
    if (e.code === 'Digit1' || e.code === 'Numpad1') levelIndex = 0;
    else if (e.code === 'Digit2' || e.code === 'Numpad2') levelIndex = 1;
    else if (e.code === 'Digit3' || e.code === 'Numpad3') levelIndex = 2;
    else if (e.code === 'Digit4' || e.code === 'Numpad4') levelIndex = 3;
    else if (e.code === 'Digit5' || e.code === 'Numpad5') levelIndex = 4;
    else if (e.code === 'Digit6' || e.code === 'Numpad6') levelIndex = 5;
    else if (e.code === 'Digit7' || e.code === 'Numpad7') levelIndex = 6;
    else if (e.code === 'Digit8' || e.code === 'Numpad8') levelIndex = 7;
    else if (e.code === 'Digit9' || e.code === 'Numpad9') levelIndex = 8;
    else if (e.code === 'Digit0' || e.code === 'Numpad0') levelIndex = 9;
    else if (e.code === 'KeyB') {
      // Bonus level
      const chapterInfo = getCurrentChapterInfo();
      if (chapterInfo && chapterInfo.bonusLevel && isBonusLevelUnlocked(currentChapter)) {
        const bonusGlobalIndex = getBonusLevelGlobalIndex(currentChapter);
        loadLevel(bonusGlobalIndex);
        transitionToState('playing');
      }
      return; // Exit early for bonus level
    }
    
    // Load the selected level if it's unlocked
    if (levelIndex >= 0 && levelIndex < 10) {
      if (isLevelUnlocked(currentChapter, levelIndex)) {
        loadLevelFromChapter(currentChapter, levelIndex);
        transitionToState('playing');
      }
    }
  }

  // ESC key handling for different states
  if (e.code === 'Escape') {
    if (gameState === 'playing') {
      // Testing from the editor: go straight back to building
      if (customLevelSession && customLevelSession.returnState === 'editor') {
        endCustomLevelSession();
      } else {
        gameState = 'paused';
      }
    } else if (gameState === 'paused') {
      gameState = 'playing';
    } else if (gameState === 'settings') {
      transitionToState(previousGameState || 'menu');
    } else if (gameState === 'customize') {
      transitionToState(previousGameState || 'menu');
    } else if (gameState === 'chapterSelect') {
      transitionToState('menu');
    } else if (gameState === 'levelSelect') {
      transitionToState('chapterSelect');
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    keys.left = false;
  }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    keys.right = false;
  }
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    keys.space = false;
  }
  if (e.code === 'KeyR') {
    keys.r = false;
  }
});

// Mouse click handler for menu buttons
canvas.addEventListener('click', handleClick);

// Mouse move handler for hover effects
canvas.addEventListener('mousemove', (e) => {
  const point = canvasPointFromEvent(e);
  mouseX = point.x;
  mouseY = point.y;
});

// Volume slider drag handling
let isDraggingSlider = false;
let activeSlider = null;

canvas.addEventListener('mousedown', (e) => {
  if (gameState !== 'settings' || !window.volumeSliders) return;
  
  const point = canvasPointFromEvent(e);
  const x = point.x;
  const y = point.y;

  // Check if clicking on a slider
  window.volumeSliders.forEach(slider => {
    if (x >= slider.x && x <= slider.x + slider.width &&
        y >= slider.y && y <= slider.y + slider.height) {
      isDraggingSlider = true;
      activeSlider = slider;
      
      // Immediately set value based on click position
      const value = Math.max(0, Math.min(1, (x - slider.x) / slider.width));
      if (slider.type === 'master') {
        setMasterVolume(value);
      } else if (slider.type === 'music') {
        setMusicVolume(value);
      } else if (slider.type === 'sfx') {
        setSfxVolume(value);
      }
    }
  });
});

canvas.addEventListener('mousemove', (e) => {
  const point = canvasPointFromEvent(e);
  mouseX = point.x;
  mouseY = point.y;

  // Handle slider dragging
  if (isDraggingSlider && activeSlider) {
    const x = point.x;
    
    const value = Math.max(0, Math.min(1, (x - activeSlider.x) / activeSlider.width));
    if (activeSlider.type === 'master') {
      setMasterVolume(value);
    } else if (activeSlider.type === 'music') {
      setMusicVolume(value);
    } else if (activeSlider.type === 'sfx') {
      setSfxVolume(value);
    }
  }
});

canvas.addEventListener('mouseup', () => {
  isDraggingSlider = false;
  activeSlider = null;
});

// Start the game when page loads
init();