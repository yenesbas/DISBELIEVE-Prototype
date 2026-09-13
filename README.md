# DISBELIEVE - A Deceptive 2D Platformer (Prototype)

> **🚧 Prototype Version**: This is the initial prototype of DISBELIEVE, demonstrating core gameplay mechanics and level design concepts. Expect further development and improvements in future versions!

Welcome to DISBELIEVE, a mind-bending 2D platformer where nothing is as it seems! Can you navigate through increasingly deceptive levels filled with traps?

![Game Title Screen](screenshots/title.png)

## 🎮 Play the Game

1. Clone this repository
2. Open `play.html` in your web browser
3. Trust nothing, question everything!

## 📸 Screenshots

Here's what awaits you in DISBELIEVE:

![Gameplay Screenshot 1](screenshots/gameplay1.png)

![Gameplay Screenshot 2](screenshots/gameplay2.png)

## 🎯 How to Play

- **Move:** ← / → arrows or A / D keys
- **Jump:** Space or W key
- **Restart Level:** R key
- **Return to Menu:** ESC key

## 🛠 Build Your Own Levels

DISBELIEVE ships with a full level editor. Pick **MY LEVELS** in the main menu.

Traps are built by hand, right on the map - there is not a single number box in
the editor:

- **Paint** platforms, fake blocks, invisible blocks and crumbling blocks by
  dragging the mouse (hold SHIFT to fill a rectangle).
- **Drop a spike**, then drag its *ghost* to set how far it shoots, drag its
  *yellow line* to set where the player sets it off, and drag the *round handle*
  to set how tall that trigger is.
- **TEST PLAY** the level at any moment, then ESC straight back to building.
- **Export** a level to a file and send it to a friend, or **import** theirs.

Your levels are saved in the browser and keep their own death records. Full
instructions: [`src/editor/EDITOR_GUIDE.md`](src/editor/EDITOR_GUIDE.md)

## 🏆 Features

- Increasingly challenging levels
- Deceptive traps and moving spikes
- Fake platforms that look solid but aren't
- A level editor with drag-to-tune traps, plus level sharing
- Death counter to track your attempts
- Atmospheric sound effects and music
- Instant respawn system

## 💀 Warning

Things are not always what they seem. Trust your instincts, but be prepared to...
# DISBELIEVE

## 🔧 Technical Details

- Pure JavaScript and HTML5 Canvas
- No external libraries required
- Responsive design
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
