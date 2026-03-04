// Chapter 1: First Deceptions
// Basic deception mechanics - spikes and fake blocks

const chapter1 = {
  name: "Chapter 1: First Deceptions",
  description: "Learn to question what you see",
  visualStyle: "default", // Minimalist geometric
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
};

/* Total Deaths in Chapter 1
* MH: 121 (Level 10 rage quit)
* Serkan: 85 (Level 9 rage quit)
* Serhat Abi: 130 (Level 10 rage quit)
* Kadir Ihsan: 112 Chapter 1 complete
*/
