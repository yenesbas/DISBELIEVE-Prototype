// Disbelieve Prototype - game.js
// All game logic in one file

// Removed detailed level-building guide and debug tips to separate files:
// - See 'level_guide.md' for how to build levels
// - See 'debug_and_design_tips.md' for debug mode and design tips

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const TILE_SIZE = 60;
const GRAVITY = 2100 * 1.5; // Adjusted for time-based physics
const JUMP_FORCE = -840 * 1.25; // Adjusted for time-based physics
const MOVE_SPEED = 380; // Adjusted for time-based physics
const SPIKE_TRIGGER_DISTANCE = 420;
const SPIKE_MOVE_DISTANCE = TILE_SIZE * 2;

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

// All levels
// LEGEND:
// '.' = air/empty space
// '#' = ground/platform (solid - player collides)
// 'F' = fake block (looks solid but player passes through!)
// 'I' = invisible platform (solid but completely invisible!)
// 'S' = spawn point (player starting position)
// 'D' = door (level exit)
// '1' = spike that moves 1 tile when triggered
// '2' = spike that moves 2 tiles when triggered
// '3' = spike that moves 3 tiles when triggered
// '4' = spike that moves 4 tiles when triggered
// '^' = spike that moves 2 tiles (same as '2', for backward compatibility)
//
// HOW TO BUILD LEVELS:
// - Place spikes using numbers 1-4 based on how far you want them to move
// - Example: '1' moves 1 tile (40px), '4' moves 4 tiles (160px)
// - Spikes are triggered when player crosses an INVISIBLE VERTICAL LINE
// - Default: trigger line is 2 tiles (80px) to the LEFT of each spike
// - Customize trigger positions using spikeTriggers: [offset1, offset2, ...]
// - Yellow dashed lines show trigger positions (visible during gameplay)
// - Make sure spikes have room to move right (check empty space)

const chapters = [
  {
    name: "Chapter 1: First Deceptions",
    description: "Learn to question what you see",
    levels: [
      // Level 1 - Introduction (spike moves 2 tiles, default trigger)
      {
        name: "Level 1: First Steps",
        map: [
          "....................",
          "....................",
          "....................",
          "....................",
          "....................",
          "....................",
          ".S..................",
          "###...............D.",
          "...#...2.....#######",
          "....######.#........"
        ]
        // No spikeTriggers = uses default (2 tiles left of spike)
      },
      // Level 2 - Custom triggers (first spike triggers early, second triggers late)
      {
        name: "Level 2: Fake Floors",
        map: [
          "....................",
          "....................",
          "....................",
          "....................",
          "....................",
          ".S..................",
          "####................",
          "........2...1.....D.",
          ".....###############"
        ],
        spikeTriggers: [-3, 0]  // First spike: 1 tile left, Second spike: 1 tile left
      },
      // Level 3 - Mixed triggers (variety for maximum deception)
      {
        name: "Level 3: Total Deception",
        map: [
          "....................",
          "....................",
          "....................",
          "....................",
          "....................",
          ".S.........#........",
          "###...........#.###F",
          ".....1...#2...3...D.",
          "...####..#####.#####"
        ],
        spikeTriggers: [-1, -2, -2],           // Horizontal offsets
        spikeTriggerLengths: [180, 160, null]   // Spike 1: 1 tile, Spike 2: 3 tiles, Spike 3: 2 tiles left
      },
      // Level 4 - ??? (variety for maximum deception)
      {
        name: "Level 4: ???",
        map: [
          "....................",
          "....................",
          "....................",
          "....#...............",
          "....#..##...........",
          "....#...#...........",
          "....##..##..........",
          "........#....3....D.",
          "###########FF.######"
        ],
        spikeTriggers: [-3]  // Spike 1: 1 tile, Spike 2: 3 tiles, Spike 3: 2 tiles left
      },
      {
        name: "Level 5: Beginner's Trap",
        map: [
          "....................",
          "....................",
          "....................",
          ".S...1..............",
          "#####.####..FF######",
          "....................",
          "....................",
          ".......3...2......D.",
          "####################"
        ],
        spikeTriggers: [-0.5, -3, -1]  // Spike 1: 1 tile, Spike 2: 3 tiles, Spike 3: 2 tiles left
      },
      {
        name: "Level 6: Too Easy?",
        map: [
          "....................",
          "....................",
          "....................",
          "....................",
          "....................",
          "....................",
          "....................",
          ".S................D.",
          "F##FF#FFF####FFF####",
          "00111111111111111111"
        ],
        spikeTriggers: [],  // Spike 1: 1 tile, Spike 2: 3 tiles, Spike 3: 2 tiles left
        spikeTriggerLengths: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]  // All spikes have very short triggers (1px height) to force immediate activation
      },
      {
        name: "Level 7: Up or Down?",
        map: [
          "....................",
          "....................",
          "....................",
          "...........#........",
          "........#....2......",
          "....#.............D.",
          ".S..............###.",
          ".#..................",
          "..............F.....",
          ".......F............",
          "...#......#.........",
        ],
        spikeTriggers: [-2]  // Spike 1: 1 tile, Spike 2: 3 tiles, Spike 3: 2 tiles left
      },
      {
        name: "Level 8: Gotcha!",
        map: [
          "....................",
          "....................",
          ".S...#.....FF....D..",
          ".#.....F...2.....F..",
          ".3.....3........F...",
          "...............#....",
          "...#.........F#.....",
          "..........F#........",
          "....................",
          "....F#..#F..........",
          ".F...4..............",
          "...................."
        ],
        spikeTriggers: [-4, -2, -2, -2]  // Spike 1: 1 tile, Spike 2: 3 tiles, Spike 3: 2 tiles left
      },
      {
        name: "Level 9: ???",
        map: [
          "....................",
          "....................",
          ".S..................",
          "#######F###########.",
          "..#..2#....#......F.",
          "..#.#.#..F.#.#....F.",
          "...4#....#...#.2#...",
          ".##############F####",
          ".........#...#....#.",
          ".........#.#.#....#.",
          ".....2D....#...4#....",
          "###################F"
        ],
        spikeTriggers: [-2, -2.5, -3, -4, -3],           // Horizontal offsets
        spikeTriggerLengths: [250, 81, 82, 83, 0]  // Spike 1: 1 tile, Spike 2: 3 tiles, Spike 3: 2 tiles left
      },
      {
        name: "Level 10: Chapter Finale",
        map: [
          "....................",
          "....................",
          "FFF..24.......12....",
          "#S#################.",
          "###...............#.",
          "..................#.",
          "....11#..#...#..#.F.",
          "....FFF11#211#11#..4",
          ".##################1",
          "....................",
          "..................D.",
          "#####FF#############"
        ],
        spikeTriggers: [-0.5, -4, -0.5, -1, -50, -50, -1, -50, -1, -50, -50, -50, -50, -1],           // Horizontal offsets
        spikeTriggerLengths: [250, 200, 1, 200, 1.05, 1.1, 150, 2, 150, 4, 5, 6, 7, 400, 9]  // Spike 1: 1 tile, Spike 2: 3 tiles, Spike 3: 2 tiles left
      }
    ],
    bonusLevel: {
      name: "Bonus: Chapter 1 Ultimate Challenge",
      description: "Master of deception - fake blocks everywhere!",
      name: "Bonus Level: For experts only",
      map: [
        "....................",
        ".....2..3...3.......",
        "#S######F##########.",
        ".#......F...#.....#.",
        "..F##F..F...#.....#.",
        "..#..#..#.....#.....",
        "1.#11#12#.3...#2.2#.",
        "F############.#####.",
        "............#.......",
        "............F.....D.",
        "#.F..#..F..#########",
        "..#..#..#..........."
      ],
      spikeTriggers: [-0.5, -4, 0, -1.5, -5.1, -3.2, -1, -3, -1, -3, -2.5],           // Horizontal offsets
      spikeTriggerLengths: [250, 251, 252, 120, 1.05, 1.1, 151, 160, 150, 80, 180]
    }
  },
  // Future chapters can be added here:
  {
    name: "Chapter 2: Advanced Illusions",
    description: "Master the art of disbelief",
    levels: [
      {
        name: "Level 1: First Steps Into Nothing",
        map: [
          "....................",
          "....................",
          "....................",
          "....................",
          "....................",
          "....................",
          "....................",
          "....................",
          ".S...............D..",
          "####II##IIFFF#######",
          "....................",
          "...................."
        ]
        // Simple introduction - clear staircase pattern with invisible platforms
      },
      {
        name: "Level 2: The Invisible Maze",
        map: [
          "....................",
          "....................",
          "....................",
          "....................",
          "....................",
          "....................",
          "....................",
          "....................",
          ".S...............D..",
          "####..##..###..#####",
          "....00..00..........",
          "....##..##.........."
        ]
      }
    ],
    bonusLevel: {
      name: "Bonus: Chapter 2 Ultimate Challenge",
      description: "Master of invisible platforms - trust nothing you can't see!",
      map: [
        "....................",
        "....................",
        "IIIIIII.......IIIIID",
        "#######.......######",
        ".......IIIIIII......",
        ".......#######......",
        "###....2....3....###",
        "...IIII.IIII.IIII...",
        "...####.####.####...",
        "....................",
        "....................",
        "####################"
      ],
      spikeTriggers: [-2, -3],
      spikeTriggerLengths: [200, 250]
    }
  }
];

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

