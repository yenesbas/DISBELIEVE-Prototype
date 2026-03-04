// Chapter 2: Gravity Deceptions
// Gravity zones and fake blocks - NO SPIKES

const chapter2 = {
  name: "Chapter 2: Gravity Deceptions",
  description: "Question your sense of direction",
  visualStyle: "neon", // Neon glow aesthetic
  levels: [
    // Level 1 - Introduction to gravity zones
    {
      name: "Level 1: Flip",
      map: [
        "....................",
        "....................",
        "....................",
        "####################",
        "....................",
        "....................",
        "....................",
        ".S................D.",
        "####################"
      ],
      gravityZones: [
        { x: 5, y: 0, width: 10, height: 4, direction: 'up' }
      ]
    },
    // Level 2 - Multiple gravity zones
    {
      name: "Level 2: Up and Down",
      map: [
        "....................",
        "....................",
        "....................",
        "####################",
        "....................",
        "....................",
        "....................",
        ".S................D.",
        "####################"
      ],
      gravityZones: [
        { x: 3, y: 0, width: 4, height: 4, direction: 'up' },
        { x: 10, y: 4, width: 4, height: 4, direction: 'down' }
      ]
    },
    // Level 3 - Gravity + fake blocks introduction
    {
      name: "Level 3: False Path",
      map: [
        "....................",
        "....................",
        "....................",
        "####################",
        "....................",
        "....................",
        "#.................#.",
        ".S.....FFFF.......D.",
        "####################"
      ],
      gravityZones: [
        { x: 5, y: 0, width: 10, height: 4, direction: 'up' }
      ]
    },
    // Level 4 - Complex gravity + fake blocks
    {
      name: "Level 4: Deceptive Heights",
      map: [
        "....................",
        "....................",
        "............F.......",
        "########...###.#####",
        "....................",
        "....................",
        "....................",
        ".S........FF......D.",
        "####################"
      ],
      gravityZones: [
        { x: 5, y: 0, width: 6, height: 4, direction: 'up' },
        { x: 12, y: 4, width: 6, height: 4, direction: 'down' }
      ]
    },
    // Level 5 - Multiple transitions
    {
      name: "Level 5: Zone Jumping",
      map: [
        "....................",
        "....................",
        "...........##..#....",
        "##............##....",
        "....................",
        "....................",
        "...........##.......",
        ".S........F.......D.",
        "####################"
      ],
      gravityZones: [
        { x: 4, y: 0, width: 5, height: 4, direction: 'up' },
        { x: 11, y: 0, width: 4, height: 4, direction: 'up' },
        { x: 11, y: 4, width: 4, height: 4, direction: 'down' }
      ]
    },
    // Level 6 - Narrow passages
    {
      name: "Level 6: Tight Spaces",
      map: [
        "....................",
        "....................",
        ".....#........#.....",
        "#####F####..####....",
        "....................",
        "....................",
        "...........##.......",
        ".S..F.....FFF.....D.",
        "####################"
      ],
      gravityZones: [
        { x: 3, y: 0, width: 6, height: 4, direction: 'up' },
        { x: 12, y: 0, width: 5, height: 4, direction: 'up' },
        { x: 12, y: 4, width: 5, height: 4, direction: 'down' }
      ]
    },
    // Level 7 - Timing and precision
    {
      name: "Level 7: Precision",
      map: [
        "....................",
        "....................",
        "........#..#...#....",
        "####....#..#...#....",
        "....................",
        "....F..#..#...#.....",
        "....F..#..#...#.....",
        ".S.....#..#.......D.",
        "####################"
      ],
      gravityZones: [
        { x: 5, y: 0, width: 3, height: 4, direction: 'up' },
        { x: 9, y: 0, width: 3, height: 4, direction: 'up' },
        { x: 13, y: 0, width: 3, height: 4, direction: 'up' },
        { x: 5, y: 4, width: 3, height: 4, direction: 'down' },
        { x: 9, y: 4, width: 3, height: 4, direction: 'down' },
        { x: 13, y: 4, width: 3, height: 4, direction: 'down' }
      ]
    },
    // Level 8 - Maze-like with fake blocks
    {
      name: "Level 8: Gravity Maze",
      map: [
        "....................",
        "....................",
        ".......F#......#....",
        "####...##......##...",
        "....................",
        ".......#......#.....",
        "....F..##....##.....",
        ".S.....F........#.D.",
        "####################"
      ],
      gravityZones: [
        { x: 5, y: 0, width: 4, height: 4, direction: 'up' },
        { x: 11, y: 0, width: 4, height: 4, direction: 'up' },
        { x: 5, y: 4, width: 4, height: 4, direction: 'down' },
        { x: 11, y: 4, width: 4, height: 4, direction: 'down' }
      ]
    },
    // Level 9 - Advanced deception
    {
      name: "Level 9: False Floors Everywhere",
      map: [
        "....................",
        "....................",
        "...#.....#....#.....",
        "##F#.....#....#.....",
        "....................",
        "...F....#....#......",
        "...#....F....F......",
        ".S.......F.........D",
        "####################"
      ],
      gravityZones: [
        { x: 4, y: 0, width: 4, height: 4, direction: 'up' },
        { x: 10, y: 0, width: 4, height: 4, direction: 'up' },
        { x: 15, y: 0, width: 4, height: 4, direction: 'up' },
        { x: 4, y: 4, width: 4, height: 4, direction: 'down' },
        { x: 10, y: 4, width: 4, height: 4, direction: 'down' },
        { x: 15, y: 4, width: 4, height: 4, direction: 'down' }
      ]
    },
    // Level 10 - Chapter finale
    {
      name: "Level 10: Gravity Master",
      map: [
        "....................",
        "....................",
        "..#..#....#..#....#.",
        "##F..#....F..#....F.",
        "....................",
        "..F..#....#..F....#.",
        "..#..F....#..#....#.",
        ".S.........F......D.",
        "####################"
      ],
      gravityZones: [
        { x: 3, y: 0, width: 3, height: 4, direction: 'up' },
        { x: 8, y: 0, width: 3, height: 4, direction: 'up' },
        { x: 13, y: 0, width: 3, height: 4, direction: 'up' },
        { x: 17, y: 0, width: 3, height: 4, direction: 'up' },
        { x: 3, y: 4, width: 3, height: 4, direction: 'down' },
        { x: 8, y: 4, width: 3, height: 4, direction: 'down' },
        { x: 13, y: 4, width: 3, height: 4, direction: 'down' },
        { x: 17, y: 4, width: 3, height: 4, direction: 'down' }
      ]
    }
  ],
  bonusLevel: {
    name: "Bonus: Gravity Chaos",
    description: "Ultimate gravity zone mastery",
    map: [
      "....................",
      "....................",
      ".#.#.#.#.#.#.#.#.#..",
      "FFFFFFFFFFF.#.#.#.#.",
      "....................",
      ".F.F.F.F.#.#.#.F.#..",
      ".#.#.#.F.F.F.F.#.F..",
      ".S.F.F.F.F.F.F.F..D.",
      "####################"
    ],
    gravityZones: [
      { x: 2, y: 0, width: 2, height: 4, direction: 'up' },
      { x: 5, y: 0, width: 2, height: 4, direction: 'up' },
      { x: 8, y: 0, width: 2, height: 4, direction: 'up' },
      { x: 11, y: 0, width: 2, height: 4, direction: 'up' },
      { x: 14, y: 0, width: 2, height: 4, direction: 'up' },
      { x: 17, y: 0, width: 2, height: 4, direction: 'up' },
      { x: 2, y: 4, width: 2, height: 4, direction: 'down' },
      { x: 5, y: 4, width: 2, height: 4, direction: 'down' },
      { x: 8, y: 4, width: 2, height: 4, direction: 'down' },
      { x: 11, y: 4, width: 2, height: 4, direction: 'down' },
      { x: 14, y: 4, width: 2, height: 4, direction: 'down' },
      { x: 17, y: 4, width: 2, height: 4, direction: 'down' }
    ]
  }
};
