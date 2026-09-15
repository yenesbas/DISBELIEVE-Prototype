# The Level Editor

Open the game, pick **MY LEVELS** in the main menu, then **+ NEW LEVEL**.

Everything in a level is built by hand on the map itself. Nothing is typed into
a number box - you drag the trap until it looks right, press TEST PLAY, and
adjust.

---

## Unlocking it

**MY LEVELS** is visible from the start but stays locked until you have earned
it. You need to:

- finish **every level of every chapter** (bonus levels do not count), and
- hold a **two-star average** across all of them.

With three full chapters of ten levels that is 30 levels and 60 of the 90
possible stars. The main menu shows exactly how many levels and stars you still
need, so you can see yourself getting closer.

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
| SHIFT+F | Fullscreen, same as the FULL button in the bottom bar (plain F paints fake blocks) |
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
| `K` | Spike | A trap that shoots off in any of eight directions when triggered |
| `G` | Gravity | A zone that flips gravity |
| `S` | Spawn | Where the player starts (one per level) |
| `D` | Door | The exit (one per level) |
| `X` | Eraser | Clears tiles |

Fake, hidden and crumbling tiles are labelled in the editor (`FAKE`, `HID`,
`CRUMB`) so you can tell them apart. Press TAB to see the level without those
labels - that view is what the player gets.

---

## Spike traps - the part you drag

Place a spike and it is selected immediately. Everything about the trap is then
dragged straight on the map:

```
     the trigger                the spike          the ghost
     (drag it anywhere,         (drag it to        (drag it to aim
      drag either O to           another tile)      and to set range)
      resize it)
          O-------+                  ###                - - -
          |       |                  ###    - - - >     - - -
          |       |
          +-------O
```

**Red ghost** - drag it to set how far the spike travels (0 to 9 tiles) **and
which way it goes**. Drop it above the spike and the spike shoots up; drop it
down and to the left and it shoots down-left. Eight directions in all. A range
of `0` means the spike never moves and has no trigger.

**Yellow trigger** - drag its body to move it **anywhere on the map**. It does
not have to sit next to the spike any more: put it across a doorway, under a
jump, or on the far side of the level.

**The two round handles** - one sits where the trigger starts (top-left), the
other where it ends (bottom-right). Drag them to set its size:

- Pull the end handle sideways and the line becomes a **box** - the player only
  sets it off by standing inside it.
- Pull the end handle back onto the start and the box collapses into the
  classic thin line.
- Press `H` to snap the trigger back to a full-height line, or `H` again to cut
  it down to a short one.

**The spike itself** - drag it to another tile. The trigger, direction and speed
all travel with it, so a finished trap can be repositioned in one go. A spike
will not drop onto another spike, the spawn or the exit.

### Direction and speed, without dragging

While a spike is selected the tool column shows three controls:

| Control | What it does |
| --- | --- |
| **RANGE** `0-9` | How many tiles it travels |
| **DIRECTION** pad | Eight arrows - click one to aim the spike |
| **SPEED** `-` / `+` | How fast it covers that distance |

Speed is shown both as a number and as the real dash time. `5` is the classic
0.2s snap the game has always used. Turn it down to `1` and the spike creeps
across so the player can watch it coming and try to outrun it; turn it up to
`20` and it is there before they can react.

Set these **before** placing a spike and every new spike gets them, so a whole
row of upward spikes takes one click each.

| Key | While a spike is selected |
| --- | --- |
| `0`-`9` | Range |
| `R` / `SHIFT+R` | Rotate the direction one step |
| `-` / `+` | Slower / faster |
| `H` | Full-height trigger on / off |
| Arrow keys | Move the trigger (`SHIFT` = half a tile) |
| `ALT` + arrows | Resize the trigger |
| `DELETE` | Remove the spike |

While dragging: nothing held snaps to 10px, `SHIFT` snaps to half a tile, and
`ALT` turns snapping off completely.

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
  spikeTriggerAreas: [ null, { x: -120, y: -60, w: 90, h: 100 } ],
  spikeDirections: [ "right", "upLeft" ],  // one of eight, default "right"
  spikeSpeeds: [ 5, 1 ],                   // dash takes 1 / speed seconds
  visualStyle: "default" | "neon" | "sketch"
}
```

`spikeTriggerAreas` is the free-form trigger rectangle, in pixels relative to
the spike's own tile. It is only written for spikes whose trigger was actually
reshaped - a trigger that still fits the old line format keeps saving as
`spikeTriggers` + `spikeTriggerLengths`, so levels stay readable and older
copies of the game can still play them.

So a level built in the editor can be pasted straight into
`src/levels/chapter_*.js`, and a chapter level can be pasted into a custom level
file and opened in the editor.

The editor keeps spike settings keyed by tile position and only flattens them
into those arrays on save, which is why adding a spike in the middle of a
level never shifts anyone else's trigger.

Files:

- `level_storage.js` - localStorage saving, validation, import/export
- `editor.js` - the editor screen and all of its interaction
- `custom_levels.js` - the My Levels browser and custom play sessions
