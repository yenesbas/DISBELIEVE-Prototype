# DISBELIEVE - A Deceptive 2D Platformer (Prototype)

> **🚧 Prototype Version**: This is the initial prototype of DISBELIEVE, demonstrating core gameplay mechanics and level design concepts. Expect further development and improvements in future versions!

Welcome to DISBELIEVE, a mind-bending 2D platformer where nothing is as it seems! Can you navigate through increasingly deceptive levels filled with traps?

![Game Title Screen](screenshots/title.png)

## 🎮 Play the Game

**Latest release: [v1.0.0](https://github.com/yenesbas/DISBELIEVE-Prototype/releases/latest)**
- Download [`releases/DISBELIEVE-v1.0.0.zip`](releases/DISBELIEVE-v1.0.0.zip), unzip it,
  and open `play.html` - or grab the same zip from the
  [releases page](https://github.com/yenesbas/DISBELIEVE-Prototype/releases/latest).
- Or clone this repository and open `play.html` directly.

There is no install and no build step. Click the page once when it loads so the
browser allows audio, then trust nothing and question everything.

What is in this release: [`CHANGELOG.md`](CHANGELOG.md)

## 📸 Screenshots

Here's what awaits you in DISBELIEVE:

![Gameplay Screenshot 1](screenshots/gameplay1.png)

![Gameplay Screenshot 2](screenshots/gameplay2.png)

## 🎯 How to Play

- **Move:** ← / → arrows or A / D keys
- **Jump:** Space or W key
- **Restart Level:** R key
- **Fullscreen:** F key (SHIFT + F in the level editor, where F paints fake blocks)
- **Return to Menu:** ESC key

## 🛠 Build Your Own Levels

DISBELIEVE ships with a full level editor behind **MY LEVELS** in the main menu.

**It has to be earned.** The button is there from the start but stays locked
until you finish every level of every chapter *and* hold a two-star average
across all of them - 30 levels and 60 of the 90 stars once all three chapters
are full. The menu shows how many levels and stars you still need.

Traps are built by hand, right on the map - there is not a single number box in
the editor:

- **Paint** platforms, fake blocks, invisible blocks and crumbling blocks by
  dragging the mouse (hold SHIFT to fill a rectangle).
- **Drop a spike**, then drag its *ghost* to aim it: spikes shoot in any of
  **eight directions**, not just to the right.
- **Set its speed** from a slow creep you can outrun to an instant snap.
- **Put its trigger anywhere** on the map - drag the trigger itself to move it,
  and drag either round handle to say where it starts and where it ends. Pull it
  sideways and the trigger line becomes a trigger *box*.
- **Move a finished trap** by dragging the spike; its trigger, direction and
  speed all come along.
- **TEST PLAY** the level at any moment, then ESC straight back to building.
- **Export** a level to a file and send it to a friend, or **import** theirs.

Your levels are saved in the browser and keep their own death records. Full
instructions: [`src/editor/EDITOR_GUIDE.md`](src/editor/EDITOR_GUIDE.md)

## 🏆 Features

- Increasingly challenging levels
- Deceptive traps and spikes that shoot in any of eight directions, at any speed
- Triggers that can sit anywhere on the map, as a line or as a box
- Fake platforms that look solid but aren't
- A level editor with drag-to-tune traps, plus level sharing - unlocked by
  clearing all three chapters with a two-star average
- Fullscreen on one key, remembered for next time - or from SETTINGS and the
  pause menu
- Death counter to track your attempts
- Atmospheric sound effects and music
- Instant respawn system

## 💀 Warning

Things are not always what they seem. Trust your instincts, but be prepared to...
# DISBELIEVE

## 🔧 Technical Details

- Pure JavaScript and HTML5 Canvas
- No external libraries required
- Responsive design: the game is drawn in a fixed 1200x720 space and then
  scaled to fill the window - or the whole screen in fullscreen - rendering at
  the display's own pixel density, so it is sharp at any size
- Custom physics engine
- Prototype-focused clean codebase

## 🎯 Prototype Scope

This prototype version includes:
- Core gameplay mechanics
- Basic level design system
- Essential trap mechanics
- Simple but effective visual style
- Basic sound system
- Death counter and level progression

## 📝 Development Notes

For developers interested in the technical aspects:
- All game logic is contained in `src/game.js`
- The main entry point is `play.html`
- Chapter levels live in `src/levels/chapter_*.js` - see `src/level_guide.md`
- The level editor lives in `src/editor/`:
  - `level_storage.js` - saving, validation and level sharing
  - `editor.js` - the editor screen
  - `custom_levels.js` - the "My Levels" browser and custom play sessions
- Player-made levels use the exact same format as the built-in chapters, so a
  level can be moved between the editor and a chapter file by copy/paste
