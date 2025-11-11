// Disbelieve Prototype - game.js
// All game logic in one file

/*
═══════════════════════════════════════════════════════════════════════
  HOW TO BUILD YOUR OWN LEVELS - COMPLETE GUIDE
═══════════════════════════════════════════════════════════════════════

LEVEL MAP CHARACTERS:
  '.'  = Empty space (air)
  '#'  = Ground/Platform (solid block - player collides with it)
  'F'  = Fake block (looks like ground but player passes through it!)
  'D'  = Door (level exit - player must reach this to complete)
  '1'  = Spike that moves 1 tile  (40px) when triggered
  '2'  = Spike that moves 2 tiles (80px) when triggered
  '3'  = Spike that moves 3 tiles (120px) when triggered
  '4'  = Spike that moves 4 tiles (160px) when triggered
  '^'  = Spike that moves 2 tiles (same as '2', for backward compatibility)

SPIKE BEHAVIOR:
  - Spikes are triggered when the player crosses an INVISIBLE VERTICAL LINE
  - Each spike has a trigger line positioned to its LEFT
  - Once triggered, they rapidly move to the right by their specified distance
  - '1' = short movement (easier to avoid, good for beginners)
  - '4' = long movement (very dangerous, creates big traps)
  - Mix different spike types to create varied difficulty!

TRIGGER LINE POSITIONS:
  - By DEFAULT, trigger line is 2 tiles (80px) to the LEFT of each spike
  - You can customize trigger positions in the level's "spikeTriggers" array
  - Format: spikeTriggers: [tileOffset1, tileOffset2, ...]
  - Example: spikeTriggers: [3, 1, 4] means:
      * First spike: trigger 3 tiles to the left
      * Second spike: trigger 1 tile to the left
      * Third spike: trigger 4 tiles to the left

TRIGGER LINE LENGTHS (VERTICAL):
  - By DEFAULT, trigger lines extend the FULL HEIGHT of the screen
  - You can limit trigger length using the "spikeTriggerLengths" array
  - Format: spikeTriggerLengths: [length1, length2, ...]
  - Length is in pixels (use TILE_SIZE multiples: 40, 80, 120, etc.)
  - POSITIVE values extend UPWARD from the spike top
  - NEGATIVE values extend DOWNWARD from the spike top
  - Example: spikeTriggerLengths: [80, -120, 40] means:
      * First spike: trigger line goes 80px UP from spike top
      * Second spike: trigger line goes 120px DOWN from spike top
      * Third spike: trigger line goes 40px UP from spike top
  - If omitted or null, that spike uses full-height trigger

DEBUG MODE:
  - Set DEBUG_MODE = true (line 170) to see yellow trigger lines in-game
  - Press 'T' during gameplay to toggle debug mode on/off
  - Trigger info is ALWAYS displayed below the canvas (shows offset for each spike)
  - Format: [Spike#: -X tiles STATUS] where:
      * ○ = not triggered yet
      * → = currently moving
      * ✓ = finished moving

TIPS FOR LEVEL DESIGN:
  1. Each row must be exactly 20 characters (one tile = one character)
  2. Use 6 rows for standard level height (480px canvas)
  3. Make sure spikes have room to move right (check for empty space)
  4. Place the door 'D' at the end of your level as the goal
  5. Start simple - test your level to make sure it's possible!
  6. Use '1' spikes for small gaps, '3' or '4' for long jumps
  7. Use 'F' for fake blocks - they look solid but aren't! Great for deception!

EXAMPLE LEVEL:
  const levels = [
    {
      name: "My Custom Level",
      map: [
        "....................",  // Row 0 (top)
        "..................D.",  // Door on top platform
        "........##........##",  // Platform with door
        "####..............##",  // Left starting platform
        "...#..1...2....FF###",  // Spikes: 1 and 2
        "...#####...#########"   // Row 5 (bottom)
      ],
      spikeTriggers: [3, 1],  // OPTIONAL: First spike trigger at 3 tiles left, second at 1 tile left
      spikeTriggerLengths: [80, -120]  // OPTIONAL: 80 = 80px UP, -120 = 120px DOWN from spike top
                              // If omitted or null, spike uses full-height trigger
    }
  ];

TO ADD A NEW LEVEL:
  Scroll down to the 'levels' array and add your level like this:

  {
    name: "Level 4: Your Name Here",
    map: [
      "your level design...",
      "...goes here........",
      // ... 6 rows total
    ]
  }

═══════════════════════════════════════════════════════════════════════
*/

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
          "....................",
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
          "....................",
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
          "...........#........",
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
          ".....1..............",
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
          "..................D.",
          "F##FF#FFF####FFF####",
          "11111111111111111111"
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
          "................###.",
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
          ".....#.....FF....D..",
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
          "....................",
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
          "#.#################.",
          "###...............#.",
          "..................#.",
          "....11#..#...#..#.#.",
          "....FFF11#211#11#..4",
          ".##################1",
          "....................",
          "..................D.",
          "#####FF#############"
        ],
        spikeTriggers: [-0.5, -4, -0.5, -1, -50, -50, -1, -50, -1, -50, -50, -50, -50, -1],           // Horizontal offsets
        spikeTriggerLengths: [250, 200, 1, 200, 1.05, 1.1, 150, 2, 150, 4, 5, 6, 7, 400, 9]  // Spike 1: 1 tile, Spike 2: 3 tiles, Spike 3: 2 tiles left
      }
    ]
  },
  // Future chapters can be added here:
  {
    name: "Chapter 2: Advanced Illusions",
    description: "Master the art of disbelief",
    levels: [
      {
        name: "Level 1: Chapter 2 Intro",
        map: [
          "....................",
          ".....2..3...3.......",
          "#.######F##########.",
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
        spikeTriggerLengths: [250, 251, 252, 120, 1.05, 1.1, 151, 160, 150, 80, 180]  // Spike 1: 1 tile, Spike 2: 3 tiles, Spike 3: 2 tiles left
      }
    ]
  }
];