// Game state
let gameState = 'menu'; // 'menu', 'settings', 'chapterSelect', 'levelSelect', 'playing', 'levelComplete', 'paused'
let previousGameState = null; // Store previous state to return to after settings
let currentChapter = 0;
let currentLevel = 0;
let currentLevelInChapter = 0; // 0-based index within the current chapter
let player = null;
let platforms = [];
let fakeBlocks = []; // Blocks that look solid but player passes through
let invisiblePlatforms = []; // Platforms that are solid but completely invisible
let spikes = [];
let door = null;
let spawnPoint = null; // Custom spawn point set by 'S' in level map
let deaths = 0;
let levelDeaths = 0;
let isDead = false;
let deathFlashTimer = 0;
let levelCompleteTimer = 0;
const DEATH_FLASH_DURATION = 0.2;
const LEVEL_COMPLETE_DURATION = 1.5;

// Transition animations
let transitionState = 'none'; // 'none', 'fadeOut', 'fadeIn'
let transitionAlpha = 0;
let transitionSpeed = 3; // Speed of fade transitions
let pendingGameState = null; // State to transition to after fade out

// Level progression system
let completedLevels = new Set(); // Stores global level indices that have been completed
let levelStars = {}; // Stores star ratings (1-3) for each level: { globalLevelIndex: stars }

// Player customization
let playerColor = '#4488ff'; // Default blue
let playerTrail = 'none'; // 'none', 'fade', 'particles', 'glow'
let trailHistory = []; // Store recent positions for trail effect

const playerColors = [
  { name: 'Blue', value: '#4488ff' },
  { name: 'Red', value: '#ff4444' },
  { name: 'Green', value: '#44ff44' },
  { name: 'Purple', value: '#aa44ff' },
  { name: 'Orange', value: '#ff8844' },
  { name: 'Cyan', value: '#44ffff' },
  { name: 'Pink', value: '#ff44aa' },
  { name: 'Yellow', value: '#ffff44' }
];

const playerTrails = [
  { name: 'None', value: 'none', description: 'No trail' },
  { name: 'Fade', value: 'fade', description: 'Fading trail' },
  { name: 'Particles', value: 'particles', description: 'Particle effect' },
  { name: 'Glow', value: 'glow', description: 'Glowing aura' }
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
      playerColor = parsed.playerColor || '#4488ff';
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

function isLevelUnlocked(chapterIndex, levelInChapter) {
  // First level of first chapter is always unlocked
  if (chapterIndex === 0 && levelInChapter === 0) return true;
  
  // Check if previous level is completed
  const globalIndex = getGlobalLevelIndex(chapterIndex, levelInChapter);
  const previousGlobalIndex = globalIndex - 1;
  
  return completedLevels.has(previousGlobalIndex);
}

function isBonusLevelUnlocked(chapterIndex) {
  // Bonus level unlocks when level 10 of the chapter is completed
  const level10GlobalIndex = getGlobalLevelIndex(chapterIndex, 9); // Level 10 = index 9
  return completedLevels.has(level10GlobalIndex);
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
}

// MASTER DEBUG SWITCH - Set to false to disable ALL debug features
const ENABLE_DEBUG_FEATURES = true;

// DEBUG MODE - Only works if ENABLE_DEBUG_FEATURES is true
let DEBUG_MODE = false;

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
  currentChapter = chapterIndex;
  currentLevelInChapter = levelInChapter;
  currentLevel = getGlobalLevelIndex(chapterIndex, levelInChapter);
  levelDeaths = 0;
  parseLevel();
  resetPlayer();
  gameState = 'playing';
}

// Load a specific level by global index (for backwards compatibility)
function loadLevel(globalLevelIndex) {
  currentLevel = globalLevelIndex;
  currentChapter = getChapterFromGlobalLevel(globalLevelIndex);
  currentLevelInChapter = getLevelInChapterFromGlobalLevel(globalLevelIndex);
  levelDeaths = 0;
  parseLevel();
  resetPlayer();
  gameState = 'playing';
}

