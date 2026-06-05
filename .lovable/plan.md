# Mystical Tower Defense — Build Plan

A painterly fantasy tower defense with free-placement towers, multiple biomes, mystical creature towers (wizards, druids, elves) vs hordes of enemies (orcs, dragons, undead, demons), abilities, XP/leveling, and meta-progression saved to your account.

Because this is a large game, I'll build it in phases so you can play after each one and steer the direction.

---

## Phase 1 — Playable core loop (this implementation)

The first build will deliver a fully playable single-map run with the systems wired end-to-end. Later phases layer content on top of these foundations.

**Core gameplay**
- Top-down free-placement battlefield rendered on HTML canvas (painterly background art, animated sprites)
- Enemies spawn in waves and walk a path of waypoints toward your sanctum (lose HP if they reach it)
- Place towers anywhere on valid terrain; each tower has range, attack speed, projectile type, element
- Pause / 1x / 2x / 3x speed, wave start button, next-wave preview
- Win condition: survive all waves. Lose condition: sanctum HP hits 0

**4 starter towers** (painterly art for each)
- Apprentice Wizard — single-target arcane bolts
- Druid Grove — slow poison area damage
- Elven Archer — fast pierce
- Stone Golem — short-range heavy AoE slam

**6 starter enemies**
- Orc Grunt, Goblin Scout (fast), Skeleton, Shadow Beast, Troll (tank), Wyvern (flying, only certain towers hit)

**Tower progression**
- Each tower earns XP from kills, levels 1–5
- At levels 2/4 you pick 1 of 2 ability upgrades (e.g. Wizard: chain lightning OR mana burn)
- Sell tower for partial refund

**Active abilities (player-cast)**
- Meteor (AoE nuke, cooldown)
- Freeze (slow all enemies briefly)
- Heal Sanctum
- Unlock more via meta-progression

**Meta-progression**
- After each run, earn Arcane Shards based on waves cleared
- Spend in a Sanctum skill tree (starting gold, sanctum HP, new towers/abilities unlocked, global damage %)
- Account-level: profile XP, unlocked towers, completed maps

**Save / accounts**
- Lovable Cloud for auth (email + password, magic link optional)
- Per-user save: profile, currency, unlocked content, skill tree, map completion, best wave
- Resume in-progress run (serialized game state)

**UI / screens**
- Main menu (painterly title art, Play / Codex / Skill Tree / Settings)
- Map select (1 map for phase 1, locked slots for phases 2–3)
- In-game HUD: gold, lives, wave, ability bar, tower picker
- Tower inspect panel: stats, XP bar, upgrade choices, sell
- Bestiary / Codex (auto-fills as you encounter creatures)
- Post-run summary with rewards
- Auth screens

**Art**
- Painterly hero illustration (title screen)
- Battlefield biome background (Enchanted Forest)
- Tower portraits and in-game sprites for the 4 towers
- Enemy sprites for the 6 enemies
- Ability and UI iconography
- Generated via the image tool, all painterly style with consistent palette

---

## Phase 2 — Content expansion (next iteration)

- 2 additional biomes (Frozen Wastes, Volcanic Ruins) with unique enemies
- 4 more towers (Necromancer, Phoenix, Rune Priest, Frost Witch)
- 6 more enemies + 2 boss waves
- Tower fusion (combine two max-level towers into a hybrid)
- Daily challenge map with seeded modifiers

## Phase 3 — Endgame polish

- Deep skill tree (per-element branches: fire, frost, arcane, nature, shadow)
- Endless mode with leaderboards
- Achievements
- Audio: music + SFX
- Settings (volume, graphics quality, key binds)
- Mobile-friendly touch controls

---

## Technical notes

- **Backend**: Lovable Cloud (Supabase) for auth + per-user save state. Tables: `profiles`, `save_states` (jsonb run state), `unlocks`, `skill_tree`, `runs` (history). Strict RLS per `auth.uid()`. Roles separated into `user_roles` (no privilege escalation).
- **Rendering**: HTML5 canvas with `requestAnimationFrame` loop, fixed timestep simulation. Painterly PNG sprites + particle effects for projectiles/abilities.
- **State**: Zustand for UI/menu state; the canvas game loop owns simulation state and syncs snapshots to Zustand for HUD.
- **Routes** (TanStack Start): `/` (landing/menu), `/play/$mapId`, `/skill-tree`, `/codex`, `/auth`, `/_authenticated/profile`.
- **Save sync**: throttled write to `save_states` between waves + on pause.
- **Design tokens**: painterly fantasy palette (deep indigo, candlelit gold, mossy green, ember orange) in `src/styles.css` with display serif + clean body font.

---

## What you'll see after phase 1

A fully playable run: log in, start the Enchanted Forest map, place towers, cast abilities, survive 15 waves, earn shards, spend them in the skill tree, and come back later to a saved profile. Phase 2 and 3 then layer on more creatures, maps, and depth without rewriting the core.

Approve this and I'll start building phase 1. After it's playable, you can tell me what to expand first (more creatures? deeper skill tree? a specific biome?) and I'll prioritize phase 2 around that.