// Legacy compatibility - flatten chapters into single levels array for backwards compatibility
const levels = [];
chapters.forEach(chapter => {
  levels.push(...chapter.levels);
});

// Helper functions for chapter/level management
function getChapterFromGlobalLevel(globalLevelIndex) {
  return Math.floor(globalLevelIndex / 10);
}

function getLevelInChapterFromGlobalLevel(globalLevelIndex) {
  return globalLevelIndex % 10;
}

function getGlobalLevelIndex(chapterIndex, levelInChapter) {
  return chapterIndex * 10 + levelInChapter;
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
let spikes = [];
let door = null;
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
    }
  } catch (e) {
    console.warn('Could not load progress:', e);
  }
}

function saveProgress() {
  try {
    const data = {
      completedLevels: Array.from(completedLevels),
      levelStars: levelStars
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
  spikes = [];
  door = null;

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
      } else if (char === '1' || char === '2' || char === '3' || char === '4' || char === '^') {
        // Determine spike movement distance
        let moveDistance;
        if (char === '1') moveDistance = TILE_SIZE * 1;
        else if (char === '2') moveDistance = TILE_SIZE * 2;
        else if (char === '3') moveDistance = TILE_SIZE * 3;
        else if (char === '4') moveDistance = TILE_SIZE * 4;
        else if (char === '^') moveDistance = TILE_SIZE * 2; // backward compatibility

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
      }
    }
  }
}

