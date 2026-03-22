# Phase 1.4: Scene Framework Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the scenario DSL that GMs use (via Claude Code) to define maps, rooms, encounters, NPCs, triggers, and loot tables as TypeScript code. Include validation and an example scenario.

**Architecture:** Pure TypeScript package (`packages/scene-framework`) providing builder functions (`scenario()`, `map()`, `room()`, `encounter()`, `npc()`, `trigger()`, `loot()`) that return typed data structures. A validator checks referential integrity and PF2e encounter budgets. No runtime execution — just data definition and validation.

**Tech Stack:** TypeScript strict, Vitest, @dndmanager/pf2e-engine (dependency)

**Spec:** `docs/superpowers/specs/2026-03-21-dndmanager-platform-design.md` (Section 6)

---

## File Structure

```
packages/scene-framework/src/
├── index.ts                          → Public API re-exports
├── types.ts                          → Scenario type definitions
├── builders.ts                       → DSL builder functions
├── validator.ts                      → Scenario validation
├── __tests__/
│   ├── builders.test.ts
│   └── validator.test.ts

scenarios/
├── _template/index.ts                → Already exists
├── example-dungeon/index.ts          → Example scenario using DSL
└── CLAUDE.md                         → Already exists
```

---

### Task 1: Scene Framework Type Definitions

**Files:**
- Create: `packages/scene-framework/src/types.ts`
- Modify: `packages/scene-framework/src/index.ts`

- [ ] **Step 1: Create type definitions**

`packages/scene-framework/src/types.ts`:
```typescript
// ─── Scenario ─────────────────────────────────
export interface Scenario {
  name: string
  level: { min: number; max: number }
  description: string
  maps: MapDef[]
  npcs: NpcDef[]
  encounters: EncounterDef[]
  triggers: TriggerDef[]
  loot: LootDef[]
}

// ─── Map ──────────────────────────────────────
export interface MapDef {
  id: string
  tiles: string
  size: [number, number]
  rooms: RoomDef[]
  connections: ConnectionDef[]
}

export interface RoomDef {
  id: string
  position: [number, number]
  size: [number, number]
  lighting: LightingLevel
  terrain: TerrainDef[]
  features?: string[]
}

export type LightingLevel = 'bright' | 'dim' | 'darkness' | 'magical-darkness'

export interface TerrainDef {
  type: 'normal' | 'difficult' | 'greater-difficult' | 'hazardous'
  area: [[number, number], [number, number]]
  reason?: string
}

export interface ConnectionDef {
  from: string
  to: string
  type: 'corridor' | 'door' | 'secret-door' | 'stairs' | 'open'
  length?: number
  trap?: string
}

// ─── NPC ──────────────────────────────────────
export interface NpcDef {
  id: string
  monster?: string          // pf2e: reference
  personality: string
  knowledge: string[]
  dialogue_style: string
}

// ─── Encounter ────────────────────────────────
export type EncounterDifficulty = 'trivial' | 'low' | 'moderate' | 'severe' | 'extreme'
export type EncounterTrigger = 'on_enter' | 'on_interact' | 'manual' | 'timed'
export type PositionStrategy = string  // "spread", "clustered", "flanking-<id>", or [x,y] as string

export interface MonsterPlacement {
  type: string
  count?: number
  position?: [number, number]
  positions?: PositionStrategy
}

export interface EncounterPhase {
  hp_threshold: number
  action: string
  description: string
}

export interface EncounterDef {
  id: string
  room: string
  trigger: EncounterTrigger
  monsters: MonsterPlacement[]
  difficulty: EncounterDifficulty
  tactics?: string
  phases?: EncounterPhase[]
}

// ─── Trigger ──────────────────────────────────
export interface TriggerCondition {
  encounter?: string
  phase?: string
  room_entered?: string
  item_used?: string
}

export type TriggerEffectType = 'spawn' | 'map_change' | 'lighting' | 'audio' | 'trigger' | 'narrative'

export interface TriggerEffect {
  type: TriggerEffectType
  [key: string]: unknown
}

export interface TriggerDef {
  id: string
  when: TriggerCondition
  effects: TriggerEffect[]
}

// ─── Loot ─────────────────────────────────────
export type LootMode = 'fixed' | 'random' | 'ai-generated'

export interface LootDef {
  id: string
  encounter?: string
  room?: string
  mode: LootMode
  guaranteed?: string[]
  context?: string
}

// ─── Validation ───────────────────────────────
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
```

