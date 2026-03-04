/*
 * LEVELS.JS - Main level array that combines all chapters
 * 
 * Individual chapter definitions are loaded from:
 *   - src/levels/chapter_1.js
 *   - src/levels/chapter_2.js
 *   - src/levels/chapter_3.js
 * 
 * This file simply combines them into the chapters array
 * that game.js expects.
 */

// Combine all chapter objects into the main chapters array
const chapters = [
  chapter1,  // Chapter 1: First Deceptions
  chapter2,  // Chapter 2: Gravity Deceptions
  chapter3   // Chapter 3: Sketch Deceptions
];
