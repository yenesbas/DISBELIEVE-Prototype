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

**It is for level creators.** MY LEVELS is not in the menu at all until the
developer cheat code is typed on the main menu; typing it again turns it off
(and resets progress). The code is not needed to play a level someone shares
as a link.

Levels built here are levels for the **full DISBELIEVE game**: the same
32 x 18 screen, the same blocks, spikes and zones, the same level format and the
same physics. A level that works here works there, frame for frame.

Traps are built by hand, right on the map:

- **Paint** solid ground, fake blocks, invisible blocks and crumbling blocks by
  dragging the mouse (hold SHIFT to fill a rectangle). Crumbling blocks can be
  set to come back after a while.
- **Spikes** in plain sight, pointing any of four ways.
- **Trap spikes** stay hidden until their trap fires: press a tile and drag to
  aim (eight directions), then drag the **trigger** that fires it - a box to
  touch or a line to cross, hidden or visible.
- **Sliding spikes** sit in plain sight and dash somewhere when triggered.
- A **trap** fires together: give it more spikes or more triggers, and set its
  speed (creep, fast, snap), delay, reach and dash from the panel.
- **Gravity** zones that pull up or down, and **flip zones** that flip gravity
  whichever way it is.
- **Decoy doors** that look exactly like the exit, and **hint text** that can
  wait for a number of deaths.
- **TEST PLAY** the level at any moment, then ESC straight back to building.
- **Share** a level as a code or a link, **load** a friend's code, or
  **export** / **import** level files.

Your levels are saved in the browser and keep their own death records. Full
instructions, including how a level gets into the full game:
[`src/editor/EDITOR_GUIDE.md`](src/editor/EDITOR_GUIDE.md)

## 🏆 Features

- Increasingly challenging levels
- Deceptive traps and spikes that shoot in any of eight directions, at any speed
- Triggers that can sit anywhere on the map, as a line or as a box
- Fake platforms that look solid but aren't
- A level editor that makes levels for the full game, with every trap it has,
  plus level sharing by code, link or file - for level creators, behind the
  developer cheat code
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
  the display's own pixel density, so it is sharp at any size; player-made
  levels are the full game's 1920x1080 screen, shown across the whole width
- Custom physics engine; player-made levels run on the full game's own physics
  at a fixed 60 steps a second
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
  - `levelkit.js` - the full game's level format, share codes and physics
  - `level_play.js` - drawing and playing those levels
  - `level_storage.js` - saving, validation and level sharing
  - `editor.js` - the editor screen
  - `custom_levels.js` - the "My Levels" browser and custom play sessions
- Player-made levels are the full game's levels (its format 3, 32 x 18 tiles)
  and run on its physics; the chapters keep this prototype's own engine and
  format