- [ ] **Step 2: Update index.ts**

`packages/scene-framework/src/index.ts`:
```typescript
export * from './types.js'
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm --filter @dndmanager/scene-framework typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/scene-framework/src/
git commit -m "feat(scene-framework): add scenario type definitions"
```

---

### Task 2: DSL Builder Functions

**Files:**
- Create: `packages/scene-framework/src/builders.ts`
- Test: `packages/scene-framework/src/__tests__/builders.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/scene-framework/src/__tests__/builders.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { scenario, map, room, encounter, npc, trigger, loot } from '../builders.js'

describe('room', () => {
  it('creates a room definition', () => {
    const r = room('hall', {
      position: [0, 0],
      size: [6, 6],
      lighting: 'bright',
      terrain: [],
    })
    expect(r.id).toBe('hall')
    expect(r.lighting).toBe('bright')
  })

  it('includes features when provided', () => {
    const r = room('altar-room', {
      position: [0, 0],
      size: [10, 10],
      lighting: 'dim',
      terrain: [],
      features: ['altar', 'statue'],
    })
    expect(r.features).toEqual(['altar', 'statue'])
  })
})

describe('map', () => {
  it('creates a map definition', () => {
    const m = map('dungeon', {
      tiles: 'stone',
      size: [20, 15],
      rooms: [
        room('entry', { position: [0, 0], size: [5, 5], lighting: 'bright', terrain: [] }),
      ],
      connections: [],
    })
    expect(m.id).toBe('dungeon')
    expect(m.rooms).toHaveLength(1)
    expect(m.size).toEqual([20, 15])
  })
})

describe('npc', () => {
  it('creates an NPC definition', () => {
    const n = npc('bartender', {
      personality: 'Friendly and talkative',
      knowledge: ['Knows about the dungeon', 'Heard rumors'],
      dialogue_style: 'Casual, uses slang',
    })
    expect(n.id).toBe('bartender')
    expect(n.knowledge).toHaveLength(2)
  })

  it('includes monster reference when provided', () => {
    const n = npc('boss', {
      monster: 'pf2e:shadow-priestess',
      personality: 'Arrogant',
      knowledge: [],
      dialogue_style: 'Formal',
    })
    expect(n.monster).toBe('pf2e:shadow-priestess')
  })
})

describe('encounter', () => {
  it('creates an encounter definition', () => {
    const e = encounter('guard-patrol', {
      room: 'entry',
      trigger: 'on_enter',
      monsters: [{ type: 'pf2e:skeleton-guard', count: 4, positions: 'spread' }],
      difficulty: 'moderate',
    })
    expect(e.id).toBe('guard-patrol')
    expect(e.monsters).toHaveLength(1)
    expect(e.difficulty).toBe('moderate')
  })

  it('includes tactics and phases', () => {
    const e = encounter('boss', {
      room: 'throne',
      trigger: 'manual',
      monsters: [{ type: 'pf2e:dragon', position: [10, 10] }],
      difficulty: 'severe',
      tactics: 'Breath weapon first, then melee',
      phases: [{ hp_threshold: 0.5, action: 'flee', description: 'Dragon tries to flee' }],
    })
    expect(e.tactics).toBeDefined()
    expect(e.phases).toHaveLength(1)
  })
})

describe('trigger', () => {
  it('creates a trigger definition', () => {
    const t = trigger('portal-open', {
      when: { encounter: 'boss', phase: 'activate' },
      effects: [
        { type: 'spawn', monsters: [{ type: 'pf2e:shadow', count: 2 }] },
        { type: 'lighting', room: 'throne', to: 'darkness' },
      ],
    })
    expect(t.id).toBe('portal-open')
    expect(t.effects).toHaveLength(2)
  })
})

describe('loot', () => {
  it('creates a loot definition', () => {
    const l = loot('boss-reward', {
      encounter: 'boss',
      mode: 'ai-generated',
      guaranteed: ['pf2e:flame-sword'],
      context: 'Fire temple, party level 5',
    })
    expect(l.id).toBe('boss-reward')
    expect(l.mode).toBe('ai-generated')
    expect(l.guaranteed).toContain('pf2e:flame-sword')
  })
})

describe('scenario', () => {
  it('creates a complete scenario', () => {
    const s = scenario({
      name: 'Test Dungeon',
      level: { min: 1, max: 3 },
      description: 'A simple test dungeon',
      maps: [
        map('main', {
          tiles: 'stone',
          size: [10, 10],
          rooms: [room('start', { position: [0, 0], size: [5, 5], lighting: 'bright', terrain: [] })],
          connections: [],
        }),
      ],
      npcs: [],
      encounters: [],
      triggers: [],
      loot: [],
    })
    expect(s.name).toBe('Test Dungeon')
    expect(s.maps).toHaveLength(1)
    expect(s.level.min).toBe(1)
  })

  it('includes all sections', () => {
    const s = scenario({
      name: 'Full Scenario',
      level: { min: 3, max: 5 },
      description: 'A complete scenario',
      maps: [
        map('m1', { tiles: 'stone', size: [10, 10], rooms: [], connections: [] }),
      ],
      npcs: [
        npc('n1', { personality: 'x', knowledge: [], dialogue_style: 'x' }),
      ],
      encounters: [
        encounter('e1', { room: 'r1', trigger: 'on_enter', monsters: [], difficulty: 'moderate' }),
      ],
      triggers: [
        trigger('t1', { when: {}, effects: [] }),
      ],
      loot: [
        loot('l1', { mode: 'fixed' }),
      ],
    })
    expect(s.npcs).toHaveLength(1)
    expect(s.encounters).toHaveLength(1)
    expect(s.triggers).toHaveLength(1)
    expect(s.loot).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/scene-framework test`
