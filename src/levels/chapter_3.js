// Chapter 3: Sketched Reality
// Hand-drawn sketch aesthetic

const chapter3 = {
  name: "Chapter 3: Sketched Reality",
  description: "Where drawings come to life",
  visualStyle: "sketch", // Used for rendering
  levels: [
    {
      name: "Level 1: Pencil Marks",
      map: [
        "....................",
        "....................",
        "....................",
        "....................",
        "....................",
        ".S..................",
        "####EEEFFF..........",
        "..........EEE.......",
        ".............###E...",
        "................F#D#",
        "..................##"
      ],
      spikeTriggers: [-2]
    },
    {
      name: "Level 2: Erased Path",
      map: [
        "....................",
        "....................",
        "....................",
        "..........I.........",
        ".S........I.........",
        "EEE.......I.........",
        "...EEE..EE..........",
        ".........000........",
        ".........###........",
        "....................",
        "..................D.",
        "...I.....I####FF#####"
      ]
    },
    {
      name: "Level 3: Disappearing Act",
      map: [
        "EEEEEEEEEEE...#FF##G",
        ".S..................",
        "EE0000000........F..",
        "..#######00......#..",
        "..##G#G####......#..",
        "Gg#######........#..",
        "gg##000##........#..",
        "F########........#..",
        "....................",
        "....................",
        "0D..0..0..00........",
        "########.######FFFEE"
      ]
    }
  ],
  bonusLevel: {
    name: "Bonus: Sketch Master",
    description: "Navigate the artist's nightmare",
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
};

/* Total Deaths in Chapter 1
* MH: 121 (Level 10 rage quit)
* Serkan: 85 (Level 9 rage quit)
* Serhat Abi: 130 (Level 10 rage quit)
* Kadir Ihsan: 112 Chapter 1 complete
*/
