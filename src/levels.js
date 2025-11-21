// Disbelieve - Level Data
// All level definitions for the game

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
// 'G' = gravity zone (top-left corner marker)
// 'g' = gravity zone continuation (for multi-tile zones)
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
        "1.#19#12#.3...#2.2#.",
        "F############.#####.",
        "............#.......",
        "............F.....D.",
        "#.F..#..F..#########",
        "..#..#..#..........."
      ],
      spikeTriggers: [-0.5, -4, 0, -1.5, -5.1, -9.5, -1, -3, -1, -3, -2.5],           // Horizontal offsets
      spikeTriggerLengths: [250, 251, 252, 120, 1.3, 150, 151, 160, 150, 80, 180]
    }
  },
  // Future chapters can be added here:
  {
    name: "Chapter 2: Advanced Illusions",
    description: "Master the art of disbelief",
    // Gravity zone configuration for all levels in this chapter
    gravityZones: [
      {
        // Position auto-calculated from 'G' marker during parseLevel()
        type: 'flip',
        trigger: 'enter',
        duration: null,
        cooldown: 1.0,
        oneShot: false,
        initialActive: false,
        visual: {
          color: '#44ddff',
          secondaryColor: '#ff44dd',
          alpha: 0.35,
          stripeAngle: 45,
          stripeWidth: 8,
          stripeSpacing: 20,
          animated: true,
          animSpeed: 40,
          showArrow: true,
          glowWhenActive: true
        },
        sound: {
          enter: 'gravity_flip',
          exit: 'gravity_restore'
        }
      }
    ],
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
          "####II##IIFFFF######",
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
          "....................",
          "...................."
        ]
      },
      {
        name: "Level 3: Gravity Test",
        map: [
          "....................",
          "....................",
          ".S................D.",
          "####...#...#FFFFF##.",
          "...#244#...#00000..",
          "...#FFF#...######..#",
          "...#...#...I....I...",
          ".44#...#FFFFFFFF##..",
          ".###...F........#...",
          "..2#...F...........#",
          "..##III#............",
          "...#000#FFFF########"
        ],
        spikeTriggers: [-4, -3, -2, -4, -3],
        spikeTriggerLengths: [250, 250, 250, 83, 84]
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