// Parse level from string array
function parseLevel() {
  platforms = [];
  fakeBlocks = [];
  invisiblePlatforms = [];
  spikes = [];
  door = null;
  spawnPoint = null; // Reset custom spawn point for each level

  const levelMap = levels[currentLevel].map;
  const customTriggers = levels[currentLevel].spikeTriggers || []; // Get custom triggers if defined
  const customTriggerLengths = levels[currentLevel].spikeTriggerLengths || []; // Get custom trigger lengths
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
      } else if (/^[0-9]$/.test(char) || char === '^') {
        // Handle spikes with movement distances 0-9 or backward compatibility '^'
        let moveDistance;
        if (char === '^') {
          moveDistance = TILE_SIZE * 2; // backward compatibility
        } else {
          moveDistance = TILE_SIZE * parseInt(char, 10);
        }

        // Determine trigger position (vertical line to the left of spike)
        const triggerOffset = customTriggers[spikeIndex] !== undefined
          ? customTriggers[spikeIndex]
          : defaultTriggerOffset;

        const triggerX = x - (triggerOffset * TILE_SIZE); // Position of vertical trigger line

        // Determine trigger length (vertical span)
        const triggerLength = customTriggerLengths[spikeIndex] !== undefined && customTriggerLengths[spikeIndex] !== null
          ? customTriggerLengths[spikeIndex]
          : null; // null means full-height

        // Calculate trigger vertical bounds
        let triggerY, triggerHeight;
        if (triggerLength === null || triggerLength === 0) {
          // Full-height trigger (default behavior)
          triggerY = 0;
          triggerHeight = canvas.height;
        } else {
          // Limited-height trigger from spike top
          const spikeTopY = y + 20; // Spike's actual visual y position (top)

          if (triggerLength > 0) {
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
          y: y + 20,
          originalX: x,
          width: TILE_SIZE,
          height: TILE_SIZE - 20, // Slightly shorter spike
          moveDistance: moveDistance, // Custom movement distance per spike
          triggerX: triggerX, // X position where trigger line is located
          triggerY: triggerY, // Y position where trigger line starts
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
    hasJumped: false
  };

  // Reset all spikes
  spikes.forEach(spike => {
    spike.x = spike.originalX;
    spike.triggered = false;
    spike.moved = false;
    spike.moving = false;
    spike.moveTimer = 0;
  });

  isDead = false;
  deathFlashTimer = 0;
  trailHistory = []; // Clear trail when resetting
}

// Update game state
function update(deltaTime) {
  // Handle transitions
  if (transitionState === 'fadeOut') {
    transitionAlpha += transitionSpeed * deltaTime;
    if (transitionAlpha >= 1) {
      transitionAlpha = 1;
      transitionState = 'fadeIn';
      gameState = pendingGameState;
      pendingGameState = null;
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

  // Paused state
  if (gameState === 'paused') {
    return;
  }

  // Level complete state
  if (gameState === 'levelComplete') {
    levelCompleteTimer -= deltaTime;
    if (levelCompleteTimer <= 0) {
      // Check if there are more levels in current chapter
      if (currentLevelInChapter < chapters[currentChapter].levels.length - 1) {
        // Move to next level in current chapter
        loadLevelFromChapter(currentChapter, currentLevelInChapter + 1);
        updateStats();
      } else {
        // Chapter complete
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

  // Horizontal movement
  if (keys.left) {
    player.vx = -MOVE_SPEED;
  } else if (keys.right) {
    player.vx = MOVE_SPEED;
  } else {
    player.vx = 0;
  }

  // Jumping
  if (keys.space && player.onGround && !player.hasJumped) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
    player.hasJumped = true;
    playSound('jump'); // Play jump sound
  }

  // Release jump key
  if (!keys.space) {
    player.hasJumped = false;
  }

  // Restart key
  if (keys.r) {
    loadLevel(currentLevel);
  }

  // Apply gravity (scaled by deltaTime)
  player.vy += GRAVITY * deltaTime;

  // Update horizontal position first (scaled by deltaTime)
  player.x += player.vx * deltaTime;

  // Keep player in bounds horizontally
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) {
    player.x = canvas.width - player.width;
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

  // Update vertical position (scaled by deltaTime)
  player.y += player.vy * deltaTime;

  // Vertical collision check
  player.onGround = false;

  platforms.forEach(platform => {
    if (checkCollision(player, platform)) {
      // Check if player is falling onto platform (landing on top)
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
    }
  });

  // Invisible platform vertical collision check
  invisiblePlatforms.forEach(platform => {
    if (checkCollision(player, platform)) {
      // Check if player is falling onto platform (landing on top)
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
    }
  });

  // Check spike triggers (position-based)
  checkSpikeTriggers();

  // Update moving spikes
  spikes.forEach(spike => {
    if (spike.moving) {
      spike.moveTimer += deltaTime * 5;
      if (spike.moveTimer >= 1) {
        spike.moveTimer = 1;
        spike.moving = false;
        spike.moved = true;
      }

      // Interpolate position using spike's custom moveDistance
      const targetX = spike.originalX + spike.moveDistance;
      spike.x = spike.originalX + (targetX - spike.originalX) * spike.moveTimer;
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
  if (player.y > canvas.height + 100) {
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
    if (!spike.triggered && !spike.moved) {
      const playerRightEdge = player.x + player.width;
      const playerLeftEdge = player.x;
      const playerTop = player.y;
      const playerBottom = player.y + player.height;

      // Check if player is within the vertical bounds of the trigger
      const withinVerticalBounds = (playerBottom >= spike.triggerY) && (playerTop <= spike.triggerY + spike.triggerHeight);

      // Check if player is currently crossing through the trigger line (left edge before line, right edge after line)
      const currentlyCrossingLine = (playerLeftEdge < spike.triggerX) && (playerRightEdge >= spike.triggerX);

      // Trigger when player actively crosses through the line AND is within vertical bounds
      if (currentlyCrossingLine && withinVerticalBounds) {
        spike.triggered = true;
        spike.moving = true;
        spike.moveTimer = 0;
        playSound('spike'); // Play spike movement sound
      }
    }
  });
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
    document.getElementById('levelName').textContent = levels[currentLevel].name;
  }
}

// Update trigger info display below canvas
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
    infoText += `[${index + 1}: -${spike.triggerOffset} tiles ${status}] `;
  });

  triggerInfoElement.textContent = infoText;
}

// Render game
function render() {
  // Clear screen
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  // Don't return early for paused - we need to draw the game first
  // Then we'll draw the pause menu overlay on top

  // Draw platforms (solid blocks)
  ctx.fillStyle = '#666';
  platforms.forEach(platform => {
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

    // Add some texture
    ctx.strokeStyle = '#555';
    ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
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

  // Draw fake blocks (visually identical to solid platforms so player cannot tell)
  fakeBlocks.forEach(fakeBlock => {
    // Use the exact same fill and outline as solid platforms
    ctx.fillStyle = '#666';
    ctx.fillRect(fakeBlock.x, fakeBlock.y, fakeBlock.width, fakeBlock.height);

    ctx.strokeStyle = '#555';
    ctx.strokeRect(fakeBlock.x, fakeBlock.y, fakeBlock.width, fakeBlock.height);
  });

  // Draw door (green rectangle with yellow outline)
  if (door) {
    ctx.fillStyle = '#44ff44';
    ctx.fillRect(door.x, door.y, door.width, door.height);

    // Door outline
    ctx.strokeStyle = '#ffff44';
    ctx.lineWidth = 3;
    ctx.strokeRect(door.x, door.y, door.width, door.height);

    // Draw door panels
    ctx.strokeStyle = '#33cc33';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(door.x + door.width / 2, door.y);
    ctx.lineTo(door.x + door.width / 2, door.y + door.height);
    ctx.stroke();

    // Door knob
    ctx.fillStyle = '#ffff44';
    ctx.fillRect(door.x + door.width * 0.7, door.y + door.height * 0.5, 6, 6);
  }

  // Draw spikes (red triangles)
  spikes.forEach(spike => {
    // Draw invisible trigger line (only if DEBUG_MODE is enabled)
    if (DEBUG_MODE && !spike.moved && !spike.triggered) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)'; // Yellow, transparent
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]); // Dashed line
      ctx.beginPath();
      ctx.moveTo(spike.triggerX, spike.triggerY);
      ctx.lineTo(spike.triggerX, spike.triggerY + spike.triggerHeight);
      ctx.stroke();
      ctx.setLineDash([]); // Reset to solid line

      // Draw small label showing trigger offset and length
      ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
      ctx.font = '12px monospace';
      let lengthLabel;
      if (spike.triggerLength === null || spike.triggerLength === 0) {
        lengthLabel = 'full';
      } else if (spike.triggerLength > 0) {
        lengthLabel = `↑${spike.triggerLength}px`;
      } else {
        lengthLabel = `↓${Math.abs(spike.triggerLength)}px`;
      }
      ctx.fillText(`-${spike.triggerOffset} [${lengthLabel}]`, spike.triggerX - 15, spike.y - 5);
    }

    ctx.fillStyle = spike.moving ? '#ff0000' : '#dd0000';

    // Draw triangle pointing up
    let spikeSplits = 10;
    ctx.beginPath();
    ctx.moveTo(spike.x + (spike.width / spikeSplits) * 2 , spike.y); // top
    for (let i = 1; i < spikeSplits - 1; i = i + 2) {
        ctx.lineTo(spike.x + (i * spike.width) / spikeSplits, spike.y + (spike.height/5) * 3); // middle points
        ctx.lineTo(spike.x + ((i+1) * spike.width) / spikeSplits, spike.y); // top points
    }
    ctx.lineTo(spike.x + spike.width, spike.y + spike.height); // bottom right
    ctx.lineTo(spike.x, spike.y + spike.height); // bottom left
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#aa0000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Show warning when spike is triggered (using spike's custom moveDistance)
    if (spike.moving) {
      //ctx.fillStyle = 'rgba(255, 0, 0, 0)';
      //ctx.fillRect(spike.originalX, spike.y - 10, spike.moveDistance + spike.width, spike.height + 10);
    }
  });

  // Draw player trail effect (before player so it appears behind)
  if (!isDead && (gameState === 'playing' || gameState === 'paused')) {
    drawPlayerTrail();
  }

  // Draw player
  if (!isDead && (gameState === 'playing' || gameState === 'paused')) {
    drawPlayer(player.x, player.y, player.width, player.height);
  }

  // Death flash
  if (isDead && deathFlashTimer > 0 && gameState === 'playing') {
    ctx.fillStyle = `rgba(255, 0, 0, ${deathFlashTimer / DEATH_FLASH_DURATION * 0.5})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw "X_X" face (scaled)
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('X_X', player.x - 8, player.y + 30);
  }

  // Level complete overlay
  if (gameState === 'levelComplete') {
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#44ff44';
    ctx.font = 'bold 48px Impact, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Level Complete!', canvas.width / 2, canvas.height / 2 - 60);
    
    // Show star rating
    const stars = calculateStars(levelDeaths);
    const starDisplay = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    ctx.fillStyle = '#ffdd44';
    ctx.font = 'bold 64px monospace';
    ctx.fillText(starDisplay, canvas.width / 2, canvas.height / 2 + 10);
    
    // Show death count
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px monospace';
    ctx.fillText(`Deaths this level: ${levelDeaths}`, canvas.width / 2, canvas.height / 2 + 60);

    ctx.font = '24px monospace';
    ctx.fillStyle = '#ffffff';
    if (currentLevel < levels.length - 1) {
      ctx.fillText('Next level loading...', canvas.width / 2, canvas.height / 2 + 100);
    } else {
      ctx.fillText('You beat all levels!', canvas.width / 2, canvas.height / 2 + 100);
      ctx.fillText(`Total Deaths: ${deaths}`, canvas.width / 2, canvas.height / 2 + 135);
    }
    ctx.textAlign = 'left';
  }

  // Update trigger info display below canvas
  updateTriggerInfo();
  
  // Draw pause menu overlay if paused (must be after game is drawn)
  if (gameState === 'paused') {
    console.log('Drawing pause menu!'); // DEBUG
    drawPauseMenu();
  }
  
  // Render transition overlay last (on top of everything)
  renderTransition();
}

// Render transition fade effect
function renderTransition() {
  if (transitionState !== 'none' && transitionAlpha > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${transitionAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// Draw pause menu
function drawPauseMenu() {
  // Semi-transparent dark overlay over the game
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Pause menu title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px Impact, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', canvas.width / 2, 180);

  // Pause menu buttons
  window.pauseButtons = [];
  
  const buttonWidth = 300;
  const buttonHeight = 60;
  const buttonX = canvas.width / 2 - buttonWidth / 2;
  let buttonY = 280;
  const buttonSpacing = 80;

  // Resume button
  const resumeButton = {
    x: buttonX,
    y: buttonY,
    width: buttonWidth,
    height: buttonHeight,
    action: 'resume'
  };
  
  ctx.fillStyle = isButtonHovered(resumeButton) ? '#555555' : '#444444';
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.strokeStyle = isButtonHovered(resumeButton) ? '#aaaaaa' : '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Impact, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('RESUME', canvas.width / 2, buttonY + 40);
  
  window.pauseButtons.push(resumeButton);

  // Restart button
  buttonY += buttonSpacing;
  const restartButton = {
    x: buttonX,
    y: buttonY,
    width: buttonWidth,
    height: buttonHeight,
    action: 'restart'
  };
  
  ctx.fillStyle = isButtonHovered(restartButton) ? '#555555' : '#444444';
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.strokeStyle = isButtonHovered(restartButton) ? '#aaaaaa' : '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Impact, monospace';
  ctx.fillText('RESTART', canvas.width / 2, buttonY + 40);
  
  window.pauseButtons.push(restartButton);

  // Settings button
  buttonY += buttonSpacing;
  const settingsButton = {
    x: buttonX,
    y: buttonY,
    width: buttonWidth,
    height: buttonHeight,
    action: 'settings'
  };
  
  ctx.fillStyle = isButtonHovered(settingsButton) ? '#555555' : '#444444';
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.strokeStyle = isButtonHovered(settingsButton) ? '#aaaaaa' : '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Impact, monospace';
  ctx.fillText('SETTINGS', canvas.width / 2, buttonY + 40);
  
  window.pauseButtons.push(settingsButton);

  // Quit to Menu button
  buttonY += buttonSpacing;
  const quitButton = {
    x: buttonX,
    y: buttonY,
    width: buttonWidth,
    height: buttonHeight,
    action: 'quit'
  };
  
  ctx.fillStyle = isButtonHovered(quitButton) ? '#555555' : '#444444';
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.strokeStyle = isButtonHovered(quitButton) ? '#aaaaaa' : '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Impact, monospace';
  ctx.fillText('QUIT TO MENU', canvas.width / 2, buttonY + 40);
  
  window.pauseButtons.push(quitButton);

  // Instructions
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '24px monospace';
  ctx.fillText('ESC to Resume', canvas.width / 2, canvas.height - 40);

  ctx.textAlign = 'left';
}

// Draw main menu
function drawMenu() {
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#9844ffff';
  ctx.font = 'bold 96px Impact, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('DISBELIEVE', canvas.width / 2, 150);

  // Subtitle
  ctx.fillStyle = '#ffffff';
  ctx.font = '30px monospace';
  ctx.fillText('Can you survive the deception?', canvas.width / 2, 210);

  // Menu buttons
  window.menuButtons = [];
  
  // Start Game button
  let startX = canvas.width / 2 - 150;
  let startY = 300;
  const startButton = { x: startX, y: startY, width: 300, height: 60, action: 'startGame' };
  ctx.fillStyle = isButtonHovered(startButton) ? '#555555' : '#444444';
  ctx.fillRect(startX, startY, 300, 60);
  ctx.strokeStyle = isButtonHovered(startButton) ? '#aaaaaa' : '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(startX, startY, 300, 60);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '32px Arial, sans-serif';
  ctx.fillText('START GAME', canvas.width / 2, startY + 40);
  
  window.menuButtons.push(startButton);

  // Settings button
  let settingsY = 380;
  const settingsButton = { x: startX, y: settingsY, width: 300, height: 60, action: 'settings' };
  ctx.fillStyle = isButtonHovered(settingsButton) ? '#555555' : '#444444';
  ctx.fillRect(startX, settingsY, 300, 60);
  ctx.strokeStyle = isButtonHovered(settingsButton) ? '#aaaaaa' : '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(startX, settingsY, 300, 60);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '32px Arial, sans-serif';
  ctx.fillText('SETTINGS', canvas.width / 2, settingsY + 40);
  
  window.menuButtons.push(settingsButton);

  // Customize button
  let customizeY = 460;
  const customizeButton = { x: startX, y: customizeY, width: 300, height: 60, action: 'customize' };
  ctx.fillStyle = isButtonHovered(customizeButton) ? '#555555' : '#444444';
  ctx.fillRect(startX, customizeY, 300, 60);
  ctx.strokeStyle = isButtonHovered(customizeButton) ? '#aaaaaa' : '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(startX, customizeY, 300, 60);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '32px Arial, sans-serif';
  ctx.fillText('CUSTOMIZE', canvas.width / 2, customizeY + 40);
  
  window.menuButtons.push(customizeButton);

  // Instructions
  ctx.fillStyle = '#666666';
  ctx.font = '26px monospace';
  ctx.fillText('Hint: DISBELIEVE WHAT YOU SEE', canvas.width / 2, canvas.height - 50);

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
  } else if (playerTrail === 'glow') {
    // Glowing aura - circular glow around player
    const trailColor = playerColor.replace('#', '');
    const r = parseInt(trailColor.substr(0, 2), 16);
    const g = parseInt(trailColor.substr(2, 2), 16);
    const b = parseInt(trailColor.substr(4, 2), 16);
    
    // Draw multiple circles with decreasing opacity for glow effect
    for (let i = 3; i > 0; i--) {
      const radius = player.width/2 + i * 8;
      const alpha = 0.15 - (i * 0.03);
      
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(player.x + player.width/2, player.y + player.height/2, radius, 0, Math.PI * 2);
      ctx.fill();
    }
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

// Check if mouse is hovering over a button
function isButtonHovered(button) {
  return mouseX >= button.x && mouseX <= button.x + button.width &&
         mouseY >= button.y && mouseY <= button.y + button.height;
}

// Draw customization screen
function drawCustomization() {
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#9844ffff';
  ctx.font = 'bold 72px Impact, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CUSTOMIZE PLAYER', canvas.width / 2, 100);

  window.customizeButtons = [];

  // Color selection
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Impact, monospace';
  ctx.fillText('COLOR', canvas.width / 2, 180);

  const colorBoxSize = 60;
  const colorSpacing = 80;
  const colorStartX = canvas.width / 2 - (playerColors.length * colorSpacing) / 2 + colorSpacing / 2;
  const colorY = 200;

  playerColors.forEach((color, index) => {
    const x = colorStartX + index * colorSpacing - colorBoxSize / 2;
    const colorBox = { x: x, y: colorY, width: colorBoxSize, height: colorBoxSize };
    
    // Draw color box
    ctx.fillStyle = color.value;
    ctx.fillRect(x, colorY, colorBoxSize, colorBoxSize);
    
    // Highlight selected or hovered
    if (playerColor === color.value) {
      ctx.strokeStyle = '#ffff44';
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 4, colorY - 4, colorBoxSize + 8, colorBoxSize + 8);
    } else if (isButtonHovered(colorBox)) {
      ctx.strokeStyle = '#aaaaaa';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, colorY - 2, colorBoxSize + 4, colorBoxSize + 4);
    } else {
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, colorY, colorBoxSize, colorBoxSize);
    }
    
    // Color name
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '16px monospace';
    ctx.fillText(color.name, x + colorBoxSize / 2, colorY + colorBoxSize + 20);
    
    window.customizeButtons.push({
      x: x,
      y: colorY,
      width: colorBoxSize,
      height: colorBoxSize,
      action: 'color',
      value: color.value
    });
  });

  // Trail selection
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Impact, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TRAIL EFFECT', canvas.width / 2, 360);

  const trailBoxSize = 100;
  const trailSpacing = 140;
  const trailStartX = canvas.width / 2 - (playerTrails.length * trailSpacing) / 2 + trailSpacing / 2;
  const trailY = 390;

  playerTrails.forEach((trail, index) => {
    const x = trailStartX + index * trailSpacing - trailBoxSize / 2;
    
    // Draw background box
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, trailY, trailBoxSize, trailBoxSize);
    
    // Draw trail preview
    ctx.fillStyle = playerColor;
    const centerX = x + trailBoxSize / 2;
    const centerY = trailY + trailBoxSize / 2;
    const boxSize = 25;
    
    if (trail.value === 'none') {
      // Just the player box
      ctx.fillRect(centerX - boxSize/2, centerY - boxSize/2, boxSize, boxSize);
    } else if (trail.value === 'fade') {
      // Fading squares
      for (let i = 3; i >= 0; i--) {
        const alpha = (i + 1) * 0.2;
        const offset = (3 - i) * 8;
        const trailColor = playerColor.replace('#', '');
        const r = parseInt(trailColor.substr(0, 2), 16);
        const g = parseInt(trailColor.substr(2, 2), 16);
        const b = parseInt(trailColor.substr(4, 2), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(centerX - boxSize/2 - offset, centerY - boxSize/2, boxSize, boxSize);
      }
    } else if (trail.value === 'particles') {
      // Main box
      ctx.fillRect(centerX - boxSize/2, centerY - boxSize/2, boxSize, boxSize);
      // Particle dots
      const trailColor = playerColor.replace('#', '');
      const r = parseInt(trailColor.substr(0, 2), 16);
      const g = parseInt(trailColor.substr(2, 2), 16);
      const b = parseInt(trailColor.substr(4, 2), 16);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
      for (let i = 0; i < 8; i++) {
        const particleX = centerX - 35 + Math.random() * 40;
        const particleY = centerY - 10 + Math.random() * 20;
        ctx.fillRect(particleX, particleY, 4, 4);
      }
    } else if (trail.value === 'glow') {
      // Glowing circles
      const trailColor = playerColor.replace('#', '');
      const r = parseInt(trailColor.substr(0, 2), 16);
      const g = parseInt(trailColor.substr(2, 2), 16);
      const b = parseInt(trailColor.substr(4, 2), 16);
      
      for (let i = 3; i > 0; i--) {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.15 - i * 0.03})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, boxSize/2 + i * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      // Main box
      ctx.fillStyle = playerColor;
      ctx.fillRect(centerX - boxSize/2, centerY - boxSize/2, boxSize, boxSize);
    }
    
    const trailBox = { x: x, y: trailY, width: trailBoxSize, height: trailBoxSize };
    
    // Highlight selected or hovered
    if (playerTrail === trail.value) {
      ctx.strokeStyle = '#ffff44';
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 4, trailY - 4, trailBoxSize + 8, trailBoxSize + 8);
    } else if (isButtonHovered(trailBox)) {
      ctx.strokeStyle = '#aaaaaa';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, trailY - 2, trailBoxSize + 4, trailBoxSize + 4);
    } else {
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, trailY, trailBoxSize, trailBoxSize);
    }
    
    // Trail name
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '18px monospace';
    ctx.fillText(trail.name, x + trailBoxSize / 2, trailY + trailBoxSize + 20);
    
    window.customizeButtons.push({
      x: x,
      y: trailY,
      width: trailBoxSize,
      height: trailBoxSize,
      action: 'trail',
      value: trail.value
    });
  });

  // Preview (moved lower)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Impact, monospace';
  ctx.fillText('PREVIEW', canvas.width / 2, 570);
  
  const previewX = canvas.width / 2 - 50;
  const previewY = 590;
  
  // Draw trail preview
  if (playerTrail !== 'none') {
    const mockTrail = [];
    for (let i = 0; i < 8; i++) {
      mockTrail.push({ x: previewX - i * 12, y: previewY, alpha: 1 - i * 0.12 });
    }
    
    const savedTrail = trailHistory;
    const savedPlayer = player;
    trailHistory = mockTrail;
    player = { x: previewX, y: previewY, width: 100, height: 100 };
    drawPlayerTrail();
    trailHistory = savedTrail;
    player = savedPlayer;
  }
  
  drawPlayer(previewX, previewY, 100, 100);

  // Back button (positioned like settings menu - bottom left)
  const backX = 50;
  const backY = canvas.height - 80;
  const backBtn = { x: backX, y: backY, width: 120, height: 50, action: 'back' };
  
  ctx.fillStyle = isButtonHovered(backBtn) ? '#555555' : '#444444';
  ctx.fillRect(backX, backY, 120, 50);
  ctx.strokeStyle = isButtonHovered(backBtn) ? '#aaaaaa' : '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(backX, backY, 120, 50);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px monospace';
  ctx.fillText('BACK', backX + 60, backY + 32);
  
  window.customizeButtons.push(backBtn);

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
function drawChapterSelect() {
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#9844ffff';
  ctx.font = 'bold 72px Impact, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SELECT CHAPTER', canvas.width / 2, 120);

  // Chapter buttons
  window.chapterButtons = [];
  
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const buttonWidth = 550;
    const buttonHeight = 120;
    const buttonX = canvas.width / 2 - buttonWidth / 2;
    const buttonY = 220 + i * 140;
    
    const chapterBtn = {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      chapter: i
    };
    
    const colors = getChapterColors(i);
    const completion = getChapterCompletion(i);
    const isHovered = isButtonHovered(chapterBtn);
    
    // Draw button background with gradient
    const gradient = ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
    gradient.addColorStop(0, isHovered ? '#4a4a4a' : '#3a3a3a');
    gradient.addColorStop(1, isHovered ? '#555555' : '#444444');
    ctx.fillStyle = gradient;
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Colored left accent bar
    ctx.fillStyle = colors.primary;
    ctx.fillRect(buttonX, buttonY, 8, buttonHeight);
    
    // Border with chapter color when hovered
    ctx.strokeStyle = isHovered ? colors.accent : '#888888';
    ctx.lineWidth = 3;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Chapter icon/number circle on the left
    const iconX = buttonX + 45;
    const iconY = buttonY + buttonHeight / 2;
    const iconRadius = 30;
    
    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Impact, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(i + 1, iconX, iconY + 10);
    
    // Chapter name and description
    ctx.textAlign = 'left';
    ctx.fillStyle = colors.primary;
    ctx.font = '26px Arial, sans-serif';
    ctx.fillText(chapter.name.replace(`Chapter ${i + 1}: `, ''), buttonX + 90, buttonY + 35);
    
    ctx.fillStyle = '#cccccc';
    ctx.font = '18px monospace';
    ctx.fillText(chapter.description, buttonX + 90, buttonY + 60);
    
    // Completion percentage bar and text
    const barWidth = 120;
    const barHeight = 12;
    const barX = buttonX + buttonWidth - barWidth - 20;
    const barY = buttonY + buttonHeight - 30;
    
    // Background bar
    ctx.fillStyle = '#222222';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Progress bar
    ctx.fillStyle = completion === 100 ? '#44ff44' : colors.primary;
    ctx.fillRect(barX, barY, (barWidth * completion) / 100, barHeight);
    
    // Bar border
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Completion text
    ctx.fillStyle = completion === 100 ? '#44ff44' : '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(completion)}%`, buttonX + buttonWidth - 150, buttonY + buttonHeight - 32);
    
    // Completion status icon
    if (completion === 100) {
      ctx.fillStyle = '#44ff44';
      ctx.font = '24px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('✓', buttonX + buttonWidth - 15, buttonY + 35);
    }
    
    window.chapterButtons.push(chapterBtn);
  }

  // Back button
  let backX = 50;
  let backY = canvas.height - 100;
  window.backButton = {
    x: backX,
    y: backY,
    width: 120,
    height: 50
  };
  
  ctx.fillStyle = isButtonHovered(window.backButton) ? '#555555' : '#444444';
  ctx.fillRect(backX, backY, 120, 50);
  ctx.strokeStyle = isButtonHovered(window.backButton) ? '#aaaaaa' : '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(backX, backY, 120, 50);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BACK', backX + 60, backY + 32);

  // Instructions
  ctx.fillStyle = '#666666';
  ctx.font = '26px monospace';
  ctx.fillText('ESC - Back to Menu', canvas.width / 2, canvas.height - 30);

  ctx.textAlign = 'left';
}

