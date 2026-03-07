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
