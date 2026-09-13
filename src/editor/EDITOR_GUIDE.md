# The Level Editor

Open the game, pick **MY LEVELS** in the main menu, then **+ NEW LEVEL**.

Everything in a level is built by hand on the map itself. Nothing is typed into
a number box - you drag the trap until it looks right, press TEST PLAY, and
adjust.

---

## Building the map

| Action | What it does |
| --- | --- |
| Left click / drag | Paint with the selected tool |
| Right click / drag | Erase (works no matter which tool is selected) |
| SHIFT + drag | Fill a whole rectangle - the fast way to lay a floor |
| ALT while dragging a handle | Turn snapping off for fine tuning |
| TAB | Preview: hides every editor marker so you see exactly what the player sees |
| CTRL+Z / CTRL+Y | Undo / redo |
| CTRL+S | Save |
| ENTER | Test play |
| ESC | Back (offers to save first) |
| ? | Help |

### Tools

| Key | Tool | In game |
| --- | --- | --- |
| `V` | Select | Pick a spike to tune, or drag the spawn / door |
| `B` | Solid | A normal platform |
| `F` | Fake | Looks exactly like a platform, player falls through it |
| `I` | Hidden | Solid, but completely invisible while playing |
| `C` | Crumble | Breaks away shortly after the player stands on it |
| `K` | Spike | A trap that shoots sideways when triggered |
| `G` | Gravity | A zone that flips gravity |
| `S` | Spawn | Where the player starts (one per level) |
| `D` | Door | The exit (one per level) |
| `X` | Eraser | Clears tiles |

Fake, hidden and crumbling tiles are labelled in the editor (`FAKE`, `HID`,
`CRUMB`) so you can tell them apart. Press TAB to see the level without those
labels - that view is what the player gets.

---

## Spike traps - the part you drag

Place a spike and it is selected immediately. Three things can then be dragged:

```
        the trigger line                   the spike        the ghost
        (where the player                                   (where it
         sets it off)                                        shoots to)
              |                               ###             - - -
              |                               ###   ------>   - - -
              O  <- the round handle
                  (how tall the trigger is)
```

**Red ghost** - drag it left or right to set how far the spike travels,
0 to 9 tiles. A range of `0` means the spike never moves at all and has no
trigger; it just sits there.

**Yellow line** - drag it to choose where the player sets the trap off. Drop it
just before a jump and the spike fires late; drop it far to the left and the
player walks into a spike that is already moving. Snaps to half tiles, hold ALT
for finer steps.

**Round handle** - drag it up or down to set how tall the trigger is.

- Above the spike: only a player at that height sets it off (jumping over it).
- Below the spike: only a player underneath sets it off.
- Pull it to the very top of the map: the trigger covers the full screen height
  (this is the default). `H` snaps back to full height.

Arrow keys nudge the selected spike precisely: left/right move the trigger line,
up/down change its height. Hold SHIFT for bigger steps. DELETE removes the spike.

The exact numbers are always shown in the bar at the bottom of the editor.

---

## Gravity zones

Paint `G` tiles with the gravity tool. Tiles that touch each other become one
zone, and the editor draws the zone exactly as the game will build it - so if
the shape you paint is not a rectangle, you will see the rectangle it turns into.

---

## Saving and sharing

Levels are saved in your browser (localStorage), so they stay on the computer
you built them on.

- **EXPORT** (`↑` on a level card) writes a `.disbelieve.json` file.
- **IMPORT** loads one or more of those files - send them to a friend and they
  can play your level.
- **EXPORT ALL** backs up everything you made in one file.

Custom levels have their own death and time records. They never touch chapter
progress or unlocks.

---

## For developers

Custom levels are stored in exactly the same shape the built-in chapters use:

```js
{
  name: "My Level",
  map: [ "....................", ... ],   // 12 rows x 20 columns
  spikeTriggers: [ -0.5, 2.5 ],            // one entry per spike, reading order
  spikeTriggerLengths: [ null, 180 ],      // null = full height
  visualStyle: "default" | "neon" | "sketch"
}
```

So a level built in the editor can be pasted straight into
`src/levels/chapter_*.js`, and a chapter level can be pasted into a custom level
file and opened in the editor.

The editor keeps spike settings keyed by tile position and only flattens them
into the two arrays on save, which is why adding a spike in the middle of a
level never shifts anyone else's trigger.

Files:

- `level_storage.js` - localStorage saving, validation, import/export
- `editor.js` - the editor screen and all of its interaction
- `custom_levels.js` - the My Levels browser and custom play sessions
