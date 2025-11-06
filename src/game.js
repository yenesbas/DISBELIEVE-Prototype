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

  const masterEl = document.getElementById('masterVol');
  const musicEl = document.getElementById('musicVol');
  const sfxEl = document.getElementById('sfxVol');

  if (masterEl) {
    masterEl.value = masterVolume;
    masterEl.addEventListener('input', (e) => {
      setMasterVolume(parseFloat(e.target.value));
    });
  }

  if (musicEl) {
    musicEl.value = musicVolume;
    musicEl.addEventListener('input', (e) => {
      setMusicVolume(parseFloat(e.target.value));
    });
  }

  if (sfxEl) {
    sfxEl.value = sfxVolume;
    sfxEl.addEventListener('input', (e) => {
      setSfxVolume(parseFloat(e.target.value));
    });
  }
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

const levels = [
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
    name: "Level 10: Finale",
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
];

// Game state
let gameState = 'menu'; // 'menu', 'playing', 'levelComplete'
let currentLevel = 0;
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

// Load a specific level
function loadLevel(levelIndex) {
  currentLevel = levelIndex;
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
  // Menu state
  if (gameState === 'menu') {
    return;
  }

  // Level complete state
  if (gameState === 'levelComplete') {
    levelCompleteTimer -= deltaTime;
    if (levelCompleteTimer <= 0) {
      // Move to next level
      if (currentLevel < levels.length - 1) {
        loadLevel(currentLevel + 1);
        updateStats();
      } else {
        // Game complete, return to menu
        gameState = 'menu';
        currentLevel = 0;
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

  if (isPaused) {
    return; // Skip update if game is paused
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
    return;
  }

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
  if (!isDead && gameState === 'playing') {
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
  if (isDead && deathFlashTimer > 0) {
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
    ctx.fillText('Level Complete!', canvas.width / 2, canvas.height / 2);

    ctx.font = '24px Arial';
    ctx.fillStyle = '#ffffff';
    if (currentLevel < levels.length - 1) {
      ctx.fillText('Next level loading...', canvas.width / 2, canvas.height / 2 + 50);
    } else {
      ctx.fillText('You beat all levels!', canvas.width / 2, canvas.height / 2 + 50);
      ctx.fillText(`Total Deaths: ${deaths}`, canvas.width / 2, canvas.height / 2 + 85);
    }
    ctx.textAlign = 'left';
  }

  // Update trigger info display below canvas
  updateTriggerInfo();
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

  // Level selection
  ctx.fillStyle = '#aaaaaa';
  ctx.font = 'bold 48px Arial';
  ctx.fillText('SELECT LEVEL', canvas.width / 2, 330);

  // Level buttons (scaled to 90x90)
  let y = 420;
  let x = 0;
  window.levelButtons = [];
  for (let i = 0; i < levels.length; i++) {
    if(i == 5 && i < 8) {
      y = 420 + 120;
      x = 0;
    }

    let bx = canvas.width / 2 - 300 + x * 120;
    let by = y - 52;
    // Draw button
    ctx.fillStyle = '#444444';
    ctx.fillRect(bx, by, 90, 90);
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 4;
    ctx.strokeRect(bx, by, 90, 90);

    // Button text
    ctx.fillStyle = '#ffffff';
    ctx.font = '36px Arial';
    ctx.fillText(i+1, canvas.width / 2 - 255 + x * 120, y - 7);

    // Button hint
    ctx.fillStyle = '#888888';
    ctx.font = '22px Arial';
    if (i < 9) {
    ctx.fillText(`Press ${i + 1}`, canvas.width / 2 - 255 + x * 120, y + 23);
    } else {
    ctx.fillText(`Press 0`, canvas.width / 2 - 255 + x * 120, y + 23);
    }
    window.levelButtons.push({
      x: bx,
      y: by,
      width: 90,
      height: 90,
      level: i
    });
    x++;
  }

  // Instructions
  ctx.fillStyle = '#666666';
  ctx.font = '26px Arial';
  ctx.fillText('Hint: DISBELIEVE WHAT YOU SEE', canvas.width / 2, canvas.height - 50);

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
    if (e.code === 'Digit1' || e.code === 'Numpad1') {
      loadLevel(0);
      updateStats();
    } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
      loadLevel(1);
      updateStats();
    } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
      loadLevel(2);
      updateStats();
    } else if (e.code === 'Digit4' || e.code === 'Numpad4') {
      loadLevel(3);
      updateStats();
    } else if (e.code === 'Digit5' || e.code === 'Numpad5') {
      loadLevel(4);
      updateStats();
    } else if (e.code === 'Digit6' || e.code === 'Numpad6') {
      loadLevel(5);
      updateStats();
    } else if (e.code === 'Digit7' || e.code === 'Numpad7') {
      loadLevel(6);
      updateStats();
    } else if (e.code === 'Digit8' || e.code === 'Numpad8') {
      loadLevel(7);
      updateStats();
    } else if (e.code === 'Digit9' || e.code === 'Numpad9') {
      loadLevel(8);
      updateStats();
    } else if (e.code === 'Digit0' || e.code === 'Numpad0') {
      loadLevel(9);
      updateStats();
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

  // ESC to return to menu
  if (e.code === 'Escape') {
    gameState = 'menu';
    currentLevel = 0;
    deaths = 0;
    levelDeaths = 0;
    updateStats();
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

// Handle mouse click on canvas (for level selection)
canvas.addEventListener('mousedown', function(e) {
    if (gameState !== 'menu') return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (window.levelButtons) {
        for (let btn of window.levelButtons) {
            if (mx >= btn.x && mx <= btn.x + btn.width && my >= btn.y && my <= btn.y + btn.height) {
                loadLevel(btn.level);
                updateStats();
                break;
            }
        }
    }
});

// Start the game
init();
