// Chapter 2: Advanced Illusions
// Gravity zones with detailed visual configuration

const chapter2 = {
    name: "Chapter 2: Advanced Illusions",
    description: "Master the art of disbelief",
    visualStyle: "neon", // Neon glow aesthetic
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
        name: "Level 3: The Invisible Maze",
        map: [
          "...................D",
          "....................",
          "....................",
          "...##G..............",
          "....................",
          "#....G###....#####Gg",
          "....................",
          "#######Gg...........",
          ".S..................",
          "##..................",
          "....................",
          "...Gg.....##......Gg"
        ]
      },
      {
        name: "Level 4: The Invisible Maze",
        map: [
          ".....Gg...Ggg.......",
          "....................",
          "....................",
          "......##............",
          ".............##Ggg..",
          "........Gg..........",
          "....................",
          "....................",
          ".S...............D..",
          "##...............###",
          "...Gg...............",
          "...................."
        ]
      },
      {
        name: "Level 4: Gravity Test",
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
        spikeTriggers: [-4, -3, -2, -4, -3, -1.1, -1.2, -1.3, -4.5, -3.5, -2.6, -1.7],
        spikeTriggerLengths: [250, 250, 250, 83, 84, 85, 86, 87, 241, 242, 190, 91]
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
};
