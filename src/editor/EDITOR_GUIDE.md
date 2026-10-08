# The Level Editor

Open the game, pick **MY LEVELS** in the main menu, then **+ NEW LEVEL**.

Levels made here are levels for the **full DISBELIEVE game**: the same screen
(32 x 18 tiles, one 1920 x 1080 screen), the same kinds of blocks, spikes and
zones, the same level format and the same physics. A level that works here
works there, frame for frame.

Everything in a level is built by hand on the map itself. You drag a trap until
it looks right, press TEST PLAY, and adjust.

---

## Opening it

The editor is for level creators. **MY LEVELS** only appears in the main menu
once the developer cheat code has been typed on the main menu (it also unlocks
every level and look). Typing the code again turns developer mode off and
resets progress. Developer mode lasts until the page is closed or reloaded;
the levels you made stay saved.

---

## Building the map

| Action | What it does |
| --- | --- |
| Left click / drag | Paint with the selected tool |
| Right click / drag | Erase (works no matter which tool is selected) |
| SHIFT + drag | Fill (or erase) a whole rectangle |
| TAB | Preview: hides every editor marker so you see exactly what the player sees |
| CTRL+Z / CTRL+Y | Undo / redo |
| SHIFT+F | Fullscreen, same as the FULL button in the bottom bar (plain F paints fake blocks) |
| CTRL+S | Save |
| ENTER | Test play |
| ESC | Stop drawing a trigger, then drop the pick, then back (offers to save first) |
| ? | Help |

### Tools

| Key | Tool | In game |
| --- | --- | --- |
| `V` | Select | Pick a trap, a flip zone or a hint to change it; drag the start, the door and decoy doors |
| `X` | Erase | Clears tiles, doors, spikes, flip zones and hints |
| `B` | Solid | Ground |
| `F` | Fake | Looks exactly like ground, the square falls straight through it |
| `I` | Invisible | Empty air that is secretly solid; it shows faintly once touched |
| `C` | Crumble | Holds for 0.6 s once the square lands on it, then falls |
| `K` | Spikes | Spikes in plain sight, pointing up, right, down or left (`R` turns them) |
| `T` | Trap spike | A hidden spike that shoots out when its trap fires |
| `L` | Sliding spikes | Spikes in plain sight that dash somewhere when their trap fires |
| `U` | Gravity up | A cyan zone: gravity flips up as the square enters it |
| `N` | Gravity down | A magenta zone: gravity turns back down |
| `G` | Flip zone | Flips gravity whichever way it is, every time the square enters it |
| `S` | Start | Where the square appears (one per level) |
| `D` | Door | The exit (one per level). On a floor, or under a ceiling to hang upside down |
| `O` | Decoy door | Looks exactly like the exit. It kills |
| `H` | Hint text | Words on the level; they can wait for a number of deaths |

Fake blocks, invisible blocks and decoy doors are marked in the editor so you
can tell them apart. Press TAB to see the level the way the player gets it.

The **Crumble** tool's panel also sets whether fallen blocks **come back**
(never, or after 1, 2, 3.5 or 5 seconds) - for the whole level.

---

## Traps - the part you drag

A **trap** is everything that fires together, and what fires it: one or more
trap spikes and sliding spikes, and one or more triggers. Every trap has its own
color and number, and a dashed line runs from each of its triggers to each of
its spikes.

**A trap spike** - pick the Trap spike tool, press a tile and drag toward where
it should shoot (eight directions). Let go, and drag again to draw the
**trigger** that fires it. A trigger is a box the square has to touch, or (with
"Trigger shape: line") a line it has to cross. Right-click or ESC skips the
trigger for now; the bar under the map reminds you that the trap never fires.

A trap spike can sit inside a solid block - it bursts out of the wall.

**Sliding spikes** - pick the Sliding spikes tool, press a tile and drag to
where they should dash, then draw the trigger.

**SELECT** (`V`) changes a trap: click one of its spikes or triggers to pick it.

- Drag a spike to another tile, or a trigger anywhere on the map.
- Drag the small square at a trigger's corner to resize it.
- Arrow keys move the picked trigger; ALT + arrow keys resize it.
- `R` / `SHIFT+R` turns the picked trap spike an eighth of a turn.
- `DELETE` removes the picked part. A trap goes when its last spike does.

### The panel under the palette

With a trap picked:

| Control | What it does |
| --- | --- |
| **Speed** | Creep (you can outrun it), Fast, or Snap |
| **Delay** | How long after the trigger the spikes shoot (0 to 0.5 s) |
| **Reach** | How far trap spikes fly: until they hit a wall, or 1 to 5 tiles |
| **Dash** | How long sliding spikes take to dash (0.2 to 2 s) |
| **Trigger** | On, or off (kept, but never fires) |
| **Visible** | Hidden triggers are never drawn; visible ones pulse until they fire |
| **New triggers** | Box or line |
| **+ Spikes** | Spikes you place now join this trap and fire with it |
| **+ Trigger** | Draw another trigger for this trap: any of them fires it |

Set these with the Trap spike or Sliding spikes tool before placing, and every
new trap gets them.

---

## Flip zones and hints

**Flip zone** (`G`): drag a rectangle. With it picked, the panel sets the wait
between two flips. Drag it to move it, drag its corner to size it.

**Hint text** (`H`): click where it goes and type it. `{move}` and `{jump}` show
the keys. The panel sets its size and when it shows: always, after 1, 2, 3 or 5
deaths, or only before the first death.

---

## Saving and sharing

Levels are saved in your browser (localStorage), so they stay on the computer
you built them on. Levels made with the first version of this editor (20 x 12)
are moved into the bigger screen automatically, in its bottom left corner; test
them again, the physics changed a little.

- **SHARE** (in the editor, or on a level card) copies a **share code** - or,
  when the game runs from a web page, a link that opens the level.
- **LOAD CODE** in My Levels pastes a code or link in as a new level. Codes
  from the full game work too.
- **EXPORT** (`↑` on a level card) writes a `.disbelieve.json` file; **EXPORT
  ALL** writes every level in one file. **IMPORT** loads them (and files from
  the first version of the editor).

Custom levels have their own death and time records. They never touch chapter
progress or unlocks.

---

## Into the full game

A share code goes into the full game's **My levels → Load from code**, as it is.

An exported file is a level pack's JSON - exactly what sits inside
`LEVEL_PACK( ... )` in the full game's `levels/*.js`:

```js
{
  "format": 3,
  "levels": [
    {
      "id": "p-mfz1k2ab",                 // unique per level
      "name": "My Level",
      "style": "neon",                     // gray | neon | paper (CLASSIC / NEON / SKETCH here)
      "tiles": { "solid": [[0, 15, 32, 3]], "fake": [[12, 15, 2, 1]] },
      "start": [2, 14],
      "door": [28, 14],
      "traps": [
        { "spikes": [{ "c": 10, "r": 14, "dir": "up", "speed": 900 }],
          "triggers": [{ "c": 7, "r": 10, "w": 2, "h": 5 }] }
      ]
    }
  ]
}
```

To add levels to the full game, copy them into the `"levels"` list of its
`levels/drafts.js`, then open the makers' editor and move them into a chapter.
The full format is described at the top of `levelkit.js`.

Files:

- `levelkit.js` - the full game's level format, share codes and physics
- `level_play.js` - drawing those levels and playing them
- `level_storage.js` - localStorage saving, validation, import/export
- `editor.js` - the editor screen and all of its interaction
- `custom_levels.js` - the My Levels browser and custom play sessions