Expected: FAIL

- [ ] **Step 3: Implement builders.ts**

`packages/scene-framework/src/builders.ts`:
```typescript
import type {
  Scenario,
  MapDef,
  RoomDef,
  NpcDef,
  EncounterDef,
  TriggerDef,
  LootDef,
  LightingLevel,
  TerrainDef,
  ConnectionDef,
  MonsterPlacement,
  EncounterDifficulty,
  EncounterTrigger,
  EncounterPhase,
  TriggerCondition,
  TriggerEffect,
  LootMode,
} from './types.js'

// ─── Room ─────────────────────────────────────
interface RoomParams {
  position: [number, number]
  size: [number, number]
  lighting: LightingLevel
  terrain: TerrainDef[]
  features?: string[]
}

export function room(id: string, params: RoomParams): RoomDef {
  return { id, ...params }
}

// ─── Map ──────────────────────────────────────
interface MapParams {
  tiles: string
  size: [number, number]
  rooms: RoomDef[]
  connections: ConnectionDef[]
}

export function map(id: string, params: MapParams): MapDef {
  return { id, ...params }
}

// ─── NPC ──────────────────────────────────────
interface NpcParams {
  monster?: string
  personality: string
  knowledge: string[]
  dialogue_style: string
}

export function npc(id: string, params: NpcParams): NpcDef {
  return { id, ...params }
}

// ─── Encounter ────────────────────────────────
interface EncounterParams {
  room: string
  trigger: EncounterTrigger
  monsters: MonsterPlacement[]
  difficulty: EncounterDifficulty
  tactics?: string
  phases?: EncounterPhase[]
}

export function encounter(id: string, params: EncounterParams): EncounterDef {
  return { id, ...params }
}

// ─── Trigger ──────────────────────────────────
interface TriggerParams {
  when: TriggerCondition
  effects: TriggerEffect[]
}

export function trigger(id: string, params: TriggerParams): TriggerDef {
  return { id, ...params }
}

// ─── Loot ─────────────────────────────────────
interface LootParams {
  encounter?: string
  room?: string
  mode: LootMode
  guaranteed?: string[]
  context?: string
}

export function loot(id: string, params: LootParams): LootDef {
  return { id, ...params }
}

// ─── Scenario ─────────────────────────────────
interface ScenarioParams {
  name: string
  level: { min: number; max: number }
  description: string
  maps: MapDef[]
  npcs: NpcDef[]
  encounters: EncounterDef[]
  triggers: TriggerDef[]
  loot: LootDef[]
}

export function scenario(params: ScenarioParams): Scenario {
  return { ...params }
}
```

- [ ] **Step 4: Update index.ts, run tests**

`packages/scene-framework/src/index.ts`:
```typescript
export * from './types.js'
export * from './builders.js'
```