// Reset player to starting position
function resetPlayer() {
  player = {
    x: TILE_SIZE + 15,
    y: TILE_SIZE * 2,
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
      ctx.font = '12px Arial';
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

  // Draw player
  if (!isDead && (gameState === 'playing' || gameState === 'paused')) {
    ctx.fillStyle = '#4488ff';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Player outline
    ctx.strokeStyle = '#2266dd';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.width, player.height);

    // Simple eyes (scaled for 45x45 player)
    ctx.fillStyle = 'white';
    ctx.fillRect(player.x + 12, player.y + 12, 9, 9);
    ctx.fillRect(player.x + 24, player.y + 12, 9, 9);
    ctx.fillStyle = 'black';
    ctx.fillRect(player.x + 15, player.y + 15, 4, 4);
    ctx.fillRect(player.x + 27, player.y + 15, 4, 4);
  }

  // Death flash
  if (isDead && deathFlashTimer > 0 && gameState === 'playing') {
    ctx.fillStyle = `rgba(255, 0, 0, ${deathFlashTimer / DEATH_FLASH_DURATION * 0.5})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw "X_X" face (scaled)
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 36px Arial';
    ctx.fillText('X_X', player.x - 8, player.y + 30);
  }

  // Level complete overlay
  if (gameState === 'levelComplete') {
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#44ff44';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Level Complete!', canvas.width / 2, canvas.height / 2 - 60);
    
    // Show star rating
    const stars = calculateStars(levelDeaths);
    const starDisplay = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    ctx.fillStyle = '#ffdd44';
    ctx.font = 'bold 64px Arial';
    ctx.fillText(starDisplay, canvas.width / 2, canvas.height / 2 + 10);
    
    // Show death count
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.fillText(`Deaths this level: ${levelDeaths}`, canvas.width / 2, canvas.height / 2 + 60);

    ctx.font = '24px Arial';
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
  ctx.font = 'bold 72px Arial';
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
  ctx.fillStyle = '#444444';
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.fillText('RESUME', canvas.width / 2, buttonY + 40);
  
  window.pauseButtons.push({
    x: buttonX,
    y: buttonY,
    width: buttonWidth,
    height: buttonHeight,
    action: 'resume'
  });

  // Restart button
  buttonY += buttonSpacing;
  ctx.fillStyle = '#444444';
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.fillText('RESTART', canvas.width / 2, buttonY + 40);
  
  window.pauseButtons.push({
    x: buttonX,
    y: buttonY,
    width: buttonWidth,
    height: buttonHeight,
    action: 'restart'
  });

  // Settings button
  buttonY += buttonSpacing;
  ctx.fillStyle = '#444444';
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.fillText('SETTINGS', canvas.width / 2, buttonY + 40);
  
  window.pauseButtons.push({
    x: buttonX,
    y: buttonY,
    width: buttonWidth,
    height: buttonHeight,
    action: 'settings'
  });

  // Quit to Menu button
  buttonY += buttonSpacing;
  ctx.fillStyle = '#444444';
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.fillText('QUIT TO MENU', canvas.width / 2, buttonY + 40);
  
  window.pauseButtons.push({
    x: buttonX,
    y: buttonY,
    width: buttonWidth,
    height: buttonHeight,
    action: 'quit'
  });

  // Instructions
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '24px Arial';
  ctx.fillText('ESC to Resume', canvas.width / 2, canvas.height - 40);

  ctx.textAlign = 'left';
}

// Draw main menu
function drawMenu() {
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#9844ffff';
  ctx.font = 'bold 96px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('DISBELIEVE', canvas.width / 2, 150);

  // Subtitle
  ctx.fillStyle = '#ffffff';
  ctx.font = '30px Arial';
  ctx.fillText('Can you survive the deception?', canvas.width / 2, 210);

  // Menu buttons
  window.menuButtons = [];
  
  // Start Game button
  let startX = canvas.width / 2 - 150;
  let startY = 300;
  ctx.fillStyle = '#444444';
  ctx.fillRect(startX, startY, 300, 60);
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(startX, startY, 300, 60);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.fillText('START GAME', canvas.width / 2, startY + 40);
  
  window.menuButtons.push({
    x: startX,
    y: startY,
    width: 300,
    height: 60,
    action: 'startGame'
  });

  // Settings button
  let settingsY = 380;
  ctx.fillStyle = '#444444';
  ctx.fillRect(startX, settingsY, 300, 60);
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(startX, settingsY, 300, 60);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.fillText('SETTINGS', canvas.width / 2, settingsY + 40);
  
  window.menuButtons.push({
    x: startX,
    y: settingsY,
    width: 300,
    height: 60,
    action: 'settings'
  });

  // Instructions
  ctx.fillStyle = '#666666';
  ctx.font = '26px Arial';
  ctx.fillText('Hint: DISBELIEVE WHAT YOU SEE', canvas.width / 2, canvas.height - 50);

  ctx.textAlign = 'left';
}

// Draw chapter selection screen
function drawChapterSelect() {
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#9844ffff';
  ctx.font = 'bold 72px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SELECT CHAPTER', canvas.width / 2, 120);

  // Chapter buttons
  window.chapterButtons = [];
  
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const buttonWidth = 500;
    const buttonHeight = 100;
    const buttonX = canvas.width / 2 - buttonWidth / 2;
    const buttonY = 220 + i * 130;
    
    // Draw button background
    ctx.fillStyle = '#444444';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 3;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Chapter number
    ctx.fillStyle = '#8c44ff';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(`Chapter ${i + 1}`, canvas.width / 2, buttonY + 35);
    
    // Chapter name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(chapter.name.replace(`Chapter ${i + 1}: `, ''), canvas.width / 2, buttonY + 65);
    
    // Chapter description
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '18px Arial';
    ctx.fillText(chapter.description, canvas.width / 2, buttonY + 85);
    
    window.chapterButtons.push({
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      chapter: i
    });
  }

  // Back button
  let backX = 50;
  let backY = canvas.height - 100;
  ctx.fillStyle = '#444444';
  ctx.fillRect(backX, backY, 120, 50);
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(backX, backY, 120, 50);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('BACK', backX + 60, backY + 32);
  
  window.backButton = {
    x: backX,
    y: backY,
    width: 120,
    height: 50
  };

  // Instructions
  ctx.fillStyle = '#666666';
  ctx.font = '26px Arial';
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
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Chapter ${currentChapter + 1}: ${chapterInfo.name.replace(`Chapter ${currentChapter + 1}: `, '')}`, canvas.width / 2, 100);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Arial';
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
    
    // Draw button - darker if locked
    if (isUnlocked) {
      ctx.fillStyle = '#444444';
    } else {
      ctx.fillStyle = '#222222'; // Much darker for locked levels
    }
    ctx.fillRect(bx, by, 90, 90);
    
    // Border - different color for locked
    if (isUnlocked) {
      ctx.strokeStyle = isCompleted ? '#44ff44' : '#888888'; // Green border if completed
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
    ctx.font = '36px Arial';
    ctx.fillText(i+1, canvas.width / 2 - 255 + x * 120, y - 7);

    // Lock icon for locked levels
    if (!isUnlocked) {
      ctx.fillStyle = '#555555';
      ctx.font = '32px Arial';
      ctx.fillText('🔒', canvas.width / 2 - 263 + x * 120, y + 23);
    } else if (isCompleted) {
      // Show star rating for completed levels
      const globalIndex = getGlobalLevelIndex(currentChapter, i);
      const stars = levelStars[globalIndex] || 0;
      ctx.fillStyle = '#ffdd44';
      ctx.font = '24px Arial';
      const starText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      ctx.fillText(starText, canvas.width / 2 - 268 + x * 120, y + 23);
    } else {
      // Button hint for unlocked but not completed levels
      ctx.fillStyle = '#888888';
      ctx.font = '22px Arial';
      if (i < 9) {
        ctx.fillText(`Press ${i + 1}`, canvas.width / 2 - 255 + x * 120, y + 23);
      } else {
        ctx.fillText(`Press 0`, canvas.width / 2 - 255 + x * 120, y + 23);
      }
    }
    
    window.levelButtons.push({
      x: bx,
      y: by,
      width: 90,
      height: 90,
      levelInChapter: i,
      isUnlocked: isUnlocked
    });
    x++;
  }

  // Back button
  let backX = 50;
  let backY = canvas.height - 100;
  ctx.fillStyle = '#444444';
  ctx.fillRect(backX, backY, 120, 50);
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(backX, backY, 120, 50);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('BACK', backX + 60, backY + 32);
  
  window.backButton = {
    x: backX,
    y: backY,
    width: 120,
    height: 50
  };

  // Instructions
  ctx.fillStyle = '#666666';
  ctx.font = '26px Arial';
  ctx.fillText('ESC - Back to Chapters', canvas.width / 2, canvas.height - 30);

  ctx.textAlign = 'left';
}