// Draw level selection screen
function drawLevelSelect() {
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Get current chapter info
  const chapterInfo = getCurrentChapterInfo();
  if (!chapterInfo) {
    // No valid chapter, go back to chapter select
    gameState = 'chapterSelect';
    return;
  }

  // Title
  ctx.fillStyle = '#9844ffff';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`Chapter ${currentChapter + 1}: ${chapterInfo.name.replace(`Chapter ${currentChapter + 1}: `, '')}`, canvas.width / 2, 100);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px monospace';
  ctx.fillText('SELECT LEVEL', canvas.width / 2, 140);

  // Level buttons (scaled to 90x90)
  let y = 220;
  let x = 0;
  window.levelButtons = [];
  
  for (let i = 0; i < chapterInfo.levels.length; i++) {
    if(i == 5) {
      y = 220 + 120;
      x = 0;
    }

    let bx = canvas.width / 2 - 300 + x * 120;
    let by = y - 52;
    
    // Check if level is unlocked
    const isUnlocked = isLevelUnlocked(currentChapter, i);
    const isCompleted = completedLevels.has(getGlobalLevelIndex(currentChapter, i));
    
    const levelBtn = {
      x: bx,
      y: by,
      width: 90,
      height: 90,
      levelInChapter: i,
      isUnlocked: isUnlocked
    };
    
    // Draw button - darker if locked
    if (isUnlocked) {
      ctx.fillStyle = isButtonHovered(levelBtn) ? '#555555' : '#444444';
    } else {
      ctx.fillStyle = '#222222'; // Much darker for locked levels
    }
    ctx.fillRect(bx, by, 90, 90);
    
    // Border - different color for locked
    if (isUnlocked) {
      if (isCompleted) {
        ctx.strokeStyle = '#44ff44'; // Green border if completed
      } else {
        ctx.strokeStyle = isButtonHovered(levelBtn) ? '#aaaaaa' : '#888888';
      }
    } else {
      ctx.strokeStyle = '#444444'; // Dark border for locked
    }
    ctx.lineWidth = 4;
    ctx.strokeRect(bx, by, 90, 90);

    // Button text - grayed out if locked
    if (isUnlocked) {
      ctx.fillStyle = isCompleted ? '#44ff44' : '#ffffff';
    } else {
      ctx.fillStyle = '#555555'; // Very dark gray for locked
    }
    ctx.font = '36px monospace';
    ctx.fillText(i+1, canvas.width / 2 - 255 + x * 120, y - 7);

    // Lock icon for locked levels
    if (!isUnlocked) {
      ctx.fillStyle = '#555555';
      ctx.font = '32px monospace';
      ctx.fillText('🔒', canvas.width / 2 - 263 + x * 120, y + 23);
    } else if (isCompleted) {
      // Show star rating for completed levels
      const globalIndex = getGlobalLevelIndex(currentChapter, i);
      const stars = levelStars[globalIndex] || 0;
      ctx.fillStyle = '#ffdd44';
      ctx.font = '24px monospace';
      const starText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      ctx.fillText(starText, canvas.width / 2 - 255 + x * 120, y + 23);
    } else {
      // Button hint for unlocked but not completed levels
      ctx.fillStyle = '#888888';
      ctx.font = '22px monospace';
      if (i < 9) {
        ctx.fillText(`Press ${i + 1}`, canvas.width / 2 - 255 + x * 120, y + 23);
      } else {
        ctx.fillText(`Press 0`, canvas.width / 2 - 255 + x * 120, y + 23);
      }
    }
    
    window.levelButtons.push(levelBtn);
    x++;
  }

  // Bonus level button (if available and unlocked)
  if (chapterInfo.bonusLevel && isBonusLevelUnlocked(currentChapter)) {
    let bonusX = canvas.width / 2 - 60; // Center position
    let bonusY = y + 80; // Below the regular levels
    
    const bonusGlobalIndex = getBonusLevelGlobalIndex(currentChapter);
    const isBonusCompleted = completedLevels.has(bonusGlobalIndex);
    
    const bonusBtn = {
      x: bonusX,
      y: bonusY,
      width: 90,
      height: 90,
      levelInChapter: -1,
      isUnlocked: true,
      isBonus: true
    };
    
    // Draw bonus button - special gold color
    if (isBonusCompleted) {
      ctx.fillStyle = '#9900ffff';
    } else {
      ctx.fillStyle = isButtonHovered(bonusBtn) ? '#DAA520' : '#B8860B'; // Lighter gold on hover
    }
    ctx.fillRect(bonusX, bonusY, 90, 90);
    
    // Special border for bonus level
    if (isBonusCompleted) {
      ctx.strokeStyle = '#44ff44'; // Green if completed
    } else {
      ctx.strokeStyle = isButtonHovered(bonusBtn) ? '#FFB84D' : '#FFA500'; // Lighter orange on hover
    }
    ctx.lineWidth = 4;
    ctx.strokeRect(bonusX, bonusY, 90, 90);

    // Bonus level text
    ctx.fillStyle = '#000000'; // Black text on gold background
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BONUS', bonusX + 45, bonusY + 40);
    
    if (isBonusCompleted) {
      // Show star rating for completed bonus level
      const stars = levelStars[bonusGlobalIndex] || 0;
      ctx.fillStyle = '#ffdd44';
      ctx.font = '20px monospace';
      const starText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      ctx.fillText(starText, bonusX + 45, bonusY + 75);
    } else {
      // Button hint for bonus level
      ctx.fillStyle = '#000000';
      ctx.font = '18px monospace';
      ctx.fillText('Press B', bonusX + 45, bonusY + 65);
    }
    
    window.levelButtons.push(bonusBtn);
  }

  // Back button
  let backX = 50;
  let backY = canvas.height - 100;
  window.backButton = {
    x: backX,
    y: backY,
    width: 120,
    height: 50
  };
  
  ctx.fillStyle = isButtonHovered(window.backButton) ? '#555555' : '#444444';
  ctx.fillRect(backX, backY, 120, 50);
  ctx.strokeStyle = isButtonHovered(window.backButton) ? '#aaaaaa' : '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(backX, backY, 120, 50);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BACK', backX + 60, backY + 32);

  // Instructions
  ctx.fillStyle = '#666666';
  ctx.font = '26px monospace';
  ctx.fillText('ESC - Back to Chapters', canvas.width / 2, canvas.height - 30);

  ctx.textAlign = 'left';
}