Run: `pnpm --filter @dndmanager/scene-framework test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/scene-framework/src/
git commit -m "feat(scene-framework): add DSL builder functions for scenarios"
```

---

### Task 3: Scenario Validator

**Files:**
- Create: `packages/scene-framework/src/validator.ts`
- Test: `packages/scene-framework/src/__tests__/validator.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/scene-framework/src/__tests__/validator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { validateScenario } from '../validator.js'
import { scenario, map, room, encounter, npc, trigger, loot } from '../builders.js'

function validScenario() {
  return scenario({
    name: 'Test',
    level: { min: 1, max: 3 },
    description: 'Valid test scenario',
    maps: [
      map('main', {
        tiles: 'stone',
        size: [10, 10],
        rooms: [
          room('hall', { position: [0, 0], size: [5, 5], lighting: 'bright', terrain: [] }),
        ],
        connections: [],
      }),
    ],
    npcs: [],
    encounters: [
      encounter('fight', {
        room: 'hall',
        trigger: 'on_enter',
        monsters: [{ type: 'pf2e:goblin', count: 2 }],
        difficulty: 'moderate',
      }),
    ],
    triggers: [],
    loot: [],
  })
}

describe('validateScenario', () => {
  it('returns valid for a correct scenario', () => {
    const result = validateScenario(validScenario())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('errors on empty name', () => {
    const s = { ...validScenario(), name: '' }
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('name'))).toBe(true)
  })

  it('errors on invalid level range', () => {
    const s = { ...validScenario(), level: { min: 5, max: 3 } }
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('level'))).toBe(true)
  })

  it('errors on empty maps', () => {
    const s = { ...validScenario(), maps: [] }
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('map'))).toBe(true)
  })

  it('errors on encounter referencing nonexistent room', () => {
    const s = scenario({
      ...validScenario(),
      encounters: [
        encounter('fight', {
          room: 'nonexistent',
          trigger: 'on_enter',
          monsters: [{ type: 'pf2e:goblin' }],
          difficulty: 'moderate',
        }),
      ],
    })
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('nonexistent'))).toBe(true)
  })

  it('errors on duplicate room IDs', () => {
    const s = scenario({
      ...validScenario(),
      maps: [
        map('main', {
          tiles: 'stone',
          size: [10, 10],
          rooms: [
            room('hall', { position: [0, 0], size: [5, 5], lighting: 'bright', terrain: [] }),
            room('hall', { position: [5, 0], size: [5, 5], lighting: 'dim', terrain: [] }),
          ],
          connections: [],
        }),
      ],
    })
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('duplicate') || e.includes('Duplicate'))).toBe(true)
  })

  it('warns on monster without pf2e: prefix', () => {
    const s = scenario({
      ...validScenario(),
      encounters: [
        encounter('fight', {
          room: 'hall',
          trigger: 'on_enter',
          monsters: [{ type: 'goblin' }],
          difficulty: 'moderate',
        }),
      ],
    })
    const result = validateScenario(s)
    expect(result.warnings.some((w) => w.includes('pf2e:'))).toBe(true)
  })

  it('errors on cyclic triggers', () => {
    const s = scenario({
      ...validScenario(),
      triggers: [
        trigger('a', { when: {}, effects: [{ type: 'trigger', target: 'b' }] }),
        trigger('b', { when: {}, effects: [{ type: 'trigger', target: 'a' }] }),
      ],
    })
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('cycl'))).toBe(true)
  })

  it('errors on trigger referencing nonexistent trigger', () => {
    const s = scenario({
      ...validScenario(),
      triggers: [
        trigger('a', { when: {}, effects: [{ type: 'trigger', target: 'nonexistent' }] }),
      ],
    })
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('nonexistent'))).toBe(true)
  })

  it('errors on loot referencing nonexistent encounter', () => {
    const s = scenario({
      ...validScenario(),
      loot: [
        loot('reward', { encounter: 'nonexistent', mode: 'fixed' }),
      ],
    })
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('nonexistent'))).toBe(true)
  })

  it('warns on room without lighting', () => {
    const s = scenario({
      ...validScenario(),
      maps: [
        map('main', {
          tiles: 'stone',
          size: [10, 10],
          rooms: [
            { id: 'hall', position: [0, 0], size: [5, 5], lighting: undefined as any, terrain: [] },
          ],
          connections: [],
        }),
      ],
    })
    const result = validateScenario(s)
    expect(result.warnings.length + result.errors.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/scene-framework test`
