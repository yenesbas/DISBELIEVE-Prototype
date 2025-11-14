# Debug Mode and Level Design Tips

## Debug Mode
- Set `DEBUG_MODE = true` (line 170) to see yellow trigger lines in-game.
- Press `T` during gameplay to toggle debug mode on/off.
- Trigger info is **always displayed** below the canvas (shows offset for each spike).
- **Format**: `[Spike#: -X tiles STATUS]` where:
  - `○` = not triggered yet.
  - `→` = currently moving.
  - `✓` = finished moving.

## Tips for Level Design
1. Each row must be exactly **20 characters** (one tile = one character).
2. Use **6 rows** for standard level height (480px canvas).
3. Make sure spikes have room to move right (check for empty space).
4. Place the door `D` at the end of your level as the goal.
5. Start simple - test your level to make sure it's possible!
6. Use `1` spikes for small gaps, `3` or `4` for long jumps.
7. Use `F` for fake blocks - they look solid but aren't! Great for deception!
8. Use `I` for invisible platforms - they're solid but completely invisible! Players must discover them through trial and experimentation!
9. Mix `F` and `I` for maximum confusion - fake visible vs real invisible!
10. **Debug Mode**: Set `DEBUG_MODE = true` to see invisible platforms as cyan!

## Keyboard Shortcuts (Actual Game)
- **Arrow keys / A/D**: Move left/right
- **Space / W / Up Arrow**: Jump
- **R**: Restart level
- **ESC**: Open/close menu, go back in menus
- **T**: Toggle debug mode (if enabled)
- **Number keys (1-9, 0)**: Quick select levels in level select screen
- **B**: Quick select bonus level in level select screen
- **Number keys (1-9)**: Quick select chapters in chapter select screen

## Example Level
```javascript
const levels = [
  {
    name: "My Custom Level",
    map: [
      "....................",  // Row 0 (top)
      "..................D.",  // Door on top platform
      "........##........##",  // Platform with door
      "####..............##",  // Left starting platform
      "...#..1...2....FF###",  // Spikes: 1 and 2, fake blocks: FF
      "...#####I..#########"   // Row 5 (bottom) with invisible platform: I
    ],
    spikeTriggers: [3, 1],  // OPTIONAL: First spike trigger at 3 tiles left, second at 1 tile left
    spikeTriggerLengths: [80, -120]  // OPTIONAL: 80 = 80px UP, -120 = 120px DOWN from spike top
                            // If omitted or null, spike uses full-height trigger
  }
];
```

## Adding a New Level
Scroll down to the `levels` array and add your level like this:

```javascript
{
  name: "Level 4: Your Name Here",
  map: [
    "your level design...",
    "...goes here........",
    // ... 6 rows total
  ]
}
```