// Draw settings screen
function drawSettings() {
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#9844ffff';
  ctx.font = 'bold 72px Impact, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SETTINGS', canvas.width / 2, 120);

  // Audio settings
  ctx.fillStyle = '#ffffff';
  ctx.font = '36px monospace';
  ctx.fillText('AUDIO', canvas.width / 2, 200);

  // Volume controls
  const sliderWidth = 300;
  const sliderHeight = 20;
  const centerX = canvas.width / 2;
  
  // Master Volume
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '24px monospace';
  ctx.fillText('Master Volume', centerX - 150, 260);
  
  // Master volume slider background
  ctx.fillStyle = '#444444';
  ctx.fillRect(centerX - sliderWidth/2, 270, sliderWidth, sliderHeight);
  
  // Master volume slider fill
  ctx.fillStyle = '#8c44ff';
  ctx.fillRect(centerX - sliderWidth/2, 270, sliderWidth * masterVolume, sliderHeight);
  
  // Master volume value
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px monospace';
  ctx.fillText(`${Math.round(masterVolume * 100)}%`, centerX + sliderWidth/2 + 20, 287);

  // Music Volume
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '24px monospace';
  ctx.fillText('Music Volume', centerX - 150, 340);
  
  // Music volume slider background
  ctx.fillStyle = '#444444';
  ctx.fillRect(centerX - sliderWidth/2, 350, sliderWidth, sliderHeight);
  
  // Music volume slider fill
  ctx.fillStyle = '#8c44ff';
  ctx.fillRect(centerX - sliderWidth/2, 350, sliderWidth * musicVolume, sliderHeight);
  
  // Music volume value
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px monospace';
  ctx.fillText(`${Math.round(musicVolume * 100)}%`, centerX + sliderWidth/2 + 20, 367);

  // SFX Volume
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '24px monospace';
  ctx.fillText('SFX Volume', centerX - 150, 420);
  
  // SFX volume slider background
  ctx.fillStyle = '#444444';
  ctx.fillRect(centerX - sliderWidth/2, 430, sliderWidth, sliderHeight);
  
  // SFX volume slider fill
  ctx.fillStyle = '#8c44ff';
  ctx.fillRect(centerX - sliderWidth/2, 430, sliderWidth * sfxVolume, sliderHeight);
  
  // SFX volume value
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px monospace';
  ctx.fillText(`${Math.round(sfxVolume * 100)}%`, centerX + sliderWidth/2 + 20, 447);

  // Store slider positions for mouse interaction
  window.volumeSliders = [
    {
      x: centerX - sliderWidth/2,
      y: 270,
      width: sliderWidth,
      height: sliderHeight,
      type: 'master'
    },
    {
      x: centerX - sliderWidth/2,
      y: 350,
      width: sliderWidth,
      height: sliderHeight,
      type: 'music'
    },
    {
      x: centerX - sliderWidth/2,
      y: 430,
      width: sliderWidth,
      height: sliderHeight,
      type: 'sfx'
    }
  ];

  // Back button
  let backX = 50;
  let backY = canvas.height - 100;
  ctx.fillStyle = '#444444';
  ctx.fillRect(backX, backY, 120, 50);
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(backX, backY, 120, 50);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px monospace';
  ctx.fillText('BACK', backX + 60, backY + 32);
  
  window.backButton = {
    x: backX,
    y: backY,
    width: 120,
    height: 50
  };

  // Instructions
  ctx.fillStyle = '#666666';
  ctx.font = '24px monospace';
  ctx.fillText('ESC - Back to Menu  |  Click and drag sliders to adjust volume', canvas.width / 2, canvas.height - 30);

  ctx.textAlign = 'left';
}

// Game loop
function gameLoop(currentTime = 0) {
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
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

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
        }
      }
    });
  }

  // Check customization buttons
  if (gameState === 'customize' && window.customizeButtons) {
    window.customizeButtons.forEach(button => {
      if (x >= button.x && x <= button.x + button.width &&
          y >= button.y && y <= button.y + button.height) {
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
          loadLevel(currentLevel);
          gameState = 'playing';
        } else if (button.action === 'settings') {
          previousGameState = 'playing'; // Return to playing after settings
          transitionToState('settings');
        } else if (button.action === 'quit') {
          transitionToState('menu');
        }
      }
    });
  }
}

// Keyboard event listeners
window.addEventListener('keydown', (e) => {
  // Movement keys
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
  }

  // Debug mode toggle
  if (ENABLE_DEBUG_FEATURES && e.code === 'KeyT') {
    DEBUG_MODE = !DEBUG_MODE;
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
      gameState = 'paused';
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
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  mouseX = (e.clientX - rect.left) * scaleX;
  mouseY = (e.clientY - rect.top) * scaleY;
});

// Start the game when page loads
init();