# Changelog

All notable changes to DISBELIEVE are recorded here.
This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Level Editor

- The editor now makes levels for the **full DISBELIEVE game**: its 32 x 18
  screen, its level format and its physics, so a level built here plays the
  same there.
- New things to build with: spikes in plain sight pointing four ways, hidden
  **trap spikes** (eight directions, creep / fast / snap, a delay, a reach),
  **sliding spikes** that dash when triggered, **gravity up / down** zones,
  **flip zones** with a wait, **decoy doors**, **hint text** that can wait for
  deaths, and crumbling blocks that can come back.
- **Traps**: spikes that fire together, with one or more triggers - boxes or
  lines, hidden or visible, on or off. Each trap has its own color and number.
- **Share** a level as a code (or a link when the game runs from a web page);
  **LOAD CODE** in My Levels reads codes from friends and from the full game.
  Opening a share link plays its level straight away.
- Exported files are now level packs in the full game's format.
- Levels made with the first editor are moved into the bigger screen
  automatically; old level files still import.
- MY LEVELS is now for level creators: it only appears in the main menu once
  the developer cheat code is typed, instead of unlocking through the chapters.

### Fixes

- SETTINGS opened from the pause menu of a custom level no longer loses the
  level.

## [v1.0.0] - 2026-09-15

The first packaged release of the DISBELIEVE prototype. Everything below is
playable today by opening `play.html` in a browser - no install, no build step,
no external libraries.

### Levels

- **Chapter 1: First Deceptions** - 10 levels plus an Ultimate Challenge bonus level.
- **Chapter 2: Advanced Illusions** - 10 levels plus an Ultimate Challenge bonus level,
  built around invisible walls and inverted gravity.
- **Chapter 3: Sketched Reality** - 3 levels plus a Sketch Master bonus level,
  where the world is drawn in pencil and can be erased. More levels to come.

23 main levels and 3 bonus levels in total.

### Gameplay

- Deceptive traps: fake platforms that look solid, invisible blocks that are,
  and crumbling ground that gives way under you.
- Spikes that fire in any of **eight directions**, at any speed from a slow
  creep to an instant snap.
- Triggers that can sit anywhere on the map, as a line or as a box.
- Coyote time on jumps, instant respawn, and a per-level death counter.
- A three-star rating per level based on how few deaths it takes.

### Level Editor

- A full in-game editor behind **MY LEVELS** in the main menu, unlocked by
  clearing every chapter with a two-star average.
- Traps are built by hand on the map - drag a spike's ghost to aim it, drag its
  handles to place and shape the trigger, and drag the spike to move the whole
  trap at once. No number boxes anywhere.
- Paint platforms, fake blocks, invisible blocks and crumbling blocks by
  dragging, or hold SHIFT to fill a rectangle.
- **TEST PLAY** at any moment, ESC straight back to building.
- Export a level to a file to share it, and import levels from others.
- Custom levels are saved in the browser and keep their own death records.
- Player-made levels use the same format as the built-in chapters, so a level
  can be moved between the editor and a chapter file by copy and paste.

### Presentation

- One animated menu style across every screen.
- Fullscreen on the **F** key, remembered between sessions, and also available
  from SETTINGS and the pause menu.
- The game is drawn in a fixed 1200x720 space and scaled to fill the window at
  the display's own pixel density, so it stays sharp at any size.
- Atmospheric music and sound effects across menus, deaths and chapter endings.

### Technical

- Pure JavaScript and HTML5 Canvas with a custom physics engine.
- Zero dependencies and no build tooling.

[v1.0.0]: https://github.com/yenesbas/DISBELIEVE-Prototype/releases/tag/v1.0.0
