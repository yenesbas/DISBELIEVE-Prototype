# How to Build Your Own Levels

## Level Map Characters
- `.`  = Empty space (air)
- `#`  = Ground/Platform (solid block - player collides with it)
- `F`  = Fake block (looks like ground but player passes through it!)
- `I`  = Invisible platform (solid collision but completely invisible!)
- `S`  = Spawn Point (player starting position)
- `D`  = Door (level exit - player must reach this to complete)
- `1`  = Spike that moves 1 tile  (40px) when triggered
- `2`  = Spike that moves 2 tiles (80px) when triggered
- `3`  = Spike that moves 3 tiles (120px) when triggered
- `4`  = Spike that moves 4 tiles (160px) when triggered
- `^`  = Spike that moves 2 tiles (same as `2`, for backward compatibility)
- `0-9` = Spike that moves 0-9 tiles (new: any digit for custom spike movement)

## Spike Behavior
- Spikes are triggered when the player crosses an **invisible vertical line**.
- Each spike has a trigger line positioned to its **left**.
- Once triggered, they rapidly move to the right by their specified distance.
- `1` = short movement (easier to avoid, good for beginners).
- `4` = long movement (very dangerous, creates big traps).
- Mix different spike types to create varied difficulty!
- You can now use any digit (0-9) for custom spike movement distance.

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

## Keyboard Shortcuts (Actual Game)
- **Arrow keys / A/D**: Move left/right
- **Space / W / Up Arrow**: Jump
- **R**: Restart level
- **ESC**: Open/close menu, go back in menus
- **T**: Toggle debug mode (if enabled)
- **Number keys (1-9, 0)**: Quick select levels in level select screen
- **B**: Quick select bonus level in level select screen
- **Number keys (1-9)**: Quick select chapters in chapter select screen