// Draw settings screen
function drawSettings() {
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#9844ffff';
  ctx.font = 'bold 72px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SETTINGS', canvas.width / 2, 120);

  // Audio settings
  ctx.fillStyle = '#ffffff';
  ctx.font = '36px Arial';
  ctx.fillText('AUDIO', canvas.width / 2, 200);

  // Volume controls
  const sliderWidth = 300;
  const sliderHeight = 20;
  const centerX = canvas.width / 2;
  
  // Master Volume
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '24px Arial';
  ctx.fillText('Master Volume', centerX - 150, 260);
  
  // Master volume slider background
  ctx.fillStyle = '#444444';
  ctx.fillRect(centerX - sliderWidth/2, 270, sliderWidth, sliderHeight);
  
  // Master volume slider fill
  ctx.fillStyle = '#8c44ff';
  ctx.fillRect(centerX - sliderWidth/2, 270, sliderWidth * masterVolume, sliderHeight);
  
  // Master volume value
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px Arial';
  ctx.fillText(`${Math.round(masterVolume * 100)}%`, centerX + sliderWidth/2 + 20, 287);

  // Music Volume
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '24px Arial';
  ctx.fillText('Music Volume', centerX - 150, 340);
  
  // Music volume slider background
  ctx.fillStyle = '#444444';
  ctx.fillRect(centerX - sliderWidth/2, 350, sliderWidth, sliderHeight);
  
  // Music volume slider fill
  ctx.fillStyle = '#8c44ff';
  ctx.fillRect(centerX - sliderWidth/2, 350, sliderWidth * musicVolume, sliderHeight);
  
  // Music volume value
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px Arial';
  ctx.fillText(`${Math.round(musicVolume * 100)}%`, centerX + sliderWidth/2 + 20, 367);

  // SFX Volume
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '24px Arial';
  ctx.fillText('SFX Volume', centerX - 150, 420);
  
  // SFX volume slider background
  ctx.fillStyle = '#444444';
  ctx.fillRect(centerX - sliderWidth/2, 430, sliderWidth, sliderHeight);
  
  // SFX volume slider fill
  ctx.fillStyle = '#8c44ff';
  ctx.fillRect(centerX - sliderWidth/2, 430, sliderWidth * sfxVolume, sliderHeight);
  
  // SFX volume value
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px Arial';
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
  ctx.font = '24px Arial';
  ctx.fillText('BACK', backX + 60, backY + 32);
  
  window.backButton = {
    x: backX,
    y: backY,
    width: 120,
    height: 50
  };

  // Instructions
  ctx.fillStyle = '#666666';
  ctx.font = '24px Arial';
  ctx.fillText('ESC - Back to Menu  |  Click and drag sliders to adjust volume', canvas.width / 2, canvas.height - 30);

  ctx.textAlign = 'left';
}