Expected: FAIL

- [ ] **Step 3: Implement validator.ts**

`packages/scene-framework/src/validator.ts`:
```typescript
import type { Scenario, ValidationResult } from './types.js'

export function validateScenario(scenario: Scenario): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Basic fields
  if (!scenario.name || scenario.name.trim() === '') {
    errors.push('Scenario name is required')
  }

  if (scenario.level.min > scenario.level.max) {
    errors.push(`Invalid level range: min (${scenario.level.min}) > max (${scenario.level.max})`)
  }

  if (scenario.maps.length === 0) {
    errors.push('At least one map is required')
  }

  // Collect all room IDs
  const roomIds = new Set<string>()
  for (const mapDef of scenario.maps) {
    for (const roomDef of mapDef.rooms) {
      if (roomIds.has(roomDef.id)) {
        errors.push(`Duplicate room ID: ${roomDef.id}`)
      }
      roomIds.add(roomDef.id)

      if (!roomDef.lighting) {
        warnings.push(`Room "${roomDef.id}" is missing lighting property`)
      }
    }
  }

  // Validate encounters
  const encounterIds = new Set<string>()
  for (const enc of scenario.encounters) {
    encounterIds.add(enc.id)

    if (!roomIds.has(enc.room)) {
      errors.push(`Encounter "${enc.id}" references nonexistent room: ${enc.room}`)
    }

    for (const monster of enc.monsters) {
      if (!monster.type.startsWith('pf2e:')) {
        warnings.push(`Monster type "${monster.type}" in encounter "${enc.id}" should use pf2e: prefix`)
      }
    }
  }

  // Validate triggers — check references and cycles
  const triggerIds = new Set<string>(scenario.triggers.map((t) => t.id))

  for (const trig of scenario.triggers) {
    for (const effect of trig.effects) {
      if (effect.type === 'trigger') {
        const target = effect.target as string
        if (!triggerIds.has(target)) {
          errors.push(`Trigger "${trig.id}" references nonexistent trigger: ${target}`)
        }
      }
    }
  }

  // Cycle detection in triggers
  if (hasTriggerCycle(scenario.triggers)) {
    errors.push('Cyclic trigger chain detected')
  }

  // Validate loot references
  for (const lootDef of scenario.loot) {
    if (lootDef.encounter && !encounterIds.has(lootDef.encounter)) {
      errors.push(`Loot "${lootDef.id}" references nonexistent encounter: ${lootDef.encounter}`)
    }
    if (lootDef.room && !roomIds.has(lootDef.room)) {
      errors.push(`Loot "${lootDef.id}" references nonexistent room: ${lootDef.room}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

function hasTriggerCycle(triggers: Scenario['triggers']): boolean {
  const graph = new Map<string, string[]>()

  for (const trig of triggers) {
    const targets: string[] = []
    for (const effect of trig.effects) {
      if (effect.type === 'trigger' && typeof effect.target === 'string') {
        targets.push(effect.target)
      }
    }
    graph.set(trig.id, targets)
  }

  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true
    if (visited.has(nodeId)) return false

    visited.add(nodeId)
    inStack.add(nodeId)

    for (const neighbor of graph.get(nodeId) ?? []) {
      if (dfs(neighbor)) return true
    }

    inStack.delete(nodeId)
    return false
  }

  for (const id of graph.keys()) {
    if (dfs(id)) return true
  }

  return false
}
```

- [ ] **Step 4: Update index.ts, run tests**

`packages/scene-framework/src/index.ts`:
```typescript
export * from './types.js'
export * from './builders.js'
export * from './validator.js'
```

Run: `pnpm --filter @dndmanager/scene-framework test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/scene-framework/src/
git commit -m "feat(scene-framework): add scenario validator with referential integrity and cycle detection"
```

---

### Task 4: Example Scenario

**Files:**
- Create: `scenarios/example-dungeon/index.ts`

- [ ] **Step 1: Create example scenario**

`scenarios/example-dungeon/index.ts`:
```typescript
import { scenario, map, room, encounter, npc, trigger, loot } from '@dndmanager/scene-framework'

