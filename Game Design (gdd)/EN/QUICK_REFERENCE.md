# DISBELIEVE - Quick Reference Guide

**Genre:** 2D Precision Platformer / Puzzle Platformer  
**Platform:** Unity (PC/Mobile/Web)  
**Core Concept:** "Nothing is as it seems" - Deception-based platforming

---

## 🎮 Game Overview

**DISBELIEVE** challenges players' perception through visual tricks and hidden mechanics. Solid-looking platforms may be fake, empty space may be solid, and every level is a puzzle of trust and discovery.

**Target Audience:** Fans of Celeste, Super Meat Boy, VVVVVV (10+, casual to hardcore)

---

## 🎯 Core Mechanics

### Player Movement
- **Speed:** 380 units/sec (6.33f in Unity)
- **Jump:** -1050 units/sec (17.5f in Unity)
- **Coyote Time:** 100ms grace period after leaving platform
- **Controls:** Arrow keys/WASD + Space/W to jump, R to restart, ESC to pause

### Deception Elements
- **Fake Blocks (F):** Look solid, no collision
- **Invisible Platforms (I):** Solid but invisible
- **Moving Spikes:** Trigger when player crosses invisible line
- **Gravity Zones:** Flip or modify gravity

### Level Goal
Reach the green door while avoiding spikes and navigating deceptive platforms.

---

## 📊 Progression System

### Chapter Structure
- **10 Regular Levels** (required for progression)
- **1 Bonus Level** (optional, extra challenge)
- Complete 10 levels → unlock next chapter

### Star Rating (Death-Based)
- ⭐⭐⭐ **3 Stars:** 0 deaths
- ⭐⭐ **2 Stars:** 1-2 deaths  
- ⭐ **1 Star:** 3+ deaths

### Unlockables
**Colors:** Yellow (default) → Purple → Blue → Orange → Green → Red → Cyan → Pink  
**Trails:** None → Glow → Fade → Particles

---

## 🏗️ Unity Project Structure

```
Assets/
├── Scripts/
│   ├── Core/              # GameManager, LevelManager, AudioManager, SaveSystem
│   ├── Player/            # PlayerController, PlayerCollision, PlayerCustomization
│   ├── Level/             # Platform, FakePlatform, InvisiblePlatform, MovingSpike, GravityZone, Door
│   └── UI/                # Menu systems, HUD
├── Scenes/                # MainMenu, ChapterSelect, LevelSelect, GameScene
├── Prefabs/               # Reusable game objects
├── Audio/                 # SFX & Music
└── Data/                  # ScriptableObjects for levels and chapters
```

---

## 🎨 Visual Design

**Aesthetic:** Minimalist geometric precision  
**Palette:** Dark gray background, medium gray platforms, customizable player (default yellow)  
**UI:** Clean, keyboard-navigable menus with progress tracking

---

## 🔊 Audio

**SFX:** player_jump.mp3, player_death.mp3, spike_move.mp3, level_end_victory.mp3, chapter_end.mp3  
**Music:** main_menu.mp3 (looping), per-chapter level music (planned)  
**Defaults:** Music 20%, SFX 50%

---

## 📝 Level Design Philosophy

### Design Pillars
1. **Perception vs Reality** - Challenge assumptions, create "Aha!" moments
2. **Fair Challenge** - Players learn from deaths, patterns are consistent
3. **Progressive Teaching** - One mechanic at a time, gradual complexity
4. **Respect Player Time** - Instant respawn, optional bonus levels

### Level Pattern (Per Chapter)
- **Levels 1-2:** Introduction (safe, clear demonstration)
- **Levels 3-5:** Teaching (isolated mechanics, building confidence)
- **Levels 6-9:** Combination (mix mechanics, require mastery)
- **Level 10:** Climax (combines all chapter mechanics)
- **Level 11:** Bonus (optional expert challenge)

---

## 🔧 Technical Quick Reference

### Unity Setup
- **Engine:** Unity 2022.3 LTS+
- **Physics:** 2D Rigidbody (Continuous), Box Collider 2D
- **Input:** New Input System
- **Save:** JSON to persistentDataPath (recommended) or PlayerPrefs

### Performance Targets
- **60 FPS** minimum (VSync)
- **1920×1080** resolution (scalable)
- **<100MB** PC build, **<50MB** mobile

### Physics Constants
```csharp
float moveSpeed = 6.33f;
float gravity = 52.5f;        // Rigidbody2D gravity scale
float jumpForce = 17.5f;
float coyoteTime = 0.1f;
float playerSize = 0.67f;     // 40px @ 60px/unit
```

---

## 🎭 Current Content

**Chapter 1: "The Basics"** - Fake blocks, invisible platforms, basic spikes (Easy→Medium)  
**Chapter 2: "Gravity Shift"** - Gravity zones, advanced patterns (Medium→Hard)

---

## 🚀 Development Priorities

1. **New Mechanics:** Moving platforms, disappearing platforms, portals, keys/locks, one-way platforms
2. **Features:** Level timer, death heatmap (debug), community level editor
3. **Platforms:** Mobile touch controls, WebGL build

---

## 📚 Prototype Reference

**Location:** `/play.html` and `/src/` folder  
**Key Files:**
- `game.js` - All mechanics logic (reference for Unity implementation)
- `levels.js` - Level data structure and ASCII map system
- `Sounds/` - Reusable audio assets

**Conversion:** 60 Canvas pixels = 1 Unity unit

---

**Full Documentation:** See `GAME_DESIGN_DOCUMENT.md` for complete specifications  
**Owner:** Yusuf Enes | **Updated:** December 2025