// Game loop
function gameLoop(currentTime = 0) {
    if (isPaused) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // Calculate delta time with safety caps
    let deltaTime = currentTime - lastTime;
    if (deltaTime > 100) deltaTime = 16.67; // Cap at ~60fps if tab was inactive
    
    lastTime = currentTime;

    // Convert to seconds and update
    deltaTime = Math.min(deltaTime / 1000, 0.1); // Cap at 100ms
    update(deltaTime);
    render();

    requestAnimationFrame(gameLoop);
}

// Keyboard event listeners
document.addEventListener('keydown', (e) => {
  // Menu controls
  if (gameState === 'menu') {
    // No specific keyboard controls for main menu
    return;
  }

  // Chapter selection controls
  if (gameState === 'chapterSelect') {
    if (e.code === 'Digit1' || e.code === 'Numpad1') {
      if (chapters.length >= 1) {
        currentChapter = 0;
        transitionToState('levelSelect');
      }
    } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
      if (chapters.length >= 2) {
        currentChapter = 1;
        transitionToState('levelSelect');
      }
    } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
      if (chapters.length >= 3) {
        currentChapter = 2;
        transitionToState('levelSelect');
      }
    } else if (e.code === 'Escape') {
      transitionToState('menu');
    }
    return;
  }

  // Level selection controls
  if (gameState === 'levelSelect') {
    if (e.code === 'Digit1' || e.code === 'Numpad1') {
      if (isLevelUnlocked(currentChapter, 0)) {
        loadLevelFromChapter(currentChapter, 0);
        updateStats();
      }
    } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
      if (isLevelUnlocked(currentChapter, 1)) {
        loadLevelFromChapter(currentChapter, 1);
        updateStats();
      }
    } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
      if (isLevelUnlocked(currentChapter, 2)) {
        loadLevelFromChapter(currentChapter, 2);
        updateStats();
      }
    } else if (e.code === 'Digit4' || e.code === 'Numpad4') {
      if (isLevelUnlocked(currentChapter, 3)) {
        loadLevelFromChapter(currentChapter, 3);
        updateStats();
      }
    } else if (e.code === 'Digit5' || e.code === 'Numpad5') {
      if (isLevelUnlocked(currentChapter, 4)) {
        loadLevelFromChapter(currentChapter, 4);
        updateStats();
      }
    } else if (e.code === 'Digit6' || e.code === 'Numpad6') {
      if (isLevelUnlocked(currentChapter, 5)) {
        loadLevelFromChapter(currentChapter, 5);
        updateStats();
      }
    } else if (e.code === 'Digit7' || e.code === 'Numpad7') {
      if (isLevelUnlocked(currentChapter, 6)) {
        loadLevelFromChapter(currentChapter, 6);
        updateStats();
      }
    } else if (e.code === 'Digit8' || e.code === 'Numpad8') {
      if (isLevelUnlocked(currentChapter, 7)) {
        loadLevelFromChapter(currentChapter, 7);
        updateStats();
      }
    } else if (e.code === 'Digit9' || e.code === 'Numpad9') {
      if (isLevelUnlocked(currentChapter, 8)) {
        loadLevelFromChapter(currentChapter, 8);
        updateStats();
      }
    } else if (e.code === 'Digit0' || e.code === 'Numpad0') {
      if (isLevelUnlocked(currentChapter, 9)) {
        loadLevelFromChapter(currentChapter, 9);
        updateStats();
      }
    } else if (e.code === 'Escape') {
      transitionToState('chapterSelect');
    }
    return;
  }

  // Settings controls
  if (gameState === 'settings') {
    if (e.code === 'Escape') {
      // Return to previous state (could be menu or paused)
      transitionToState(previousGameState || 'menu');
      previousGameState = null;
    }
    return;
  }

  // Pause menu controls
  if (gameState === 'paused') {
    if (e.code === 'Escape') {
      gameState = 'playing';
      resumeGame();
    }
    return;
  }

  // Game controls
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
    // Prevent page scrolling when using Space or W for jump
    e.preventDefault();
    keys.space = true;
  }
  if (e.code === 'KeyR') keys.r = true;

  // ESC to pause/unpause game
  if (e.code === 'Escape') {
    if (gameState === 'playing') {
      // Pause the game
      gameState = 'paused';
      // Stop player movement
      keys.left = false;
      keys.right = false;
      keys.space = false;
      keys.r = false;
      if (player) {
        player.vx = 0;
      }
    } else if (gameState === 'paused') {
      // Resume the game
      gameState = 'playing';
      lastTime = performance.now();
    } else if (gameState === 'settings') {
      // Return from settings
      gameState = previousGameState || 'menu';
      previousGameState = null;
    }
  }

  // Toggle DEBUG_MODE with 'T' key (only if debug features are enabled)
  if (ENABLE_DEBUG_FEATURES && e.code === 'KeyT') {
    DEBUG_MODE = !DEBUG_MODE;
    console.log(`DEBUG_MODE: ${DEBUG_MODE ? 'ON (trigger lines visible)' : 'OFF (trigger lines hidden)'}`);
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') keys.space = false;
  if (e.code === 'KeyR') keys.r = false;
});

