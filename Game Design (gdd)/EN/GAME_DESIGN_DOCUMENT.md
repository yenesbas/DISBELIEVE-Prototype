# DISBELIEVE - Game Design Document

**Version:** 1.0  
**Date:** December 2025  
**Status:** Unity Development (Migration from Prototype)  
**Genre:** 2D Precision Platformer / Puzzle Platformer  
**Target Platform:** PC (Primary), Mobile (Future), Web (Possible)

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Game Overview](#game-overview)
3. [Core Gameplay Mechanics](#core-gameplay-mechanics)
4. [Level Design Philosophy](#level-design-philosophy)
5. [Progression System](#progression-system)
6. [Visual Design](#visual-design)
7. [Audio Design](#audio-design)
8. [Technical Specifications](#technical-specifications)
9. [Player Customization](#player-customization)
10. [Future Features & Roadmap](#future-features--roadmap)

---

## 1. Executive Summary

### Game Concept
**DISBELIEVE** is a deceptive 2D precision platformer where perception is your greatest enemy. Players navigate through increasingly challenging levels filled with visual tricks, hidden platforms, and deceptive obstacles. The core mantra: **"Nothing is as it seems."**

### Unique Selling Points
- **Deception-Based Gameplay**: Fake platforms, invisible walls, and visual illusions
- **Precision Platforming**: Tight controls with coyote time and responsive mechanics
- **Progressive Difficulty**: Chapter-based system with 10 regular levels + 1 bonus per chapter
- **Minimalist Aesthetic**: Clean, focused visual design that enhances the deception
- **No Punishment**: Instant respawn encourages experimentation and learning
- **Customization Rewards**: Unlock new colors and trail effects by completing chapters

### Target Audience
- **Primary**: Fans of precision platformers (Celeste, Super Meat Boy, VVVVVV)
- **Secondary**: Puzzle game enthusiasts who enjoy mind-bending mechanics
- **Age Range**: 10+ (no violent content, challenging gameplay)
- **Skill Level**: Casual to hardcore (difficulty scales across chapters)

---

## 2. Game Overview

### Core Theme
**"DISBELIEVE what you see"** - The game constantly challenges the player's perception of reality. What appears solid may be fake, what looks empty may be solid, and visual cues are deliberately misleading.

### Story/Narrative
*Minimal narrative approach - the gameplay IS the story*

The player is trapped in a world where reality breaks down. Each chapter represents a deeper descent into a realm where physical laws and visual perception cannot be trusted. The only way out is to question everything and reach the green door.

### Victory Condition
- **Per Level**: Reach the green door exit
- **Per Chapter**: Complete all 10 regular levels (bonus optional)
- **Overall**: Complete all Chapters (currently 2 chapters, expandable)

### Game Loop
1. **Select Chapter** → Select Level
2. **Attempt Level** → Die and learn patterns
3. **Master Level** → Reach door with minimal deaths
4. **Earn Stars** → Based on death count (0 deaths = 3 stars, 3+ = 2 stars, 10+ = 1 star) - numbers may vary based on average
5. **Unlock Progress** → New levels, chapters, and customization options
6. **Repeat** → Master increasingly complex challenges

---

## 3. Core Gameplay Mechanics

### 3.1 Player Movement

#### Basic Controls
| Input | Action |
|-------|--------|
| **← / → or A / D** | Move left/right |
| **Space or W** | Jump |
| **R** | Restart level instantly |
| **ESC** | Pause menu / Return to menu |

#### Movement Physics
- **Move Speed**: 380 units/second
- **Gravity**: 3150 units/second² (1.5x standard for faster gameplay)
- **Jump Force**: -1050 units/second (1.25x standard)
- **Coyote Time**: 100ms grace period to jump after leaving platform
- **Player Size**: 40×40 pixels
- **Collision**: AABB (Axis-Aligned Bounding Box) --> 2D Collision --> 2D Collision

#### Advanced Mechanics
- **Jump Buffering**: *(Planned)* Remember jump input for 100ms before landing
- **Variable Jump Height**: *(Planned)* Release jump early for shorter jumps
- **Acceleration/Deceleration**: *(Planned)* Smooth movement transitions

### 3.2 Obstacles & Hazards

#### Platform Types

**Standard Platforms (#)**
- Solid collision
- Visual: Gray blocks with darker outline
- Behavior: Standard physics collision

**Fake Blocks (F)**
- NO collision (player passes through)
- Visual: Identical to standard platforms
- Purpose: Trick players into false sense of security

**Invisible Platforms (I)**
- Solid collision
- Visual: Completely invisible
- Purpose: Hidden paths and secret routes

**Gravity Zones (G/g)**
- Inverts or modifies player gravity
- Visual: Gradient effects with directional indicators
- Types: Flip, Toggle, Momentary
- Status: Implemented in Chapter 2, Level 3

#### Hazards

**Moving Spikes**
- Trigger: Player crosses invisible vertical line
- Movement: Slides in specific directions based on marker
- Visual: Sharp triangular obstacles with yellow dashed trigger lines (Debug mode)
- Speed: Fast movement when triggered
- Sound: "spike_move.mp3" on activation

**Death Mechanics**
- Instant death on spike collision
- 0.2 second flash effect
- Automatic respawn at spawn point (S) or default position
- Death counter increments
- Sound: "player_death.mp3"

### 3.3 Level Elements

**Spawn Point (S)**
- Custom starting position for player
- Default: Top-left safe area if no 'S' marker

**Door (D)**
- Level exit / victory condition
- Visual: Green door
- Collision: Triggers level completion
- Sound: "level_end_victory.mp3"

**Tile Size**: 60×60 pixels (all elements snap to grid)

---

## 4. Level Design Philosophy

### 4.1 Design Pillars

**1. Perception vs Reality**
- Every level should challenge player assumptions
- Visual appearance should NOT equal functionality
- Create "Aha!" moments when players discover the trick

**2. Fair Challenge**
- Deception should feel clever, not cheap
- Players should be able to learn from deaths
- Patterns should be consistent once discovered

**3. Progressive Teaching**
- Introduce one new concept at a time
- Allow mastery before combining mechanics
- Tutorial levels for each chapter

**4. Respect Player Time**
- Instant respawn (no long death animations)
- Quick restart with 'R' key
- Optional bonus levels (not required for progression)

### 4.2 Chapter Structure

**Standard Chapter Format:**
- 10 Regular Levels (required for progression)
- 1 Bonus Level (optional, extra challenge)
- Each chapter introduces new mechanics or combinations

**Current Chapters:**

#### Chapter 1: "The Basics"
**Theme**: Introduction to deception  
**Mechanics**: Fake blocks, invisible platforms, basic spike triggers  
**Difficulty**: Easy → Medium  
**Unlock**: Purple color, Glow trail effect

#### Chapter 2: "Gravity Shift"
**Theme**: Physics manipulation  
**Mechanics**: Gravity zones, advanced spike patterns, combined deception  
**Difficulty**: Medium → Hard  
**Unlock**: Blue color, Fade trail effect

### 4.3 Level Design Patterns

**Introduction Pattern** (Level 1)
- Safe environment
- Clear visual demonstration
- Text hints allowed
- No cheap deaths

**Teaching Pattern** (Level 2 to 5)
- Introduce mechanic in isolation
- Gradually increase complexity
- Build player confidence

**Combination Pattern** (Level 6 to 9)
- Mix multiple mechanics
- Require player mastery
- Challenge spatial reasoning

**Climax Pattern** (Level 10)
- Chapter finale
- Combines all chapter mechanics
- Highest difficulty
- Memorable challenge

**Bonus Pattern** (Level 11)
- Optional expert challenge
- Creative mechanic usage
- Not required for progression

### 4.4 Design Anti-Patterns (Avoid These)

❌ **Unfair Trial-and-Error**: Don't require death to learn  
❌ **Invisible Instant Death**: Give visual or audio cues  
❌ **Frustration Spikes**: Avoid difficulty spikes without preparation  
❌ **Ambiguous Goals**: Door should always be clearly visible or indicated  
❌ **Tedious Repetition**: Long runs before difficult sections need checkpoints  

---

## 5. Progression System

### 5.1 Level Unlocking

**Chapter Unlocking:**
- Chapter 1: Always unlocked
- Chapter N+1: Unlocked when Chapter N completed (all 10 regular levels)
- Bonus levels do NOT need to be completed

**Level Unlocking:**
- First level of each chapter: Unlocked when previous chapter completed
- Subsequent levels: Unlocked when previous level completed
- Bonus level: Unlocked when all 10 regular levels in chapter completed

### 5.2 Star Rating System

**Based on Death Count:**
- ⭐⭐⭐ **3 Stars**: 0 deaths (perfect run)
- ⭐⭐ **2 Stars**: 1-2 deaths (good performance)
- ⭐ **1 Star**: 3+ deaths (completed)
- Numbers may vary based on average

**Purpose:**
- Replayability incentive
- Skill measurement
- Optional challenge for perfectionists

**Saved Progress:**
- Best star rating per level persists
- Total death count tracked globally
- Level completion status saved to localStorage

### 5.3 Customization Unlocks

**Colors** (unlock by completing chapters):
- Yellow: Default (always available)
- Purple: Chapter 1 complete
- Blue: Chapter 2 complete
- Orange: Chapter 3 complete
- Green: Chapter 4 complete
- Red: Chapter 5 complete
- Cyan: Chapter 6 complete
- Pink: Chapter 7 complete

**Trail Effects** (unlock by completing chapters):
- None: Default
- Glow: Chapter 1 complete (glowing aura)
- Fade: Chapter 2 complete (fading trail)
- Particles: Chapter 3 complete (particle effect)

**Unlock Notification System:**
- Displays after completing level 10 of any chapter
- Shows all newly unlocked items (colors + trails)
- Press Enter or Space to dismiss and continue
- Sound: "chapter_end.mp3"

---

## 6. Visual Design

### 6.1 Art Style - May change based on game's narrative

**Aesthetic**: Minimalist geometric precision
- Clean, sharp edges
- High contrast for readability
- No unnecessary visual noise
- Focus on gameplay clarity

**Color Palette:**
- Background: `#2a2a2a` (dark gray)
- Standard Platforms: `#666666` (medium gray) with `#555555` outline
- Fake Blocks: Identical to platforms (deception!)
- Invisible Platforms: Completely transparent
- Player: Customizable (default: `#ffdd44` yellow)
- Door: `#44ff44` (green)
- Spikes: `#ff4444` (red)
- UI Text: `#ffffff` (white), accent: `#8c44ff` (purple)

### 6.2 User Interface (May change)

**Main Menu:**
- Centered title "DISBELIEVE"
- Three buttons: Play | Settings | Reset Progress
- Clean, readable layout
- Keyboard navigation (↑/↓ + Enter)

**Chapter Select:**
- Chapter cards with title and progress info
- Shows completion percentage
- Displays unlocked customization rewards
- Star count per chapter
- Visual indication of current chapter

**Level Select:**
- Grid layout with level numbers
- Star rating display
- Locked/unlocked state visual
- "BONUS" indicator for level 11
- Return to Chapter Select button

**In-Game HUD:**
- Top-right: Death count
- Top-left: Level name
- ESC prompt for pause menu
- Minimalist to avoid distraction

**Pause Menu:**
- Resume
- Restart Level
- Settings (volume controls)
- Return to Menu

**Level Complete Screen:**
- Star rating earned
- Death count for this attempt
- "Press SPACE to continue" prompt
- Celebration effect (planned)

### 6.3 Visual Effects

**Current:**
- Death flash (white screen flash, 0.2s)
- Spike trigger lines (yellow dashed, always visible)
- Button hover effects
- Fade transitions between game states

**Planned but not yet added to prototype:**
- Landing particles/dust
- Player trail effects (based on unlock)
- Door opening animation
- Screen shake on death
- Background gradients/patterns
- Gravity zone particle effects

---

## 7. Audio Design

### 7.1 Sound Effects

**Player Actions:**
- `player_jump.mp3` - Jump sound (space bar)
- `player_death.mp3` - Death sound (spike collision) - More death sounds (Variety)

**Environmental:**
- `spike_move.mp3` - Spike movement trigger
- `level_end_victory.mp3` - Door reached
- `chapter_end.mp3` - Chapter completion

**Planned but not yet implemented:**
- Landing sound
- Footstep sounds
- Gravity flip sound
- UI button clicks

### 7.2 Music

**Current:**
- `main_menu.mp3` - Menu background music (loops) - More different music (Variety)

**Planned:**
- Level background music (per chapter theme)
- Boss level music

### 7.3 Audio System

**Volume Controls:**
- Master Volume: 0-100%
- Music Volume: 0-100% (default: 20%)
- SFX Volume: 0-100% (default: 50%)

**Technical:**
- HTML5 Audio API
- Preload: Auto for critical sounds
- Error handling with fallback silence
- One-click audio enable for browser autoplay policies

---

## 8. Technical Specifications

### 8.1 Platform & Engine

**Technology Stack:**
- **Engine**: Unity 2022.3 LTS or newer
- **Language**: C#
- **Physics**: Unity 2D Physics Engine
- **Input System**: Unity Input System (New)
- **Save System**: Unity PlayerPrefs / JSON serialization
- **Audio**: Unity Audio System with AudioMixer

**Target Platform:**
- **Primary**: PC (Windows/Mac/Linux)
- **Secondary**: Mobile (iOS/Android) - touch controls
- **Possible**: WebGL build for browser play

### 8.2 Performance Targets

**Frame Rate:** 60 FPS minimum (VSync enabled)  
**Resolution:** 1920×1080 (scalable UI)  
**Physics Update Rate:** Fixed 50 FPS (FixedUpdate)  
**Memory:** < 200MB total usage  
**Build Size:** < 100MB (PC), < 50MB (Mobile)

### 8.3 Unity Project Structure

**Recommended Folder Structure:**
```
Assets/
├── Scripts/
│   ├── Core/
│   │   ├── GameManager.cs        # Main game state management
│   │   ├── LevelManager.cs       # Level loading and progression
│   │   ├── AudioManager.cs       # Audio system
│   │   └── SaveSystem.cs         # Save/load functionality
│   ├── Player/
│   │   ├── PlayerController.cs   # Movement and input
│   │   ├── PlayerCollision.cs    # Collision detection
│   │   └── PlayerCustomization.cs # Color/trail system
│   ├── Level/
│   │   ├── Platform.cs           # Standard platform behavior
│   │   ├── FakePlatform.cs       # Fake block (no collision)
│   │   ├── InvisiblePlatform.cs  # Invisible solid platform
│   │   ├── MovingSpike.cs        # Spike movement logic
│   │   ├── GravityZone.cs        # Gravity manipulation
│   │   └── Door.cs               # Level exit
│   ├── UI/
│   │   ├── MenuManager.cs        # Main menu
│   │   ├── ChapterSelectUI.cs    # Chapter selection
│   │   ├── LevelSelectUI.cs      # Level selection
│   │   ├── PauseMenu.cs          # Pause functionality
│   │   └── SettingsMenu.cs       # Settings UI
│   └── Data/
│       ├── LevelData.cs          # ScriptableObject for levels
│       └── ChapterData.cs        # ScriptableObject for chapters
├── Scenes/
│   ├── MainMenu.unity
│   ├── ChapterSelect.unity
│   ├── LevelSelect.unity
│   ├── GameScene.unity           # Main gameplay scene
│   └── TestLevel.unity           # Level design testing
├── Prefabs/
│   ├── Player.prefab
│   ├── Platform.prefab
│   ├── FakeBlock.prefab
│   ├── InvisiblePlatform.prefab
│   ├── Spike.prefab
│   ├── GravityZone.prefab
│   └── Door.prefab
├── Audio/
│   ├── SFX/                      # Sound effects
│   └── Music/                    # Background music
├── Materials/
│   └── 2D/                       # Sprites and materials
├── Data/
│   ├── Levels/                   # Level ScriptableObjects
│   └── Chapters/                 # Chapter ScriptableObjects
└── Resources/
    └── Settings/                 # Game configuration
```

**Key Unity Systems:**

1. **Game State Management**
   - Singleton GameManager pattern
   - States: Menu, ChapterSelect, LevelSelect, Playing, Paused, LevelComplete, UnlockNotification
   - Scene management via Unity SceneManager

2. **Level System**
   - Levels defined as ScriptableObjects
   - Runtime level generation from data or pre-built prefabs
   - Chapter-based organization

3. **Physics Configuration**
   - 2D Rigidbody for player (Continuous collision detection)
   - Box Collider 2D for platforms and player
   - Trigger Colliders for spikes, door, gravity zones
   - Physics layers for proper collision filtering

**Physics Constants (Unity):**
```csharp
// PlayerController.cs constants
float moveSpeed = 6.33f;              // ~380 units/sec scaled to Unity
float gravity = 52.5f;                // Gravity scale on Rigidbody2D
float jumpForce = 17.5f;              // Jump velocity
float coyoteTime = 0.1f;              // Coyote time duration
float playerSize = 0.67f;             // Player collider size (40px @ 60px/unit)
```

### 8.4 Save System (Unity)

**Implementation Options:**

**Option 1: PlayerPrefs** (Simple, built-in)
```csharp
// Save
PlayerPrefs.SetString("CompletedLevels", JsonUtility.ToJson(levelData));
PlayerPrefs.SetInt("TotalDeaths", deaths);
PlayerPrefs.SetString("PlayerColor", colorHex);

// Load
string json = PlayerPrefs.GetString("CompletedLevels");
LevelData data = JsonUtility.FromJson<LevelData>(json);
```

**Option 2: JSON File** (More flexible, recommended)
```csharp
// SaveSystem.cs
public class SaveData
{
    public List<int> completedLevels;
    public Dictionary<int, int> levelStars;
    public string playerColor;
    public string playerTrail;
    public int totalDeaths;
}

// Save to persistent data path
string json = JsonUtility.ToJson(saveData, true);
File.WriteAllText(Application.persistentDataPath + "/save.json", json);
```

**Data Stored:**
- Completed level indices (List<int>)
- Star ratings per level (Dictionary<int, int>)
- Player customization (color, trail)
- Total death count
- Settings (volume levels)

**Reset Function:**
- Deletes save file or clears PlayerPrefs
- Shows confirmation dialog
- Returns to default values

### 8.5 Prototype Reference

**JavaScript Prototype Location:**
```
Prototype Files (for reference):
├── play.html              # Game entry point
├── src/
│   ├── game.js           # All game logic (main reference)
│   ├── levels.js         # Level data structure examples
│   ├── level_guide.md    # Level building documentation
│   └── debug_and_design_tips.md
├── Sounds/               # Audio assets (can be reused)
└── dev-notes/           # Design documentation
```

**How to Use Prototype for Reference:**
- **game.js**: Main logic reference for mechanics implementation
- **levels.js**: Level data structure and ASCII map system
- **Game States**: Same state machine pattern (menu, playing, paused, etc.)
- **Physics Values**: Convert JavaScript constants to Unity-compatible values
- **Audio Files**: Reuse sound effects and music from Sounds/ folder

**Key Conversion Notes:**
- JavaScript Canvas pixels → Unity world units (60px = 1 unit recommended)
- deltaTime already handled by Unity Time.deltaTime
- Canvas rendering → Unity SpriteRenderer/UI components
- Event listeners → Unity Input System actions

---

## 9. Player Customization

### 9.1 Color System

**Implementation:**
- 8 total colors (Yellow default + 7 unlocks)
- Changes player square color
- Purely cosmetic (no gameplay effect - may change in future?)
- Selected in Settings menu
- Persists across sessions

**Unlock Progression:**
- Ties to chapter completion
- Creates long-term goal
- Visible reward for progress

### 9.2 Trail Effects

**Types:**
1. **None** - No visual trail (default)
2. **Glow** - Subtle glowing aura around player
3. **Fade** - Fading afterimages following player
4. **Particles** - Particle trail effect
5. ....

**Implementation:**
- Additive visual layer
- No impact on gameplay/hitboxes
- Selected in Settings menu
- Unlocked by chapter completion

### 9.3 Future Customization Ideas

- Jump particle effects
- UI themes

---

## 10. Future Features & Roadmap

### 10.1 Phase 1: Polish (Current Priority)

**New Mechanics:**
- Moving platforms
- Disappearing platforms
- Portals/teleporters
- Keys and locks
- One-way platforms
- Wind/current zones
- Bounce pads

### 10.3 Phase 3: Advanced Features

**Progression:**
- Level timer/speedrun mode
- Death heatmap visualization - Debug mode

**Social:**
- Leaderboards (time/deaths)
- Community level editor

**Accessibility:**
- Colorblind modes
- Visual indicators for sound effects

### 10.4 Phase 4: Platform Expansion

**Mobile Version:**
- Touch controls
- Responsive layout
- Virtual buttons

---

## Appendix A: Level Building Guide

### Creating New Levels

1. **Open `src/levels.js`**
2. **Add to appropriate chapter array:**

```javascript
{
  name: "Level X: Creative Name",
  map: [
    "....#................",
    ".S..#................",  // S = spawn
    "##..#................",  // # = platform
    "....#................",  // F = fake block
    "........I...1....D...",  // I = invisible, 1 = spike
    "#######F############"   // D = door
  ],
  spikeTriggers: [400]  // Optional custom triggers
}
```

3. **Test in browser**
4. **Iterate based on playtesting**

### Design Checklist
- [ ] Can the player learn from deaths?
- [ ] Is there at least one clear path to victory?
- [ ] Does it teach or reinforce a concept?
- [ ] Is the difficulty appropriate for chapter?
- [ ] Is the level fun to replay?

---

## Appendix B: Debug Features

**Enable Debug Mode:**
```javascript
// In game.js, set:
const ENABLE_DEBUG_FEATURES = true;
let DEBUG_MODE = false;
```

**Debug Keys - Debug mode (when enabled):**
- `T` - Toggle debug mode
- `G` - Manual gravity flip (if gravity zones enabled)
- `H` - Lock/unlock gravity state
- `Shift + N` - Skip to next level
- `Shift + P` - Previous level

**Debug Visualizations:**
- Yellow dashed lines: Spike trigger positions
- Grid overlay *(planned)*
- Collision boxes *(planned)*
- FPS counter *(planned)*

---

## Appendix C: Glossary

- **Coyote Time**: Grace period to jump after leaving platform
- **deltaTime**: Time between frames for smooth physics
- **localStorage**: Browser storage for save data

---

## Document Changelog

**v1.0 - December 2025**
- Initial GDD creation
- Documents current prototype state
- Includes implemented features + roadmap
- Covers 2 complete chapters

---

**Document Owner**: Yusuf Enes  
**Last Updated**: 2 December 2025
