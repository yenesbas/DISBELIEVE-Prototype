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
      },
      {
        name: "Level 2: Invisible Walls",
        map: [
          "....................",
          "....................",
          "....................",
          "....................",
          "..IIIIIIIIIIIIII....",
          ".I.............I....",
          "...............I....",
          "I..............I....",
          ".S.............I.D..",
          "####..##..###..#####",
          "....................",
          "...................."
        ]
      },
      {
        name: "Level 3: Invisible Corridors",
        map: [
          "IIIIIIIIIIIIIIIIIIII",
          ".................D..",
          ".IIIIIIIIIIIIIIIIIII",
          "....................",
          "IIIIIIIIIIIIIIIIIII.",
          "....................",
          ".IIIIIIIIIIIIIIIIIII",
          "....................",
          "IIIIIIIIIIIIIIIIIII.",
          ".S..................",
          "IIIIIIIIIIIIIIIIIIII",
          "00000000000000000000"
        ]
      },
      {
        name: "Level 4: Gravity Introduction",
        map: [
          "....##...#######Gggg",
          "....................",
          "..........#.........",
          "##........#.........",
          "..........#.........",
          "...########.........",
          "..........#.........",
          "..........#.........",
          ".S........#.........",
          "##........#.........",
          "..........#.........",
          "..Gggggggg#..D......"
        ]
      },
      {
        name: "Level 5: Gravity Gauntlet",
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
        name: "Level 6: Upside Down Route",
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
        name: "Level 7: The Deception Maze",
        map: [
          "IIIIIIGg######FF##Gg",
          "............F.......",
          ".........#Gg#.......",
          "....................",
          "...IFFFFFFFFFFFFF...",
          "...I................",
          "...I0G0G0G0G0G0G0...",
          "...I#G#GFG#G#G#G#...",
          "...I................",
          "...I................",
          ".S.ID...............",
          "G####FFFFFFFFGgFFF##"
        ]
      },
      {
        name: "Level 8: Zigzag Platforms",
        map: [
          ".#....G..I.I....G...",
          ".........I..........",
          ".........I..........",
          ".........I..........",
          "....................",
          "....................",
          "....................",
          "...................D",
          ".S............I......",
          "..............I.....",
          "..............I.....",
          ".G....I....G..I...Gg"
        ]
      },
      {
        name: "Level 9: Trust No Ground",
        map: [
          ".#....G..##FF...G...",
          ".S.......#..........",
          ".........#..........",
          ".G.......#..........",
          "....................",
          ".............F......",
          "....................",
          "...................D",
          ".....................",
          ".G.G.F.G.G.#.G.G.G.G",
          ".I..................",
          "0.0.0.0.0.0.0.0.0.0."
        ]
      },
      {
        name: "Level 10: Trust No Ground",
        map: [
          "FGggggggg##....#FF.G",
          ".....3...#..........",
          ".....F...#..........",
          ".S.......#..........",
          ".........F..........",
          "....3........IIIIIII",
          "#Gggggggg#...G.G.G..",
          "....................",
          "....................",
          "...........#........",
          "....................",
          "0G0G0G0G0G0G0G0G0G0D"
        ]
      }
    ],
    bonusLevel: {
      name: "Bonus: Chapter 2 Ultimate Challenge",
      description: "Master of invisible platforms - trust nothing you can't see!",
      map: [
        "Gggggggggggggggggggg",
        "....................",
        "....................",
        "....................",
        "....................",
        "....................",
        "..S..............D..",
        "....................",
        "....................",
        "....................",
        "....................",
        "Gg#ggggggggggggggggg"
      ],
      spikeTriggers: [-2, -3],
      spikeTriggerLengths: [200, 250]
    }
};