// Handle mouse interactions
let isDragging = false;
let dragSlider = null;

canvas.addEventListener('mousedown', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    // Main menu interactions
    if (gameState === 'menu') {
        if (window.menuButtons) {
            for (let btn of window.menuButtons) {
                if (mx >= btn.x && mx <= btn.x + btn.width && my >= btn.y && my <= btn.y + btn.height) {
                    if (btn.action === 'startGame') {
                        transitionToState('chapterSelect');
                    } else if (btn.action === 'settings') {
                        previousGameState = 'menu'; // Remember we came from main menu
                        transitionToState('settings');
                    }
                    break;
                }
            }
        }
        return;
    }

    // Chapter selection interactions
    if (gameState === 'chapterSelect') {
        // Check chapter buttons
        if (window.chapterButtons) {
            for (let btn of window.chapterButtons) {
                if (mx >= btn.x && mx <= btn.x + btn.width && my >= btn.y && my <= btn.y + btn.height) {
                    currentChapter = btn.chapter;
                    transitionToState('levelSelect');
                    break;
                }
            }
        }
        
        // Check back button
        if (window.backButton && 
            mx >= window.backButton.x && mx <= window.backButton.x + window.backButton.width &&
            my >= window.backButton.y && my <= window.backButton.y + window.backButton.height) {
            transitionToState('menu');
        }
        return;
    }

    // Level selection interactions
    if (gameState === 'levelSelect') {
        // Check level buttons
        if (window.levelButtons) {
            for (let btn of window.levelButtons) {
                if (mx >= btn.x && mx <= btn.x + btn.width && my >= btn.y && my <= btn.y + btn.height) {
                    // Only allow clicking unlocked levels
                    if (btn.isUnlocked) {
                        loadLevelFromChapter(currentChapter, btn.levelInChapter);
                        updateStats();
                    }
                    break;
                }
            }
        }
        
        // Check back button
        if (window.backButton && 
            mx >= window.backButton.x && mx <= window.backButton.x + window.backButton.width &&
            my >= window.backButton.y && my <= window.backButton.y + window.backButton.height) {
            transitionToState('chapterSelect');
        }
        return;
    }

    // Pause menu interactions
    if (gameState === 'paused') {
        if (window.pauseButtons) {
            for (let btn of window.pauseButtons) {
                if (mx >= btn.x && mx <= btn.x + btn.width && my >= btn.y && my <= btn.y + btn.height) {
                    if (btn.action === 'resume') {
                        gameState = 'playing';
                        resumeGame();
                    } else if (btn.action === 'restart') {
                        resetPlayer();
                        levelDeaths = 0;
                        gameState = 'playing';
                        resumeGame();
                        updateStats();
                    } else if (btn.action === 'settings') {
                        previousGameState = 'paused'; // Remember we came from pause menu
                        transitionToState('settings');
                    } else if (btn.action === 'quit') {
                        transitionToState('chapterSelect');
                        currentLevel = 0;
                        currentLevelInChapter = 0;
                        deaths = 0;
                        levelDeaths = 0;
                        updateStats();
                    }
                    break;
                }
            }
        }
        return;
    }

    // Settings interactions
    if (gameState === 'settings') {
        // Check back button first
        if (window.backButton && 
            mx >= window.backButton.x && mx <= window.backButton.x + window.backButton.width &&
            my >= window.backButton.y && my <= window.backButton.y + window.backButton.height) {
            // Return to previous state (could be menu or paused)
            transitionToState(previousGameState || 'menu');
            previousGameState = null;
            return;
        }
        
        // Check volume sliders
        if (window.volumeSliders) {
            for (let slider of window.volumeSliders) {
                if (mx >= slider.x && mx <= slider.x + slider.width &&
                    my >= slider.y && my <= slider.y + slider.height) {
                    // Start dragging
                    isDragging = true;
                    dragSlider = slider;
                    
                    // Also set initial value
                    const clickPos = (mx - slider.x) / slider.width;
                    const newVolume = Math.max(0, Math.min(1, clickPos));
                    
                    if (slider.type === 'master') {
                        setMasterVolume(newVolume);
                    } else if (slider.type === 'music') {
                        setMusicVolume(newVolume);
                    } else if (slider.type === 'sfx') {
                        setSfxVolume(newVolume);
                    }
                    break;
                }
            }
        }
        return;
    }
});

canvas.addEventListener('mousemove', function(e) {
    if (!isDragging || !dragSlider || gameState !== 'settings') return;
    
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    
    const clickPos = (mx - dragSlider.x) / dragSlider.width;
    const newVolume = Math.max(0, Math.min(1, clickPos));
    
    if (dragSlider.type === 'master') {
        setMasterVolume(newVolume);
    } else if (dragSlider.type === 'music') {
        setMusicVolume(newVolume);
    } else if (dragSlider.type === 'sfx') {
        setSfxVolume(newVolume);
    }
});

canvas.addEventListener('mouseup', function() {
    isDragging = false;
    dragSlider = null;
});

// Start the game
init();
