# How to Build Your Own Levels

> **Building a level as a player?** Use the in-game editor instead: main menu ->
> **MY LEVELS**. It does everything described below by dragging, and it writes
> this exact format. See [`editor/EDITOR_GUIDE.md`](editor/EDITOR_GUIDE.md).
>
> This document describes the level format itself, for levels written by hand
> into `src/levels/chapter_*.js`.

## Level Map Characters
- `.`  = Empty space (air)
- `#`  = Ground/Platform (solid block - player collides with it)
- `F`  = Fake block (looks like ground but player passes through it!)
- `I`  = Invisible platform (solid collision but completely invisible!)
- `E`  = Crumbling platform (falls away shortly after the player stands on it)
- `G` / `g` = Gravity zone tile (connected tiles form one flip zone)
- `S`  = Spawn Point (player starting position)
- `D`  = Door (level exit - player must reach this to complete)
- `1`  = Spike that moves 1 tile  (40px) when triggered
- `2`  = Spike that moves 2 tiles (80px) when triggered
- `3`  = Spike that moves 3 tiles (120px) when triggered
- `4`  = Spike that moves 4 tiles (160px) when triggered
- `^`  = Spike that moves 2 tiles (same as `2`, for backward compatibility)
- `0-9` = Spike that moves 0-9 tiles (new: any digit for custom spike movement)

## Spike Behavior
- Spikes are triggered when the player enters an **invisible trigger**.
- By default that trigger is a vertical line positioned to the spike's **left**.
- Once triggered, they rapidly move by their specified distance - to the right
  unless the level says otherwise.
- `1` = short movement (easier to avoid, good for beginners).
- `4` = long movement (very dangerous, creates big traps).
- Mix different spike types to create varied difficulty!
- You can now use any digit (0-9) for custom spike movement distance.

## Spike Direction (`spikeDirections`)
- By **default** every spike shoots to the **right**.
- **Format**: `spikeDirections: ['right', 'up', 'downLeft', ...]`
- The eight directions are:
  `right`, `left`, `up`, `down`, `upRight`, `upLeft`, `downRight`, `downLeft`.
- A diagonal spike travels the same total distance as a straight one, so a
  `3` shooting `upRight` covers 3 tiles along the diagonal.
- Anything the game does not recognise falls back to `right`, and a missing
  entry means `right` too - so old levels never change.

## Spike Speed (`spikeSpeeds`)
- By **default** every spike takes **0.2 seconds** to cover its distance
  (speed `5`), whatever that distance is.
- **Format**: `spikeSpeeds: [5, 1, 12, ...]` - one entry per spike.
- The dash takes `1 / speed` seconds: `1` is a slow, readable creep,
  `5` is the classic snap, `20` is practically instant.
- Allowed range is `0.5` to `20`; anything outside is clamped.
- A slow spike is a completely different trap from a fast one: the player can
  see it coming and has to outrun it.

## Free-form Triggers (`spikeTriggerAreas`)
- `spikeTriggers` + `spikeTriggerLengths` can only describe a vertical line
  anchored to the spike. For a trigger that sits **anywhere** on the map, or
  one that is a **box** instead of a line, use `spikeTriggerAreas`.
- **Format**: `spikeTriggerAreas: [{ x, y, w, h }, null, ...]`
- All four numbers are **pixels relative to the spike's own tile** (its
  top-left corner), so the trap keeps its shape if the spike is moved.
  - `x`, `y` = where the trigger starts.
  - `w`, `h` = how big it is. `w: 0` is a bare vertical line.
- When an entry is given, it **overrides** `spikeTriggers` and
  `spikeTriggerLengths` for that spike. `null` (or a missing entry) means
  "use the classic line", which is what every old level does.
- **Example**: `spikeTriggerAreas: [{ x: -180, y: -240, w: 120, h: 180 }]`
  puts a 120x180px trigger box 3 tiles left and 4 tiles above the spike - so
  only a player who jumps up there sets the trap off.

## Trigger Line Positions
- By **default**, the trigger line is 2 tiles (80px) to the **left** of each spike.
- You can customize trigger positions in the level's `spikeTriggers` array.
- **Format**: `spikeTriggers: [tileOffset1, tileOffset2, ...]`
- **Example**: `spikeTriggers: [3, 1, 4]` means:
  - First spike: trigger 3 tiles to the left.
  - Second spike: trigger 1 tile to the left.
  - Third spike: trigger 4 tiles to the left.

## Trigger Line Lengths (Vertical)
- By **default**, trigger lines extend the **full height** of the screen.
- You can limit trigger length using the `spikeTriggerLengths` array.
- **Format**: `spikeTriggerLengths: [length1, length2, ...]`
- Length is in pixels (use `TILE_SIZE` multiples: 40, 80, 120, etc.).
- **Positive values** extend **upward** from the spike top.
- **Negative values** extend **downward** from the spike top.
- **Example**: `spikeTriggerLengths: [80, -120, 40]` means:
  - First spike: trigger line goes 80px **up** from spike top.
  - Second spike: trigger line goes 120px **down** from spike top.
  - Third spike: trigger line goes 40px **up** from spike top.
- If omitted or `null`, that spike uses a full-height trigger.
- Ignored for any spike that has a `spikeTriggerAreas` entry.

## Putting It Together

```js
{
  name: "Level 4: Ambush",
  map: [ ... "....3.....2....." ... ],
  spikeDirections: ['up', 'downLeft'],          // first shoots up, second down-left
  spikeSpeeds: [1, 20],                          // first creeps, second is instant
  spikeTriggerAreas: [
    { x: -120, y: -180, w: 180, h: 120 },        // a box above and left of the spike
    null                                          // second one keeps the classic line
  ],
  spikeTriggers: [0, -2],                        // only the second one uses this
  spikeTriggerLengths: [null, 120]               // only the second one uses this
}
```

All five spike arrays are indexed the same way: **reading order of the map**,
left to right, top to bottom. A missing entry always means "the classic
default", so none of these arrays are required.

## Keyboard Shortcuts (Actual Game)
- **Arrow keys / A/D**: Move left/right
- **Space / W / Up Arrow**: Jump
- **R**: Restart level
- **ESC**: Open/close menu, go back in menus
- **T**: Toggle debug mode (if enabled)
- **Number keys (1-9, 0)**: Quick select levels in level select screen
- **B**: Quick select bonus level in level select screen
- **Number keys (1-9)**: Quick select chapters in chapter select screen