# Scenario Development with Claude Code

## Overview
Scenarios are TypeScript files using the `@dndmanager/scene-framework` DSL.
Each scenario is a self-contained folder under `scenarios/`.

## Creating a New Scenario
1. Copy `_template/` to a new folder: `scenarios/my-scenario/`
2. Edit `index.ts` with your scenario definition
3. Run `pnpm scenario:validate my-scenario` to check for errors
4. Run `pnpm scenario:preview my-scenario` for local preview

## DSL API
Import from `@dndmanager/scene-framework`:
- `scenario()` — Root scenario definition
- `map()` — Define a map with tiles and dimensions
- `room()` — Define a room within a map
- `encounter()` — Define a combat encounter
- `npc()` — Define an NPC with personality and knowledge
- `trigger()` — Define an event trigger
- `loot()` — Define loot tables

## Rules
- All monster references MUST use `pf2e:` prefix (e.g., `pf2e:skeleton-guard`)
- Encounter difficulty must match PF2e encounter budget for the specified level
- Every room needs `lighting` and `terrain` properties
- NPCs need `personality`, `knowledge`, and `dialogue_style`
- Trigger chains must be acyclic (no circular triggers)
- Use descriptive IDs (e.g., `entrance-hall`, not `room1`)

## Position Strategies
- `"spread"` — Distribute evenly across the room
- `"clustered"` — Group together in the center
- `"flanking-<npc-id>"` — Position to flank the specified NPC/monster
- `"guarding-<feature>"` — Position near a map feature
- `[x, y]` — Exact grid coordinates

## File Structure
```
scenarios/my-scenario/
├── index.ts          — Main scenario definition
├── README.md         — Description for players (spoiler-free)
└── notes.md          — GM notes (optional)
```
