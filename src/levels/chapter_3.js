// Chapter 3: Sketch Deceptions
// Hand-drawn aesthetic with advanced deceptions

const chapter3 = {
  name: "Chapter 3: Sketch Deceptions",
  description: "Nothing is as it seems in the sketches",
  visualStyle: "sketch", // Hand-drawn sketch aesthetic
  levels: [
    // Level 1 - Introduction
    {
      name: "Level 1: Sketchy Beginning",
      map: [
        "....................",
        "....................",
        "....................",
        "....................",
        "....................",
        "....................",
        ".S................D.",
        "###...............##",
        "...#...F.....#######",
        "....######.#........"
      ]
    },
    // Level 2 - More complexity
    {
      name: "Level 2: Drawn Deceptions",
      map: [
        "....................",
        "....................",
        "....................",
        "....................",
        "....................",
        ".S..................",
        "####..1.............",
        "........F...F.....D.",
        ".....###############"
      ],
      spikeTriggers: [-2]
    },
    // Level 3 - Advanced
    {
      name: "Level 3: Sketch Master",
      map: [
        "....................",
        "....................",
        "....................",
        "....................",
        "........#...........",
        ".S......#...........",
        "###.....##..........",
        "........#....2....D.",
        "###########FF.######"
      ],
      spikeTriggers: [-3]
    }
  ],
  bonusLevel: {
    name: "Bonus: Sketch Chaos",
    description: "Master the art of sketchy deception",
    map: [
      "....................",
      "....................",
      "....................",
      ".S...1..............",
      "#####.####..FF######",
      "....................",
      "....................",
      ".......2...3......D.",
      "####################"
    ],
    spikeTriggers: [-1, -3, -2]
  }
};