export default scenario({
  name: "Goblin-Hoehle",
  level: { min: 1, max: 2 },
  description: "Eine kleine Goblin-Hoehle als Einstiegsabenteuer. Die Spieler muessen die Goblins besiegen und den gestohlenen Handelskarren zurueckholen.",

  maps: [
    map("cave", {
      tiles: "cave-stone",
      size: [15, 12],
      rooms: [
        room("entrance", {
          position: [0, 4],
          size: [4, 4],
          lighting: "bright",
          terrain: [
            { type: "difficult", area: [[1, 5], [2, 6]], reason: "Gestrueppbueschel" }
          ],
        }),
        room("guard-post", {
          position: [5, 3],
          size: [5, 6],
          lighting: "dim",
          terrain: [],
          features: ["campfire", "wooden-barricade"],
        }),
        room("boss-chamber", {
          position: [11, 2],
          size: [4, 8],
          lighting: "dim",
          terrain: [
            { type: "difficult", area: [[12, 4], [13, 6]], reason: "Gestohlene Waren" }
          ],
          features: ["stolen-cart", "crude-throne"],
        }),
      ],
      connections: [
        { from: "entrance", to: "guard-post", type: "open", length: 2 },
        { from: "guard-post", to: "boss-chamber", type: "door", length: 1 },
      ],
    }),
  ],

  npcs: [
    npc("goblin-boss", {
      monster: "pf2e:goblin-warrior",
      personality: "Feige aber laut. Versteckt sich hinter seinen Schergen.",
      knowledge: [
        "Hat den Handelskarren ueberfallen",
        "Hat 6 Goblins unter seinem Kommando",
        "Fuerchtet Feuer",
      ],
      dialogue_style: "Kreischt und droht in gebrochenem Common",
    }),
  ],

  encounters: [
    encounter("guard-encounter", {
      room: "guard-post",
      trigger: "on_enter",
      monsters: [
        { type: "pf2e:goblin-warrior", count: 3, positions: "spread" },
      ],
      difficulty: "moderate",
      tactics: "Goblins werfen zunaechst Gegenaende, dann greifen sie im Nahkampf an",
    }),
    encounter("boss-encounter", {
      room: "boss-chamber",
      trigger: "manual",
      monsters: [
        { type: "pf2e:goblin-warrior", count: 2, positions: "guarding-crude-throne" },
        { type: "pf2e:goblin-warrior", position: [12, 6] },
      ],
      difficulty: "severe",
      tactics: "Boss bleibt hinten, Wachen greifen zuerst an",
      phases: [
        { hp_threshold: 0.3, action: "surrender", description: "Der Boss gibt auf und bettelt um sein Leben" },
      ],
    }),
  ],

  triggers: [
    trigger("boss-surrender", {
      when: { encounter: "boss-encounter", phase: "surrender" },
      effects: [
        { type: "narrative", text: "Der Goblin-Boss wirft seine Waffe weg und kniet nieder." },
      ],
    }),
  ],

  loot: [
    loot("guard-loot", {
      encounter: "guard-encounter",
      mode: "fixed",
      guaranteed: ["pf2e:shortbow", "pf2e:dogslicer"],
    }),
    loot("boss-loot", {
      encounter: "boss-encounter",
      mode: "ai-generated",
      guaranteed: ["pf2e:minor-healing-potion"],
      context: "Goblin-Hoehle, Party Level 1-2, gestohlene Handelsgueter",
    }),
  ],
})
```

- [ ] **Step 2: Verify the scenario file has no TypeScript errors**

Run: `cd /Users/asanstefanski/Private/dndmanager && pnpm --filter @dndmanager/scene-framework typecheck`
Expected: No errors (the scenario file is not part of the package, but the types it uses are)

- [ ] **Step 3: Commit**

```bash
git add scenarios/example-dungeon/
git commit -m "feat(scenarios): add example Goblin Cave scenario"
```

---

### Task 5: Full Test Suite Verification

- [ ] **Step 1: Run all tests**

Run: `cd /Users/asanstefanski/Private/dndmanager && pnpm test`
Expected: All packages pass (shared, pf2e-engine, game-runtime, scene-framework)

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit if any changes**

Only commit if there are uncommitted changes (e.g., lockfile updates):
```bash
git add -A && git diff --cached --quiet || git commit -m "chore: update lockfile after scene-framework implementation"
```
