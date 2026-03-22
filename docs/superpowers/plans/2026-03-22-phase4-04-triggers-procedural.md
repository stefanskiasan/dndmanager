# Phase 4.4: Extended Trigger Logic & Procedural Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a trigger execution engine in game-runtime that evaluates scenario trigger conditions and executes effects at runtime, a boss phase system with HP-threshold state tracking, multi-room event chains, and procedural dungeon/wilderness generators in scene-framework with a CLI entry point.

**Architecture:** The trigger engine lives in `packages/game-runtime` and consumes `TriggerDef` from `@dndmanager/scene-framework`. It subscribes to `GameEvent` emissions, evaluates `TriggerCondition` predicates, and dispatches `TriggerEffect` actions that mutate `GameState`. Boss phases extend encounter state with HP-threshold tracking. Procedural generators live in `packages/scene-framework/src/generators/` as pure functions (seed-based PRNG, no side effects) that produce `Scenario` / `MapDef` structures. A CLI script wires the generators to `pnpm scenario:generate`.

**Tech Stack:** TypeScript strict, Vitest, @dndmanager/pf2e-engine (encounter budget XP tables), @dndmanager/scene-framework (types + builders + validator), @dndmanager/game-runtime (state machine + events)

**Spec:** `docs/superpowers/specs/2026-03-21-dndmanager-platform-design.md` (Sections 6 & 7)

---

## File Structure

```
packages/game-runtime/src/
├── triggers/
│   ├── index.ts                          → Public re-exports
│   ├── types.ts                          → TriggerRuntime types (TriggerState, EffectHandler)
│   ├── trigger-engine.ts                 → Core engine: evaluate conditions, dispatch effects
│   ├── condition-evaluator.ts            → Pure predicate functions per condition type
│   ├── effect-handlers.ts               → Effect executors: spawn, map_change, lighting, narrative, trigger
│   ├── boss-phases.ts                    → Boss phase tracker: HP thresholds, phase transitions
│   └── multi-room.ts                    → Cross-room event propagation
├── __tests__/
│   ├── trigger-engine.test.ts
│   ├── condition-evaluator.test.ts
│   ├── effect-handlers.test.ts
│   ├── boss-phases.test.ts
│   └── multi-room.test.ts

packages/scene-framework/src/
├── generators/
│   ├── index.ts                          → Public re-exports
│   ├── types.ts                          → Generator config types
│   ├── rng.ts                            → Seedable PRNG (pure, deterministic)
│   ├── dungeon-generator.ts              → BSP-based dungeon generation
│   ├── wilderness-generator.ts           → Template-based wilderness generation
│   ├── corridor-generator.ts             → Corridor/connection placement between rooms
│   ├── encounter-populator.ts            → Auto-populate encounters by difficulty budget
│   └── __tests__/
│       ├── rng.test.ts
│       ├── dungeon-generator.test.ts
│       ├── wilderness-generator.test.ts
│       ├── corridor-generator.test.ts
│       └── encounter-populator.test.ts

packages/scene-framework/src/
├── cli/
│   └── generate.ts                       → CLI entry point for pnpm scenario:generate
```

---

### Task 1: Trigger Runtime Types

**Files:**
- Create: `packages/game-runtime/src/triggers/types.ts`
- Create: `packages/game-runtime/src/triggers/index.ts`
- Modify: `packages/game-runtime/src/types.ts` (extend GameEventType)
- Modify: `packages/game-runtime/src/index.ts`

- [ ] **Step 1: Define trigger runtime types**

`packages/game-runtime/src/triggers/types.ts`:
```typescript
import type { TriggerDef, TriggerCondition, TriggerEffect } from '@dndmanager/scene-framework'
import type { GameState, GameEvent } from '../types.js'

// ─── Trigger State ───────────────────────────
export type TriggerStatus = 'armed' | 'fired' | 'disabled'

export interface TriggerState {
  id: string
  def: TriggerDef
  status: TriggerStatus
  firedAt?: number            // timestamp when fired
  fireCount: number           // how many times this trigger has fired
  maxFires: number            // -1 = unlimited, 1 = one-shot (default)
}

export interface TriggerEngineState {
  triggers: TriggerState[]
  bossPhases: BossPhaseState[]
  roomEventLinks: RoomEventLink[]
}

// ─── Boss Phases ─────────────────────────────
export interface BossPhaseState {
  encounterId: string
  tokenId: string
  phases: BossPhaseEntry[]
  currentPhaseIndex: number    // -1 = no phase active yet
}

export interface BossPhaseEntry {
  id: string
  hpThreshold: number          // 0.0–1.0 ratio
  action: string
  description: string
  triggered: boolean
}

// ─── Multi-Room Events ───────────────────────
export interface RoomEventLink {
  id: string
  sourceRoom: string
  sourceTriggerId: string
  targetRoom: string
  targetEffects: TriggerEffect[]
  delay?: number               // milliseconds delay before target effects fire
}

// ─── Effect Handler ──────────────────────────
export type EffectHandler = (
  effect: TriggerEffect,
  state: GameState,
  engineState: TriggerEngineState,
) => EffectResult

export interface EffectResult {
  state: GameState
  engineState: TriggerEngineState
  events: GameEvent[]
}

// ─── Condition Evaluator ─────────────────────
export type ConditionEvaluator = (
  condition: TriggerCondition,
  event: GameEvent,
  state: GameState,
  engineState: TriggerEngineState,
) => boolean
```

- [ ] **Step 2: Extend GameEventType in game-runtime types**

Add the following event types to `packages/game-runtime/src/types.ts` in the `GameEventType` union:
```typescript
  | 'trigger_fired'
  | 'trigger_disabled'
  | 'boss_phase_entered'
  | 'boss_phase_effect'
  | 'room_event_propagated'
  | 'spawn_executed'
  | 'lighting_changed'
  | 'map_changed'
  | 'narrative_displayed'
```

- [ ] **Step 3: Create triggers/index.ts re-exports**

`packages/game-runtime/src/triggers/index.ts`:
```typescript
export * from './types.js'
export { TriggerEngine, createTriggerEngine } from './trigger-engine.js'
export { evaluateCondition } from './condition-evaluator.js'
export { handleEffect, effectHandlers } from './effect-handlers.js'
export { createBossPhaseTracker, checkBossPhases } from './boss-phases.js'
export { createRoomEventLinks, propagateRoomEvent } from './multi-room.js'
```

- [ ] **Step 4: Update game-runtime index.ts**

Add to `packages/game-runtime/src/index.ts`:
```typescript
export * from './triggers/index.js'
```

- [ ] **Step 5: Verify typecheck**

Run: `pnpm --filter @dndmanager/game-runtime typecheck`
Expected: No errors (will fail until implementation files exist — types file should be clean)

- [ ] **Step 6: Commit**

```bash
git add packages/game-runtime/src/triggers/ packages/game-runtime/src/types.ts packages/game-runtime/src/index.ts
git commit -m "feat(game-runtime): add trigger runtime types and extend game event types"
```

---

### Task 2: Condition Evaluator (Pure Functions)

**Files:**
- Create: `packages/game-runtime/src/triggers/condition-evaluator.ts`
- Test: `packages/game-runtime/src/__tests__/condition-evaluator.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/game-runtime/src/__tests__/condition-evaluator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { evaluateCondition } from '../triggers/condition-evaluator.js'
import type { GameState, GameEvent } from '../types.js'
import type { TriggerEngineState } from '../triggers/types.js'
import type { TriggerCondition } from '@dndmanager/scene-framework'

function mockState(overrides?: Partial<GameState>): GameState {
  return {
    id: 'gs1', sessionId: 's1', mode: 'exploration',
    tokens: [], initiative: [], turnOrder: [],
    currentTurnIndex: -1, turn: null, round: 0, actionLog: [],
    ...overrides,
  }
}

function mockEngineState(): TriggerEngineState {
  return { triggers: [], bossPhases: [], roomEventLinks: [] }
}

describe('evaluateCondition', () => {
  it('returns true when encounter condition matches encounter_start event', () => {
    const cond: TriggerCondition = { encounter: 'boss-fight' }
    const event: GameEvent = {
      type: 'encounter_start',
      timestamp: 1,
      data: { encounterId: 'boss-fight' },
    }
    expect(evaluateCondition(cond, event, mockState(), mockEngineState())).toBe(true)
  })

  it('returns false when encounter ID does not match', () => {
    const cond: TriggerCondition = { encounter: 'boss-fight' }
    const event: GameEvent = {
      type: 'encounter_start',
      timestamp: 1,
      data: { encounterId: 'guard-patrol' },
    }
    expect(evaluateCondition(cond, event, mockState(), mockEngineState())).toBe(false)
  })

  it('matches room_entered condition on token_moved event', () => {
    const cond: TriggerCondition = { room_entered: 'throne-room' }
    const event: GameEvent = {
      type: 'token_moved',
      timestamp: 1,
      data: { tokenId: 't1', roomId: 'throne-room' },
    }
    expect(evaluateCondition(cond, event, mockState(), mockEngineState())).toBe(true)
  })

  it('matches boss phase condition on boss_phase_entered event', () => {
    const cond: TriggerCondition = { encounter: 'boss-fight', phase: 'flee' }
    const event: GameEvent = {
      type: 'boss_phase_entered',
      timestamp: 1,
      data: { encounterId: 'boss-fight', phase: 'flee' },
    }
    expect(evaluateCondition(cond, event, mockState(), mockEngineState())).toBe(true)
  })

  it('matches item_used condition on action_performed event', () => {
    const cond: TriggerCondition = { item_used: 'golden-key' }
    const event: GameEvent = {
      type: 'action_performed',
      timestamp: 1,
      data: { type: 'use_item', itemId: 'golden-key' },
    }
    expect(evaluateCondition(cond, event, mockState(), mockEngineState())).toBe(true)
  })

  it('returns true for empty condition (always-true trigger)', () => {
    const cond: TriggerCondition = {}
    const event: GameEvent = { type: 'round_start', timestamp: 1, data: {} }
    expect(evaluateCondition(cond, event, mockState(), mockEngineState())).toBe(true)
  })

  it('requires ALL conditions to match (AND semantics)', () => {
    const cond: TriggerCondition = { encounter: 'boss-fight', phase: 'rage' }
    const event: GameEvent = {
      type: 'boss_phase_entered',
      timestamp: 1,
      data: { encounterId: 'boss-fight', phase: 'flee' },
    }
    expect(evaluateCondition(cond, event, mockState(), mockEngineState())).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: FAIL

- [ ] **Step 3: Implement condition-evaluator.ts**

`packages/game-runtime/src/triggers/condition-evaluator.ts`:
```typescript
import type { TriggerCondition } from '@dndmanager/scene-framework'
import type { GameState, GameEvent } from '../types.js'
import type { TriggerEngineState } from './types.js'

/**
 * Evaluates whether a trigger condition matches a given game event.
 * All specified fields must match (AND semantics).
 * An empty condition matches any event.
 */
export function evaluateCondition(
  condition: TriggerCondition,
  event: GameEvent,
  _state: GameState,
  _engineState: TriggerEngineState,
): boolean {
  const checks: boolean[] = []

  if (condition.encounter !== undefined) {
    checks.push(matchEncounter(condition.encounter, event))
  }

  if (condition.phase !== undefined) {
    checks.push(matchPhase(condition.phase, event))
  }

  if (condition.room_entered !== undefined) {
    checks.push(matchRoomEntered(condition.room_entered, event))
  }

  if (condition.item_used !== undefined) {
    checks.push(matchItemUsed(condition.item_used, event))
  }

  // Empty condition = always true
  if (checks.length === 0) return true

  return checks.every(Boolean)
}

function matchEncounter(encounterId: string, event: GameEvent): boolean {
  return (
    (event.type === 'encounter_start' || event.type === 'encounter_end' || event.type === 'boss_phase_entered') &&
    event.data.encounterId === encounterId
  )
}

function matchPhase(phase: string, event: GameEvent): boolean {
  return event.type === 'boss_phase_entered' && event.data.phase === phase
}

function matchRoomEntered(roomId: string, event: GameEvent): boolean {
  return event.type === 'token_moved' && event.data.roomId === roomId
}

function matchItemUsed(itemId: string, event: GameEvent): boolean {
  return event.type === 'action_performed' && event.data.type === 'use_item' && event.data.itemId === itemId
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: All condition-evaluator tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/game-runtime/src/triggers/condition-evaluator.ts packages/game-runtime/src/__tests__/condition-evaluator.test.ts
git commit -m "feat(game-runtime): add trigger condition evaluator with AND semantics"
```

---

### Task 3: Effect Handlers

**Files:**
- Create: `packages/game-runtime/src/triggers/effect-handlers.ts`
- Test: `packages/game-runtime/src/__tests__/effect-handlers.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/game-runtime/src/__tests__/effect-handlers.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { handleEffect } from '../triggers/effect-handlers.js'
import type { GameState } from '../types.js'
import type { TriggerEngineState } from '../triggers/types.js'
import type { TriggerEffect } from '@dndmanager/scene-framework'

function mockState(overrides?: Partial<GameState>): GameState {
  return {
    id: 'gs1', sessionId: 's1', mode: 'encounter',
    tokens: [], initiative: [], turnOrder: [],
    currentTurnIndex: -1, turn: null, round: 1, actionLog: [],
    ...overrides,
  }
}

function mockEngineState(): TriggerEngineState {
  return { triggers: [], bossPhases: [], roomEventLinks: [] }
}

describe('handleEffect', () => {
  describe('spawn effect', () => {
    it('adds new tokens to game state', () => {
      const effect: TriggerEffect = {
        type: 'spawn',
        monsters: [{ type: 'pf2e:shadow', count: 2 }],
        room: 'throne',
        positions: [[5, 3], [5, 4]],
      }
      const result = handleEffect(effect, mockState(), mockEngineState())
      expect(result.state.tokens).toHaveLength(2)
      expect(result.events).toContainEqual(expect.objectContaining({ type: 'spawn_executed' }))
    })
  })

  describe('lighting effect', () => {
    it('emits lighting_changed event', () => {
      const effect: TriggerEffect = {
        type: 'lighting',
        room: 'throne',
        to: 'darkness',
      }
      const result = handleEffect(effect, mockState(), mockEngineState())
      expect(result.events).toContainEqual(
        expect.objectContaining({ type: 'lighting_changed', data: expect.objectContaining({ room: 'throne', to: 'darkness' }) })
      )
    })
  })

  describe('narrative effect', () => {
    it('emits narrative_displayed event with text', () => {
      const effect: TriggerEffect = {
        type: 'narrative',
        text: 'The ground shakes violently.',
      }
      const result = handleEffect(effect, mockState(), mockEngineState())
      expect(result.events).toContainEqual(
        expect.objectContaining({ type: 'narrative_displayed', data: expect.objectContaining({ text: 'The ground shakes violently.' }) })
      )
    })
  })

  describe('map_change effect', () => {
    it('emits map_changed event', () => {
      const effect: TriggerEffect = {
        type: 'map_change',
        mapId: 'underground-level2',
      }
      const result = handleEffect(effect, mockState(), mockEngineState())
      expect(result.events).toContainEqual(
        expect.objectContaining({ type: 'map_changed', data: expect.objectContaining({ mapId: 'underground-level2' }) })
      )
    })
  })

  describe('trigger (chain) effect', () => {
    it('marks chained trigger as armed for re-evaluation', () => {
      const es = mockEngineState()
      es.triggers.push({
        id: 'chain-target',
        def: { id: 'chain-target', when: {}, effects: [] },
        status: 'armed',
        fireCount: 0,
        maxFires: 1,
      })
      const effect: TriggerEffect = {
        type: 'trigger',
        target: 'chain-target',
      }
      const result = handleEffect(effect, mockState(), es)
      expect(result.events).toContainEqual(
        expect.objectContaining({ type: 'trigger_fired', data: expect.objectContaining({ triggerId: 'chain-target' }) })
      )
    })
  })

  it('returns unchanged state for unknown effect type', () => {
    const effect: TriggerEffect = { type: 'audio' as any, track: 'boss-music' }
    const state = mockState()
    const es = mockEngineState()
    const result = handleEffect(effect, state, es)
    expect(result.state).toEqual(state)
    expect(result.events).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: FAIL

- [ ] **Step 3: Implement effect-handlers.ts**

`packages/game-runtime/src/triggers/effect-handlers.ts`:
```typescript
import type { TriggerEffect } from '@dndmanager/scene-framework'
import type { GameState, GameEvent, Token } from '../types.js'
import type { TriggerEngineState, EffectResult } from './types.js'
import { createEvent } from '../events.js'

type Handler = (effect: TriggerEffect, state: GameState, engineState: TriggerEngineState) => EffectResult

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function unchanged(state: GameState, engineState: TriggerEngineState): EffectResult {
  return { state, engineState, events: [] }
}

// ─── Spawn ───────────────────────────────────
function handleSpawn(effect: TriggerEffect, state: GameState, engineState: TriggerEngineState): EffectResult {
  const monsters = (effect.monsters as Array<{ type: string; count?: number }>) ?? []
  const positions = (effect.positions as Array<[number, number]>) ?? []
  const newTokens: Token[] = []
  let posIdx = 0

  for (const m of monsters) {
    const count = m.count ?? 1
    for (let i = 0; i < count; i++) {
      const pos = positions[posIdx] ?? [0, 0]
      posIdx++
      newTokens.push({
        id: generateId(),
        name: m.type.replace('pf2e:', ''),
        type: 'monster',
        ownerId: 'gm',
        position: { x: pos[0], y: pos[1] },
        speed: 25,
        conditions: [],
        hp: { current: 1, max: 1, temp: 0 },
        ac: 10,
        visible: true,
      })
    }
  }

  return {
    state: { ...state, tokens: [...state.tokens, ...newTokens] },
    engineState,
    events: [createEvent('spawn_executed', { room: effect.room, count: newTokens.length, monsters: monsters.map((m) => m.type) })],
  }
}

// ─── Lighting ────────────────────────────────
function handleLighting(effect: TriggerEffect, state: GameState, engineState: TriggerEngineState): EffectResult {
  return {
    state,
    engineState,
    events: [createEvent('lighting_changed', { room: effect.room, to: effect.to })],
  }
}

// ─── Narrative ───────────────────────────────
function handleNarrative(effect: TriggerEffect, state: GameState, engineState: TriggerEngineState): EffectResult {
  return {
    state,
    engineState,
    events: [createEvent('narrative_displayed', { text: effect.text })],
  }
}

// ─── Map Change ──────────────────────────────
function handleMapChange(effect: TriggerEffect, state: GameState, engineState: TriggerEngineState): EffectResult {
  return {
    state,
    engineState,
    events: [createEvent('map_changed', { mapId: effect.mapId })],
  }
}

// ─── Trigger Chain ───────────────────────────
function handleTriggerChain(effect: TriggerEffect, state: GameState, engineState: TriggerEngineState): EffectResult {
  const targetId = effect.target as string
  const target = engineState.triggers.find((t) => t.id === targetId)
  if (!target) return unchanged(state, engineState)

  return {
    state,
    engineState,
    events: [createEvent('trigger_fired', { triggerId: targetId, chainedFrom: true })],
  }
}

// ─── Registry ────────────────────────────────
export const effectHandlers: Record<string, Handler> = {
  spawn: handleSpawn,
  lighting: handleLighting,
  narrative: handleNarrative,
  map_change: handleMapChange,
  trigger: handleTriggerChain,
}

export function handleEffect(
  effect: TriggerEffect,
  state: GameState,
  engineState: TriggerEngineState,
): EffectResult {
  const handler = effectHandlers[effect.type]
  if (!handler) return unchanged(state, engineState)
  return handler(effect, state, engineState)
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: All effect-handler tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/game-runtime/src/triggers/effect-handlers.ts packages/game-runtime/src/__tests__/effect-handlers.test.ts
git commit -m "feat(game-runtime): add trigger effect handlers (spawn, lighting, narrative, map_change, chain)"
```

---

### Task 4: Trigger Execution Engine

**Files:**
- Create: `packages/game-runtime/src/triggers/trigger-engine.ts`
- Test: `packages/game-runtime/src/__tests__/trigger-engine.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/game-runtime/src/__tests__/trigger-engine.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createTriggerEngine, TriggerEngine } from '../triggers/trigger-engine.js'
import type { GameState, GameEvent } from '../types.js'
import type { TriggerDef } from '@dndmanager/scene-framework'

function mockState(overrides?: Partial<GameState>): GameState {
  return {
    id: 'gs1', sessionId: 's1', mode: 'encounter',
    tokens: [], initiative: [], turnOrder: [],
    currentTurnIndex: -1, turn: null, round: 1, actionLog: [],
    ...overrides,
  }
}

describe('TriggerEngine', () => {
  it('creates engine from trigger definitions', () => {
    const defs: TriggerDef[] = [
      { id: 'alarm', when: { room_entered: 'vault' }, effects: [{ type: 'narrative', text: 'An alarm sounds!' }] },
    ]
    const engine = createTriggerEngine(defs)
    expect(engine.getState().triggers).toHaveLength(1)
    expect(engine.getState().triggers[0].status).toBe('armed')
  })

  it('fires a one-shot trigger on matching event', () => {
    const defs: TriggerDef[] = [
      { id: 'alarm', when: { room_entered: 'vault' }, effects: [{ type: 'narrative', text: 'An alarm sounds!' }] },
    ]
    const engine = createTriggerEngine(defs)
    const event: GameEvent = { type: 'token_moved', timestamp: 1, data: { tokenId: 't1', roomId: 'vault' } }
    const result = engine.processEvent(event, mockState())

    expect(result.events.some((e) => e.type === 'trigger_fired')).toBe(true)
    expect(result.events.some((e) => e.type === 'narrative_displayed')).toBe(true)
    expect(engine.getState().triggers[0].status).toBe('fired')
  })

  it('does not fire an already-fired one-shot trigger', () => {
    const defs: TriggerDef[] = [
      { id: 'alarm', when: { room_entered: 'vault' }, effects: [{ type: 'narrative', text: 'An alarm sounds!' }] },
    ]
    const engine = createTriggerEngine(defs)
    const event: GameEvent = { type: 'token_moved', timestamp: 1, data: { tokenId: 't1', roomId: 'vault' } }

    engine.processEvent(event, mockState())
    const result2 = engine.processEvent(event, mockState())
    expect(result2.events.filter((e) => e.type === 'narrative_displayed')).toHaveLength(0)
  })

  it('processes trigger chains', () => {
    const defs: TriggerDef[] = [
      { id: 'trap', when: { room_entered: 'hallway' }, effects: [{ type: 'trigger', target: 'collapse' }] },
      { id: 'collapse', when: {}, effects: [{ type: 'narrative', text: 'The ceiling collapses!' }] },
    ]
    const engine = createTriggerEngine(defs)
    const event: GameEvent = { type: 'token_moved', timestamp: 1, data: { tokenId: 't1', roomId: 'hallway' } }
    const result = engine.processEvent(event, mockState())

    expect(result.events.some((e) => e.type === 'narrative_displayed' && e.data.text === 'The ceiling collapses!')).toBe(true)
  })

  it('can disable a trigger', () => {
    const defs: TriggerDef[] = [
      { id: 'alarm', when: { room_entered: 'vault' }, effects: [{ type: 'narrative', text: 'Alarm!' }] },
    ]
    const engine = createTriggerEngine(defs)
    engine.disableTrigger('alarm')
    expect(engine.getState().triggers[0].status).toBe('disabled')

    const event: GameEvent = { type: 'token_moved', timestamp: 1, data: { tokenId: 't1', roomId: 'vault' } }
    const result = engine.processEvent(event, mockState())
    expect(result.events.filter((e) => e.type === 'narrative_displayed')).toHaveLength(0)
  })

  it('can re-arm a trigger', () => {
    const defs: TriggerDef[] = [
      { id: 'alarm', when: { room_entered: 'vault' }, effects: [{ type: 'narrative', text: 'Alarm!' }] },
    ]
    const engine = createTriggerEngine(defs)
    engine.disableTrigger('alarm')
    engine.rearmTrigger('alarm')
    expect(engine.getState().triggers[0].status).toBe('armed')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: FAIL

- [ ] **Step 3: Implement trigger-engine.ts**

`packages/game-runtime/src/triggers/trigger-engine.ts`:
```typescript
import type { TriggerDef } from '@dndmanager/scene-framework'
import type { GameState, GameEvent } from '../types.js'
import type { TriggerEngineState, TriggerState, EffectResult } from './types.js'
import { evaluateCondition } from './condition-evaluator.js'
import { handleEffect } from './effect-handlers.js'
import { createEvent } from '../events.js'

export interface TriggerEngineResult {
  state: GameState
  events: GameEvent[]
}

export interface TriggerEngine {
  getState(): TriggerEngineState
  processEvent(event: GameEvent, gameState: GameState): TriggerEngineResult
  disableTrigger(id: string): void
  rearmTrigger(id: string): void
}

export function createTriggerEngine(defs: TriggerDef[], options?: { maxChainDepth?: number }): TriggerEngine {
  const maxChainDepth = options?.maxChainDepth ?? 10

  let engineState: TriggerEngineState = {
    triggers: defs.map((def): TriggerState => ({
      id: def.id,
      def,
      status: 'armed',
      fireCount: 0,
      maxFires: 1,
    })),
    bossPhases: [],
    roomEventLinks: [],
  }

  function processEvent(event: GameEvent, gameState: GameState): TriggerEngineResult {
    const allEvents: GameEvent[] = []
    let currentState = gameState
    const eventsToProcess: GameEvent[] = [event]
    let depth = 0

    while (eventsToProcess.length > 0 && depth < maxChainDepth) {
      const currentEvent = eventsToProcess.shift()!
      depth++

      for (const triggerState of engineState.triggers) {
        if (triggerState.status !== 'armed') continue

        if (!evaluateCondition(triggerState.def.when, currentEvent, currentState, engineState)) continue

        // Fire trigger
        triggerState.fireCount++
        if (triggerState.maxFires > 0 && triggerState.fireCount >= triggerState.maxFires) {
          triggerState.status = 'fired'
        }
        triggerState.firedAt = Date.now()

        allEvents.push(createEvent('trigger_fired', { triggerId: triggerState.id }))

        // Execute effects
        for (const effect of triggerState.def.effects) {
          const result: EffectResult = handleEffect(effect, currentState, engineState)
          currentState = result.state
          engineState = result.engineState
          allEvents.push(...result.events)

          // Chain triggers: if the effect produced trigger_fired events, queue them
          for (const evt of result.events) {
            if (evt.type === 'trigger_fired' && evt.data.chainedFrom) {
              eventsToProcess.push(evt)
            }
          }
        }
      }
    }

    return { state: currentState, events: allEvents }
  }

  function disableTrigger(id: string): void {
    const t = engineState.triggers.find((t) => t.id === id)
    if (t) t.status = 'disabled'
  }

  function rearmTrigger(id: string): void {
    const t = engineState.triggers.find((t) => t.id === id)
    if (t) {
      t.status = 'armed'
      t.fireCount = 0
    }
  }

  return {
    getState: () => engineState,
    processEvent,
    disableTrigger,
    rearmTrigger,
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: All trigger-engine tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/game-runtime/src/triggers/trigger-engine.ts packages/game-runtime/src/__tests__/trigger-engine.test.ts
git commit -m "feat(game-runtime): add trigger execution engine with chaining and one-shot support"
```

---

### Task 5: Boss Phase System

**Files:**
- Create: `packages/game-runtime/src/triggers/boss-phases.ts`
- Test: `packages/game-runtime/src/__tests__/boss-phases.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/game-runtime/src/__tests__/boss-phases.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createBossPhaseTracker, checkBossPhases } from '../triggers/boss-phases.js'
import type { GameState, Token } from '../types.js'
import type { EncounterDef } from '@dndmanager/scene-framework'
import type { TriggerEngineState } from '../triggers/types.js'

function bossToken(hpCurrent: number, hpMax: number): Token {
  return {
    id: 'boss-token',
    name: 'Dragon',
    type: 'monster',
    ownerId: 'gm',
    position: { x: 5, y: 5 },
    speed: 30,
    conditions: [],
    hp: { current: hpCurrent, max: hpMax, temp: 0 },
    ac: 22,
    visible: true,
  }
}

function mockState(tokens: Token[]): GameState {
  return {
    id: 'gs1', sessionId: 's1', mode: 'encounter',
    tokens, initiative: [], turnOrder: [],
    currentTurnIndex: -1, turn: null, round: 1, actionLog: [],
  }
}

describe('createBossPhaseTracker', () => {
  it('creates phase tracker from encounter definition', () => {
    const enc: EncounterDef = {
      id: 'dragon-fight',
      room: 'lair',
      trigger: 'manual',
      monsters: [{ type: 'pf2e:ancient-dragon' }],
      difficulty: 'extreme',
      phases: [
        { hp_threshold: 0.75, action: 'rage', description: 'Dragon enters a rage' },
        { hp_threshold: 0.5, action: 'call-minions', description: 'Dragon calls minions' },
        { hp_threshold: 0.25, action: 'flee', description: 'Dragon attempts to flee' },
      ],
    }
    const tracker = createBossPhaseTracker(enc, 'boss-token')
    expect(tracker.phases).toHaveLength(3)
    expect(tracker.currentPhaseIndex).toBe(-1)
    expect(tracker.phases[0].triggered).toBe(false)
  })
})

describe('checkBossPhases', () => {
  it('triggers phase when HP drops below threshold', () => {
    const enc: EncounterDef = {
      id: 'dragon-fight', room: 'lair', trigger: 'manual',
      monsters: [{ type: 'pf2e:ancient-dragon' }], difficulty: 'extreme',
      phases: [
        { hp_threshold: 0.5, action: 'rage', description: 'Dragon enters a rage' },
      ],
    }
    const tracker = createBossPhaseTracker(enc, 'boss-token')
    const engineState: TriggerEngineState = {
      triggers: [], bossPhases: [tracker], roomEventLinks: [],
    }

    // Boss at 40% HP (below 0.5 threshold)
    const state = mockState([bossToken(40, 100)])
    const result = checkBossPhases(state, engineState)

    expect(result.events).toContainEqual(
      expect.objectContaining({ type: 'boss_phase_entered', data: expect.objectContaining({ phase: 'rage' }) })
    )
    expect(result.engineState.bossPhases[0].phases[0].triggered).toBe(true)
    expect(result.engineState.bossPhases[0].currentPhaseIndex).toBe(0)
  })

  it('does not re-trigger already triggered phase', () => {
    const enc: EncounterDef = {
      id: 'dragon-fight', room: 'lair', trigger: 'manual',
      monsters: [{ type: 'pf2e:ancient-dragon' }], difficulty: 'extreme',
      phases: [
        { hp_threshold: 0.5, action: 'rage', description: 'Dragon enters a rage' },
      ],
    }
    const tracker = createBossPhaseTracker(enc, 'boss-token')
    tracker.phases[0].triggered = true
    tracker.currentPhaseIndex = 0
    const engineState: TriggerEngineState = {
      triggers: [], bossPhases: [tracker], roomEventLinks: [],
    }
    const state = mockState([bossToken(40, 100)])
    const result = checkBossPhases(state, engineState)
    expect(result.events.filter((e) => e.type === 'boss_phase_entered')).toHaveLength(0)
  })

  it('triggers multiple phases in order when HP drops significantly', () => {
    const enc: EncounterDef = {
      id: 'dragon-fight', room: 'lair', trigger: 'manual',
      monsters: [{ type: 'pf2e:ancient-dragon' }], difficulty: 'extreme',
      phases: [
        { hp_threshold: 0.75, action: 'rage', description: 'Rage' },
        { hp_threshold: 0.5, action: 'call-minions', description: 'Call minions' },
        { hp_threshold: 0.25, action: 'flee', description: 'Flee' },
      ],
    }
    const tracker = createBossPhaseTracker(enc, 'boss-token')
    const engineState: TriggerEngineState = {
      triggers: [], bossPhases: [tracker], roomEventLinks: [],
    }

    // Boss at 20% HP — should trigger all 3 phases
    const state = mockState([bossToken(20, 100)])
    const result = checkBossPhases(state, engineState)

    const phaseEvents = result.events.filter((e) => e.type === 'boss_phase_entered')
    expect(phaseEvents).toHaveLength(3)
    expect(phaseEvents[0].data.phase).toBe('rage')
    expect(phaseEvents[1].data.phase).toBe('call-minions')
    expect(phaseEvents[2].data.phase).toBe('flee')
  })

  it('returns empty events when no phases need triggering', () => {
    const enc: EncounterDef = {
      id: 'dragon-fight', room: 'lair', trigger: 'manual',
      monsters: [{ type: 'pf2e:ancient-dragon' }], difficulty: 'extreme',
      phases: [
        { hp_threshold: 0.5, action: 'rage', description: 'Rage' },
      ],
    }
    const tracker = createBossPhaseTracker(enc, 'boss-token')
    const engineState: TriggerEngineState = {
      triggers: [], bossPhases: [tracker], roomEventLinks: [],
    }

    // Boss at 80% HP — above threshold
    const state = mockState([bossToken(80, 100)])
    const result = checkBossPhases(state, engineState)
    expect(result.events).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: FAIL

- [ ] **Step 3: Implement boss-phases.ts**

`packages/game-runtime/src/triggers/boss-phases.ts`:
```typescript
import type { EncounterDef } from '@dndmanager/scene-framework'
import type { GameState, GameEvent } from '../types.js'
import type { TriggerEngineState, BossPhaseState, BossPhaseEntry } from './types.js'
import { createEvent } from '../events.js'

export function createBossPhaseTracker(encounter: EncounterDef, tokenId: string): BossPhaseState {
  const phases: BossPhaseEntry[] = (encounter.phases ?? [])
    .sort((a, b) => b.hp_threshold - a.hp_threshold) // highest threshold first
    .map((p, i) => ({
      id: `${encounter.id}-phase-${i}`,
      hpThreshold: p.hp_threshold,
      action: p.action,
      description: p.description,
      triggered: false,
    }))

  return {
    encounterId: encounter.id,
    tokenId,
    phases,
    currentPhaseIndex: -1,
  }
}

export interface BossPhaseResult {
  engineState: TriggerEngineState
  events: GameEvent[]
}

/**
 * Check all boss phase trackers against current token HP.
 * Returns events for newly triggered phases (in order, highest threshold first).
 */
export function checkBossPhases(
  state: GameState,
  engineState: TriggerEngineState,
): BossPhaseResult {
  const events: GameEvent[] = []
  const updatedBossPhases = engineState.bossPhases.map((tracker) => {
    const token = state.tokens.find((t) => t.id === tracker.tokenId)
    if (!token) return tracker

    const hpRatio = token.hp.current / token.hp.max
    let currentPhaseIndex = tracker.currentPhaseIndex
    const updatedPhases = tracker.phases.map((phase, idx) => {
      if (phase.triggered) return phase
      if (hpRatio > phase.hpThreshold) return phase

      // HP is at or below threshold — trigger this phase
      currentPhaseIndex = idx
      events.push(createEvent('boss_phase_entered', {
        encounterId: tracker.encounterId,
        tokenId: tracker.tokenId,
        phase: phase.action,
        description: phase.description,
        hpRatio,
      }))
      return { ...phase, triggered: true }
    })

    return { ...tracker, phases: updatedPhases, currentPhaseIndex }
  })

  return {
    engineState: { ...engineState, bossPhases: updatedBossPhases },
    events,
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: All boss-phases tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/game-runtime/src/triggers/boss-phases.ts packages/game-runtime/src/__tests__/boss-phases.test.ts
git commit -m "feat(game-runtime): add boss phase system with HP-threshold tracking"
```

---

### Task 6: Multi-Room Event Chains

**Files:**
- Create: `packages/game-runtime/src/triggers/multi-room.ts`
- Test: `packages/game-runtime/src/__tests__/multi-room.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/game-runtime/src/__tests__/multi-room.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createRoomEventLinks, propagateRoomEvent } from '../triggers/multi-room.js'
import type { TriggerDef } from '@dndmanager/scene-framework'
import type { GameState } from '../types.js'
import type { TriggerEngineState, RoomEventLink } from '../triggers/types.js'

function mockState(): GameState {
  return {
    id: 'gs1', sessionId: 's1', mode: 'encounter',
    tokens: [], initiative: [], turnOrder: [],
    currentTurnIndex: -1, turn: null, round: 1, actionLog: [],
  }
}

describe('createRoomEventLinks', () => {
  it('extracts room event links from trigger definitions', () => {
    const defs: TriggerDef[] = [
      {
        id: 'alarm-chain',
        when: { room_entered: 'vault' },
        effects: [
          { type: 'lighting', room: 'corridor', to: 'bright' },
          { type: 'spawn', room: 'guard-room', monsters: [{ type: 'pf2e:guard', count: 2 }] },
        ],
      },
    ]
    const links = createRoomEventLinks(defs)
    // Trigger in vault produces effects in corridor and guard-room
    expect(links).toHaveLength(2)
    expect(links.some((l) => l.sourceRoom === 'vault' && l.targetRoom === 'corridor')).toBe(true)
    expect(links.some((l) => l.sourceRoom === 'vault' && l.targetRoom === 'guard-room')).toBe(true)
  })

  it('returns empty array when no cross-room effects exist', () => {
    const defs: TriggerDef[] = [
      { id: 'local', when: { room_entered: 'vault' }, effects: [{ type: 'narrative', text: 'You see gold' }] },
    ]
    const links = createRoomEventLinks(defs)
    expect(links).toHaveLength(0)
  })
})

describe('propagateRoomEvent', () => {
  it('generates events for linked rooms when source trigger fires', () => {
    const link: RoomEventLink = {
      id: 'alarm-to-guard',
      sourceRoom: 'vault',
      sourceTriggerId: 'alarm-chain',
      targetRoom: 'guard-room',
      targetEffects: [{ type: 'spawn', room: 'guard-room', monsters: [{ type: 'pf2e:guard', count: 2 }] }],
    }
    const engineState: TriggerEngineState = {
      triggers: [], bossPhases: [], roomEventLinks: [link],
    }

    const result = propagateRoomEvent('alarm-chain', 'vault', mockState(), engineState)
    expect(result.events.some((e) => e.type === 'room_event_propagated')).toBe(true)
    expect(result.events.some((e) => e.type === 'spawn_executed')).toBe(true)
  })

  it('does not propagate when source room does not match', () => {
    const link: RoomEventLink = {
      id: 'alarm-to-guard',
      sourceRoom: 'vault',
      sourceTriggerId: 'alarm-chain',
      targetRoom: 'guard-room',
      targetEffects: [{ type: 'narrative', text: 'Guards alert!' }],
    }
    const engineState: TriggerEngineState = {
      triggers: [], bossPhases: [], roomEventLinks: [link],
    }

    const result = propagateRoomEvent('alarm-chain', 'hallway', mockState(), engineState)
    expect(result.events).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: FAIL

- [ ] **Step 3: Implement multi-room.ts**

`packages/game-runtime/src/triggers/multi-room.ts`:
```typescript
import type { TriggerDef, TriggerEffect } from '@dndmanager/scene-framework'
import type { GameState, GameEvent } from '../types.js'
import type { TriggerEngineState, RoomEventLink } from './types.js'
import { handleEffect } from './effect-handlers.js'
import { createEvent } from '../events.js'

/**
 * Analyze trigger definitions and extract cross-room event links.
 * A link exists when a trigger's when.room_entered points to room A
 * but an effect targets room B (via effect.room field).
 */
export function createRoomEventLinks(defs: TriggerDef[]): RoomEventLink[] {
  const links: RoomEventLink[] = []

  for (const def of defs) {
    const sourceRoom = def.when.room_entered
    if (!sourceRoom) continue

    for (const effect of def.effects) {
      const targetRoom = effect.room as string | undefined
      if (targetRoom && targetRoom !== sourceRoom) {
        links.push({
          id: `${def.id}-to-${targetRoom}`,
          sourceRoom,
          sourceTriggerId: def.id,
          targetRoom,
          targetEffects: [effect],
        })
      }
    }
  }

  return links
}

export interface RoomEventResult {
  state: GameState
  engineState: TriggerEngineState
  events: GameEvent[]
}

/**
 * When a trigger fires in a source room, propagate effects to linked target rooms.
 */
export function propagateRoomEvent(
  triggerId: string,
  sourceRoom: string,
  state: GameState,
  engineState: TriggerEngineState,
): RoomEventResult {
  const events: GameEvent[] = []
  let currentState = state
  let currentEngineState = engineState

  const matchingLinks = engineState.roomEventLinks.filter(
    (link) => link.sourceTriggerId === triggerId && link.sourceRoom === sourceRoom
  )

  for (const link of matchingLinks) {
    events.push(createEvent('room_event_propagated', {
      sourceRoom: link.sourceRoom,
      targetRoom: link.targetRoom,
      triggerId,
    }))

    for (const effect of link.targetEffects) {
      const result = handleEffect(effect, currentState, currentEngineState)
      currentState = result.state
      currentEngineState = result.engineState
      events.push(...result.events)
    }
  }

  return { state: currentState, engineState: currentEngineState, events }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: All multi-room tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/game-runtime/src/triggers/multi-room.ts packages/game-runtime/src/__tests__/multi-room.test.ts
git commit -m "feat(game-runtime): add multi-room event chain propagation"
```

---

### Task 7: Seedable PRNG (Pure Function)

**Files:**
- Create: `packages/scene-framework/src/generators/rng.ts`
- Test: `packages/scene-framework/src/generators/__tests__/rng.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/scene-framework/src/generators/__tests__/rng.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createRng, type Rng } from '../rng.js'

describe('createRng', () => {
  it('produces deterministic sequence from same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences from different seeds', () => {
    const a = createRng(42)
    const b = createRng(99)
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).not.toEqual(seqB)
  })

  it('next() returns values in [0, 1)', () => {
    const rng = createRng(123)
    for (let i = 0; i < 1000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('intRange returns integers within [min, max]', () => {
    const rng = createRng(7)
    for (let i = 0; i < 200; i++) {
      const v = rng.intRange(3, 8)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(8)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('pick selects an element from an array', () => {
    const rng = createRng(55)
    const items = ['a', 'b', 'c', 'd']
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(rng.pick(items))
    }
  })

  it('shuffle returns a permutation with all elements', () => {
    const rng = createRng(10)
    const original = [1, 2, 3, 4, 5, 6, 7, 8]
    const shuffled = rng.shuffle([...original])
    expect(shuffled.sort()).toEqual(original.sort())
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/scene-framework test`
Expected: FAIL

- [ ] **Step 3: Implement rng.ts**

`packages/scene-framework/src/generators/rng.ts`:
```typescript
/**
 * Seedable PRNG based on Mulberry32.
 * Pure — no side effects, fully deterministic from seed.
 */
export interface Rng {
  /** Returns a float in [0, 1) */
  next(): number
  /** Returns an integer in [min, max] inclusive */
  intRange(min: number, max: number): number
  /** Pick a random element from a non-empty array */
  pick<T>(arr: readonly T[]): T
  /** Fisher-Yates shuffle (mutates and returns the array) */
  shuffle<T>(arr: T[]): T[]
}

export function createRng(seed: number): Rng {
  let state = seed | 0

  function next(): number {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  function intRange(min: number, max: number): number {
    return min + Math.floor(next() * (max - min + 1))
  }

  function pick<T>(arr: readonly T[]): T {
    return arr[intRange(0, arr.length - 1)]
  }

  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = intRange(0, i)
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  return { next, intRange, pick, shuffle }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @dndmanager/scene-framework test`
Expected: All rng tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/scene-framework/src/generators/
git commit -m "feat(scene-framework): add seedable PRNG (Mulberry32) for procedural generators"
```

---

### Task 8: Procedural Dungeon Generator (BSP)

**Files:**
- Create: `packages/scene-framework/src/generators/types.ts`
- Create: `packages/scene-framework/src/generators/dungeon-generator.ts`
- Create: `packages/scene-framework/src/generators/corridor-generator.ts`
- Test: `packages/scene-framework/src/generators/__tests__/dungeon-generator.test.ts`
- Test: `packages/scene-framework/src/generators/__tests__/corridor-generator.test.ts`

- [ ] **Step 1: Define generator config types**

`packages/scene-framework/src/generators/types.ts`:
```typescript
import type { LightingLevel, EncounterDifficulty, ConnectionDef } from '../types.js'

export interface DungeonConfig {
  seed: number
  rooms: number                     // target room count
  level: number                     // party level (for encounter budgets)
  partySize?: number                // default: 4
  mapWidth?: number                 // default: auto-calculated
  mapHeight?: number                // default: auto-calculated
  minRoomSize?: number              // in grid squares, default: 4
  maxRoomSize?: number              // default: 10
  theme?: DungeonTheme
  difficulty?: EncounterDifficulty  // default: 'moderate'
  bossRoom?: boolean                // default: true for rooms >= 4
}

export type DungeonTheme = 'stone' | 'cave' | 'crypt' | 'sewer' | 'temple' | 'mine'

export interface WildernessConfig {
  seed: number
  template: WildernessTemplate
  level: number
  partySize?: number
  mapWidth?: number
  mapHeight?: number
  pointsOfInterest?: number         // default: 3
  difficulty?: EncounterDifficulty
}

export type WildernessTemplate = 'forest' | 'cave' | 'ruin' | 'swamp' | 'mountain' | 'desert'

// ─── BSP Tree ────────────────────────────────
export interface BspNode {
  x: number
  y: number
  width: number
  height: number
  left?: BspNode
  right?: BspNode
  roomX?: number
  roomY?: number
  roomW?: number
  roomH?: number
}

export interface GeneratedRoom {
  id: string
  x: number
  y: number
  width: number
  height: number
  lighting: LightingLevel
  isEntrance?: boolean
  isBoss?: boolean
}

export interface GeneratedCorridor {
  from: string
  to: string
  type: ConnectionDef['type']
  waypoints: Array<[number, number]>
}
```

- [ ] **Step 2: Write failing dungeon generator tests**

`packages/scene-framework/src/generators/__tests__/dungeon-generator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { generateDungeon } from '../dungeon-generator.js'
import type { DungeonConfig } from '../types.js'

describe('generateDungeon', () => {
  const baseConfig: DungeonConfig = { seed: 42, rooms: 5, level: 3 }

  it('generates the requested number of rooms', () => {
    const result = generateDungeon(baseConfig)
    expect(result.rooms.length).toBeGreaterThanOrEqual(baseConfig.rooms)
  })

  it('is deterministic (same seed = same layout)', () => {
    const a = generateDungeon({ seed: 42, rooms: 5, level: 3 })
    const b = generateDungeon({ seed: 42, rooms: 5, level: 3 })
    expect(a.rooms.map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })))
      .toEqual(b.rooms.map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })))
  })

  it('different seeds produce different layouts', () => {
    const a = generateDungeon({ seed: 42, rooms: 5, level: 3 })
    const b = generateDungeon({ seed: 99, rooms: 5, level: 3 })
    const posA = a.rooms.map((r) => `${r.x},${r.y}`).join('|')
    const posB = b.rooms.map((r) => `${r.x},${r.y}`).join('|')
    expect(posA).not.toEqual(posB)
  })

  it('rooms do not overlap', () => {
    const result = generateDungeon({ seed: 7, rooms: 8, level: 5 })
    for (let i = 0; i < result.rooms.length; i++) {
      for (let j = i + 1; j < result.rooms.length; j++) {
        const a = result.rooms[i]
        const b = result.rooms[j]
        const overlap = !(a.x + a.width <= b.x || b.x + b.width <= a.x ||
                          a.y + a.height <= b.y || b.y + b.height <= a.y)
        expect(overlap, `Rooms ${a.id} and ${b.id} overlap`).toBe(false)
      }
    }
  })

  it('marks exactly one room as entrance', () => {
    const result = generateDungeon(baseConfig)
    const entrances = result.rooms.filter((r) => r.isEntrance)
    expect(entrances).toHaveLength(1)
  })

  it('marks a boss room when rooms >= 4', () => {
    const result = generateDungeon({ seed: 42, rooms: 5, level: 3 })
    const bossRooms = result.rooms.filter((r) => r.isBoss)
    expect(bossRooms).toHaveLength(1)
  })

  it('respects minRoomSize and maxRoomSize', () => {
    const result = generateDungeon({ seed: 42, rooms: 5, level: 3, minRoomSize: 4, maxRoomSize: 8 })
    for (const room of result.rooms) {
      expect(room.width).toBeGreaterThanOrEqual(4)
      expect(room.width).toBeLessThanOrEqual(8)
      expect(room.height).toBeGreaterThanOrEqual(4)
      expect(room.height).toBeLessThanOrEqual(8)
    }
  })

  it('returns a valid Scenario through toScenario()', () => {
    const result = generateDungeon(baseConfig)
    const scenario = result.toScenario()
    expect(scenario.name).toBeTruthy()
    expect(scenario.maps).toHaveLength(1)
    expect(scenario.maps[0].rooms.length).toBeGreaterThanOrEqual(baseConfig.rooms)
  })
})
```

- [ ] **Step 3: Write failing corridor generator tests**

`packages/scene-framework/src/generators/__tests__/corridor-generator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { generateCorridors } from '../corridor-generator.js'
import { createRng } from '../rng.js'
import type { GeneratedRoom } from '../types.js'

describe('generateCorridors', () => {
  const rooms: GeneratedRoom[] = [
    { id: 'room-0', x: 0, y: 0, width: 5, height: 5, lighting: 'bright', isEntrance: true },
    { id: 'room-1', x: 10, y: 0, width: 5, height: 5, lighting: 'dim' },
    { id: 'room-2', x: 5, y: 10, width: 5, height: 5, lighting: 'dim' },
  ]

  it('connects all rooms (graph is connected)', () => {
    const corridors = generateCorridors(rooms, createRng(42))
    // Every room should be reachable: at least rooms-1 corridors for a spanning tree
    expect(corridors.length).toBeGreaterThanOrEqual(rooms.length - 1)

    // Check connectivity via BFS
    const adj = new Map<string, Set<string>>()
    for (const r of rooms) adj.set(r.id, new Set())
    for (const c of corridors) {
      adj.get(c.from)!.add(c.to)
      adj.get(c.to)!.add(c.from)
    }
    const visited = new Set<string>()
    const queue = [rooms[0].id]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      for (const neighbor of adj.get(current)!) queue.push(neighbor)
    }
    expect(visited.size).toBe(rooms.length)
  })

  it('uses door type for connections by default', () => {
    const corridors = generateCorridors(rooms, createRng(42))
    expect(corridors.every((c) => ['door', 'corridor', 'open'].includes(c.type))).toBe(true)
  })

  it('is deterministic', () => {
    const a = generateCorridors(rooms, createRng(42))
    const b = generateCorridors(rooms, createRng(42))
    expect(a.map((c) => `${c.from}-${c.to}`)).toEqual(b.map((c) => `${c.from}-${c.to}`))
  })
})
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/scene-framework test`
Expected: FAIL

- [ ] **Step 5: Implement corridor-generator.ts**

`packages/scene-framework/src/generators/corridor-generator.ts`:
```typescript
import type { GeneratedRoom, GeneratedCorridor } from './types.js'
import type { Rng } from './rng.js'

/**
 * Generate corridors connecting all rooms using a minimum spanning tree
 * approach (Prim's algorithm on room center distances), with random
 * extra connections for loops.
 */
export function generateCorridors(rooms: GeneratedRoom[], rng: Rng): GeneratedCorridor[] {
  if (rooms.length <= 1) return []

  const connectionTypes = ['door', 'corridor', 'open'] as const

  // Room centers
  const centers = rooms.map((r) => ({
    id: r.id,
    cx: r.x + Math.floor(r.width / 2),
    cy: r.y + Math.floor(r.height / 2),
  }))

  // Build MST using Prim's algorithm
  const inTree = new Set<number>([0])
  const corridors: GeneratedCorridor[] = []

  while (inTree.size < rooms.length) {
    let bestDist = Infinity
    let bestFrom = 0
    let bestTo = 0

    for (const i of inTree) {
      for (let j = 0; j < rooms.length; j++) {
        if (inTree.has(j)) continue
        const dx = centers[i].cx - centers[j].cx
        const dy = centers[i].cy - centers[j].cy
        const dist = dx * dx + dy * dy
        if (dist < bestDist) {
          bestDist = dist
          bestFrom = i
          bestTo = j
        }
      }
    }

    inTree.add(bestTo)
    corridors.push({
      from: centers[bestFrom].id,
      to: centers[bestTo].id,
      type: rng.pick(connectionTypes),
      waypoints: [[centers[bestFrom].cx, centers[bestFrom].cy], [centers[bestTo].cx, centers[bestTo].cy]],
    })
  }

  // Add random extra connections (roughly 20% chance per possible pair)
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const exists = corridors.some(
        (c) => (c.from === centers[i].id && c.to === centers[j].id) ||
               (c.from === centers[j].id && c.to === centers[i].id)
      )
      if (!exists && rng.next() < 0.2) {
        corridors.push({
          from: centers[i].id,
          to: centers[j].id,
          type: rng.pick(connectionTypes),
          waypoints: [[centers[i].cx, centers[i].cy], [centers[j].cx, centers[j].cy]],
        })
      }
    }
  }

  return corridors
}
```

- [ ] **Step 6: Implement dungeon-generator.ts**

`packages/scene-framework/src/generators/dungeon-generator.ts`:
```typescript
import type { Scenario, MapDef, RoomDef, ConnectionDef, LightingLevel } from '../types.js'
import type { DungeonConfig, BspNode, GeneratedRoom, GeneratedCorridor, DungeonTheme } from './types.js'
import { createRng, type Rng } from './rng.js'
import { generateCorridors } from './corridor-generator.js'
import { scenario, map, room } from '../builders.js'

export interface DungeonResult {
  rooms: GeneratedRoom[]
  corridors: GeneratedCorridor[]
  mapWidth: number
  mapHeight: number
  config: DungeonConfig
  toScenario(): Scenario
}

const THEME_TILES: Record<DungeonTheme, string> = {
  stone: 'stone-floor', cave: 'cave-stone', crypt: 'crypt-tiles',
  sewer: 'sewer-brick', temple: 'marble-tiles', mine: 'dirt-stone',
}

const LIGHTING_OPTIONS: LightingLevel[] = ['bright', 'dim', 'dim', 'darkness']

export function generateDungeon(config: DungeonConfig): DungeonResult {
  const rng = createRng(config.seed)
  const minSize = config.minRoomSize ?? 4
  const maxSize = config.maxRoomSize ?? 10
  const targetRooms = config.rooms
  const theme = config.theme ?? 'stone'

  // Calculate map dimensions based on room count
  const avgRoom = (minSize + maxSize) / 2
  const gridFactor = Math.ceil(Math.sqrt(targetRooms)) + 1
  const mapWidth = config.mapWidth ?? Math.ceil(gridFactor * avgRoom * 1.8)
  const mapHeight = config.mapHeight ?? Math.ceil(gridFactor * avgRoom * 1.5)

  // BSP subdivision
  const root: BspNode = { x: 0, y: 0, width: mapWidth, height: mapHeight }
  subdivide(root, targetRooms, minSize + 2, rng)

  // Collect leaf nodes and place rooms
  const leaves: BspNode[] = []
  collectLeaves(root, leaves)

  const rooms: GeneratedRoom[] = leaves.map((leaf, i) => {
    const rw = rng.intRange(minSize, Math.min(maxSize, leaf.width - 2))
    const rh = rng.intRange(minSize, Math.min(maxSize, leaf.height - 2))
    const rx = leaf.x + rng.intRange(1, Math.max(1, leaf.width - rw - 1))
    const ry = leaf.y + rng.intRange(1, Math.max(1, leaf.height - rh - 1))

    return {
      id: `room-${i}`,
      x: rx,
      y: ry,
      width: rw,
      height: rh,
      lighting: rng.pick(LIGHTING_OPTIONS),
    }
  })

  // Designate entrance and boss room
  if (rooms.length > 0) {
    rooms[0].isEntrance = true
    rooms[0].lighting = 'bright'
  }
  const hasBoss = config.bossRoom ?? rooms.length >= 4
  if (hasBoss && rooms.length >= 2) {
    // Boss is the room farthest from entrance
    let maxDist = 0
    let bossIdx = rooms.length - 1
    const entrance = rooms[0]
    for (let i = 1; i < rooms.length; i++) {
      const dx = rooms[i].x - entrance.x
      const dy = rooms[i].y - entrance.y
      const dist = dx * dx + dy * dy
      if (dist > maxDist) {
        maxDist = dist
        bossIdx = i
      }
    }
    rooms[bossIdx].isBoss = true
  }

  // Generate corridors
  const corridors = generateCorridors(rooms, createRng(config.seed + 1))

  return {
    rooms,
    corridors,
    mapWidth,
    mapHeight,
    config,
    toScenario(): Scenario {
      const roomDefs: RoomDef[] = rooms.map((r) => room(r.id, {
        position: [r.x, r.y],
        size: [r.width, r.height],
        lighting: r.lighting,
        terrain: [],
        features: [
          ...(r.isEntrance ? ['entrance'] : []),
          ...(r.isBoss ? ['boss-area'] : []),
        ].length > 0 ? [
          ...(r.isEntrance ? ['entrance'] : []),
          ...(r.isBoss ? ['boss-area'] : []),
        ] : undefined as any,
      }))

      const connections: ConnectionDef[] = corridors.map((c) => ({
        from: c.from,
        to: c.to,
        type: c.type,
      }))

      return scenario({
        name: `Generated ${theme} dungeon (seed: ${config.seed})`,
        level: { min: config.level, max: config.level + 1 },
        description: `Procedurally generated ${theme} dungeon with ${rooms.length} rooms for level ${config.level} party.`,
        maps: [
          map('main', {
            tiles: THEME_TILES[theme],
            size: [mapWidth, mapHeight],
            rooms: roomDefs,
            connections,
          }),
        ],
        npcs: [],
        encounters: [],
        triggers: [],
        loot: [],
      })
    },
  }
}

// ─── BSP Helpers ─────────────────────────────

function subdivide(node: BspNode, targetLeaves: number, minLeafSize: number, rng: Rng): void {
  const leaves: BspNode[] = []
  collectLeaves(node, leaves)
  if (leaves.length >= targetLeaves) return

  // Find the largest leaf to split
  const sortedLeaves = [...leaves].sort((a, b) => (b.width * b.height) - (a.width * a.height))

  for (const leaf of sortedLeaves) {
    if (leaves.length >= targetLeaves) break

    const canSplitH = leaf.width >= minLeafSize * 2
    const canSplitV = leaf.height >= minLeafSize * 2

    if (!canSplitH && !canSplitV) continue

    const splitHorizontally = canSplitH && canSplitV
      ? rng.next() < 0.5
      : canSplitH

    if (splitHorizontally) {
      const split = rng.intRange(minLeafSize, leaf.width - minLeafSize)
      leaf.left = { x: leaf.x, y: leaf.y, width: split, height: leaf.height }
      leaf.right = { x: leaf.x + split, y: leaf.y, width: leaf.width - split, height: leaf.height }
    } else {
      const split = rng.intRange(minLeafSize, leaf.height - minLeafSize)
      leaf.left = { x: leaf.x, y: leaf.y, width: leaf.width, height: split }
      leaf.right = { x: leaf.x, y: leaf.y + split, width: leaf.width, height: leaf.height - split }
    }

    // Recurse
    const newLeaves: BspNode[] = []
    collectLeaves(node, newLeaves)
    if (newLeaves.length >= targetLeaves) return
    subdivide(node, targetLeaves, minLeafSize, rng)
    return
  }
}

function collectLeaves(node: BspNode, leaves: BspNode[]): void {
  if (!node.left && !node.right) {
    leaves.push(node)
    return
  }
  if (node.left) collectLeaves(node.left, leaves)
  if (node.right) collectLeaves(node.right, leaves)
}
```

- [ ] **Step 7: Run tests**

Run: `pnpm --filter @dndmanager/scene-framework test`
Expected: All dungeon-generator and corridor-generator tests pass

- [ ] **Step 8: Commit**

```bash
git add packages/scene-framework/src/generators/
git commit -m "feat(scene-framework): add BSP-based procedural dungeon generator with corridor placement"
```

---

### Task 9: Encounter Auto-Populator

**Files:**
- Create: `packages/scene-framework/src/generators/encounter-populator.ts`
- Test: `packages/scene-framework/src/generators/__tests__/encounter-populator.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/scene-framework/src/generators/__tests__/encounter-populator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { populateEncounters } from '../encounter-populator.js'
import { createRng } from '../rng.js'
import type { GeneratedRoom } from '../types.js'
import type { EncounterDifficulty } from '../../types.js'

describe('populateEncounters', () => {
  const rooms: GeneratedRoom[] = [
    { id: 'room-0', x: 0, y: 0, width: 5, height: 5, lighting: 'bright', isEntrance: true },
    { id: 'room-1', x: 10, y: 0, width: 5, height: 5, lighting: 'dim' },
    { id: 'room-2', x: 20, y: 0, width: 5, height: 5, lighting: 'dim', isBoss: true },
  ]

  it('creates an encounter for each non-entrance room', () => {
    const encounters = populateEncounters(rooms, 3, 4, 'moderate', createRng(42))
    // Entrance room typically has no encounter; non-entrance rooms do
    const encounterRoomIds = encounters.map((e) => e.room)
    expect(encounterRoomIds).not.toContain('room-0')
    expect(encounters.length).toBeGreaterThanOrEqual(rooms.length - 1)
  })

  it('assigns boss encounter difficulty to boss room', () => {
    const encounters = populateEncounters(rooms, 3, 4, 'moderate', createRng(42))
    const bossEnc = encounters.find((e) => e.room === 'room-2')
    expect(bossEnc).toBeDefined()
    expect(['severe', 'extreme']).toContain(bossEnc!.difficulty)
  })

  it('assigns appropriate difficulty to non-boss rooms', () => {
    const encounters = populateEncounters(rooms, 3, 4, 'moderate', createRng(42))
    const nonBoss = encounters.filter((e) => e.room !== 'room-2')
    for (const enc of nonBoss) {
      expect(['trivial', 'low', 'moderate']).toContain(enc.difficulty)
    }
  })

  it('populates monsters with pf2e: prefix', () => {
    const encounters = populateEncounters(rooms, 3, 4, 'moderate', createRng(42))
    for (const enc of encounters) {
      for (const m of enc.monsters) {
        expect(m.type.startsWith('pf2e:')).toBe(true)
      }
    }
  })

  it('boss encounter has phases', () => {
    const encounters = populateEncounters(rooms, 3, 4, 'moderate', createRng(42))
    const bossEnc = encounters.find((e) => e.room === 'room-2')
    expect(bossEnc?.phases).toBeDefined()
    expect(bossEnc!.phases!.length).toBeGreaterThan(0)
  })

  it('is deterministic', () => {
    const a = populateEncounters(rooms, 3, 4, 'moderate', createRng(42))
    const b = populateEncounters(rooms, 3, 4, 'moderate', createRng(42))
    expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/scene-framework test`
Expected: FAIL

- [ ] **Step 3: Implement encounter-populator.ts**

`packages/scene-framework/src/generators/encounter-populator.ts`:
```typescript
import type { EncounterDef, EncounterDifficulty, EncounterPhase, MonsterPlacement } from '../types.js'
import type { GeneratedRoom } from './types.js'
import type { Rng } from './rng.js'

/**
 * PF2e encounter budget XP by difficulty (for a party of 4).
 * Scales linearly with party size delta.
 */
const BUDGET_XP: Record<EncounterDifficulty, number> = {
  trivial: 40,
  low: 60,
  moderate: 80,
  severe: 120,
  extreme: 160,
}

/**
 * Monster XP by level relative to party level.
 * Key = (monster_level - party_level), Value = XP.
 */
const MONSTER_XP_BY_DELTA: Record<number, number> = {
  '-4': 10, '-3': 15, '-2': 20, '-1': 30,
  '0': 40, '1': 60, '2': 80, '3': 120, '4': 160,
}

/** Placeholder monster types by relative level */
const MONSTER_TYPES_BY_DELTA: Record<number, string[]> = {
  '-2': ['pf2e:skeleton-guard', 'pf2e:goblin-warrior', 'pf2e:giant-rat'],
  '-1': ['pf2e:zombie-shambler', 'pf2e:kobold-scout', 'pf2e:orc-warrior'],
  '0': ['pf2e:bugbear-thug', 'pf2e:hobgoblin-soldier', 'pf2e:warg'],
  '1': ['pf2e:ogre', 'pf2e:troll', 'pf2e:manticore'],
  '2': ['pf2e:young-dragon', 'pf2e:hill-giant', 'pf2e:chimera'],
}

export function populateEncounters(
  rooms: GeneratedRoom[],
  partyLevel: number,
  partySize: number,
  baseDifficulty: EncounterDifficulty,
  rng: Rng,
): EncounterDef[] {
  const encounters: EncounterDef[] = []
  const sizeFactor = partySize / 4 // scale budget for non-standard party sizes

  for (const room of rooms) {
    if (room.isEntrance) continue

    const difficulty = room.isBoss
      ? (baseDifficulty === 'extreme' ? 'extreme' : 'severe')
      : rng.pick(getDifficultyRange(baseDifficulty))

    const budget = Math.round(BUDGET_XP[difficulty] * sizeFactor)
    const monsters = fillMonsterBudget(budget, partyLevel, room.isBoss ?? false, rng)

    const enc: EncounterDef = {
      id: `enc-${room.id}`,
      room: room.id,
      trigger: room.isBoss ? 'manual' : 'on_enter',
      monsters,
      difficulty,
    }

    if (room.isBoss) {
      enc.tactics = 'Boss uses area attacks first, then focuses weakest target'
      enc.phases = generateBossPhases(rng)
    }

    encounters.push(enc)
  }

  return encounters
}

function getDifficultyRange(base: EncounterDifficulty): EncounterDifficulty[] {
  const all: EncounterDifficulty[] = ['trivial', 'low', 'moderate', 'severe', 'extreme']
  const idx = all.indexOf(base)
  const min = Math.max(0, idx - 1)
  const max = idx
  return all.slice(min, max + 1)
}

function fillMonsterBudget(
  budget: number,
  partyLevel: number,
  isBoss: boolean,
  rng: Rng,
): MonsterPlacement[] {
  const placements: MonsterPlacement[] = []
  let remaining = budget

  if (isBoss) {
    // Place one strong monster first
    const bossXp = MONSTER_XP_BY_DELTA['2'] ?? 80
    const bossTypes = MONSTER_TYPES_BY_DELTA[2] ?? ['pf2e:young-dragon']
    placements.push({ type: rng.pick(bossTypes), count: 1, positions: 'center' })
    remaining -= bossXp
  }

  // Fill remaining budget with weaker monsters
  const deltas = isBoss ? [-2, -1] : [-1, 0, -2]
  while (remaining > 0) {
    const delta = rng.pick(deltas)
    const xp = MONSTER_XP_BY_DELTA[String(delta) as unknown as number] ?? 20
    if (xp > remaining) break

    const types = MONSTER_TYPES_BY_DELTA[delta] ?? ['pf2e:skeleton-guard']
    const maxCount = Math.min(4, Math.floor(remaining / xp))
    if (maxCount < 1) break

    const count = rng.intRange(1, maxCount)
    placements.push({ type: rng.pick(types), count, positions: 'spread' })
    remaining -= xp * count
  }

  return placements
}

function generateBossPhases(rng: Rng): EncounterPhase[] {
  const phaseTemplates: EncounterPhase[] = [
    { hp_threshold: 0.75, action: 'enrage', description: 'The boss enters a fury, gaining +2 to attack rolls' },
    { hp_threshold: 0.5, action: 'call-reinforcements', description: 'The boss calls for reinforcements' },
    { hp_threshold: 0.25, action: 'desperate', description: 'The boss fights desperately, using its most powerful abilities' },
  ]

  // Include 2-3 phases randomly
  const count = rng.intRange(2, 3)
  return rng.shuffle([...phaseTemplates]).slice(0, count).sort((a, b) => b.hp_threshold - a.hp_threshold)
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @dndmanager/scene-framework test`
Expected: All encounter-populator tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/scene-framework/src/generators/encounter-populator.ts packages/scene-framework/src/generators/__tests__/encounter-populator.test.ts
git commit -m "feat(scene-framework): add encounter auto-populator using PF2e XP budgets"
```

---

### Task 10: Procedural Wilderness Generator

**Files:**
- Create: `packages/scene-framework/src/generators/wilderness-generator.ts`
- Test: `packages/scene-framework/src/generators/__tests__/wilderness-generator.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/scene-framework/src/generators/__tests__/wilderness-generator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { generateWilderness } from '../wilderness-generator.js'
import type { WildernessConfig } from '../types.js'

describe('generateWilderness', () => {
  const baseConfig: WildernessConfig = { seed: 42, template: 'forest', level: 3 }

  it('generates points of interest as rooms', () => {
    const result = generateWilderness(baseConfig)
    expect(result.rooms.length).toBeGreaterThanOrEqual(3) // default POI count
  })

  it('is deterministic', () => {
    const a = generateWilderness({ seed: 42, template: 'forest', level: 3 })
    const b = generateWilderness({ seed: 42, template: 'forest', level: 3 })
    expect(a.rooms.map((r) => r.id)).toEqual(b.rooms.map((r) => r.id))
  })

  it('uses template-specific lighting', () => {
    const cave = generateWilderness({ seed: 42, template: 'cave', level: 3 })
    const caveLighting = cave.rooms.map((r) => r.lighting)
    expect(caveLighting.some((l) => l === 'darkness' || l === 'dim')).toBe(true)
  })

  it('different templates produce different tile sets', () => {
    const forest = generateWilderness({ seed: 42, template: 'forest', level: 3 })
    const ruin = generateWilderness({ seed: 42, template: 'ruin', level: 3 })
    const forestScenario = forest.toScenario()
    const ruinScenario = ruin.toScenario()
    expect(forestScenario.maps[0].tiles).not.toBe(ruinScenario.maps[0].tiles)
  })

  it('respects custom pointsOfInterest count', () => {
    const result = generateWilderness({ seed: 42, template: 'forest', level: 3, pointsOfInterest: 6 })
    expect(result.rooms.length).toBeGreaterThanOrEqual(6)
  })

  it('returns a valid Scenario through toScenario()', () => {
    const result = generateWilderness(baseConfig)
    const scenario = result.toScenario()
    expect(scenario.name).toBeTruthy()
    expect(scenario.maps).toHaveLength(1)
    expect(scenario.encounters.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/scene-framework test`
Expected: FAIL

- [ ] **Step 3: Implement wilderness-generator.ts**

`packages/scene-framework/src/generators/wilderness-generator.ts`:
```typescript
import type { Scenario, LightingLevel } from '../types.js'
import type { WildernessConfig, WildernessTemplate, GeneratedRoom, GeneratedCorridor } from './types.js'
import { createRng, type Rng } from './rng.js'
import { generateCorridors } from './corridor-generator.js'
import { populateEncounters } from './encounter-populator.js'
import { scenario, map, room, encounter } from '../builders.js'

export interface WildernessResult {
  rooms: GeneratedRoom[]
  corridors: GeneratedCorridor[]
  mapWidth: number
  mapHeight: number
  config: WildernessConfig
  toScenario(): Scenario
}

interface TemplateConfig {
  tiles: string
  lighting: LightingLevel[]
  features: string[][]
  poiNames: string[]
}

const TEMPLATES: Record<WildernessTemplate, TemplateConfig> = {
  forest: {
    tiles: 'forest-floor',
    lighting: ['bright', 'bright', 'dim'],
    features: [['ancient-tree', 'stream'], ['clearing', 'mushroom-ring'], ['fallen-log', 'berry-bush']],
    poiNames: ['Clearing', 'Stream Crossing', 'Ancient Oak', 'Hidden Grove', 'Wolf Den', 'Fairy Circle'],
  },
  cave: {
    tiles: 'cave-stone',
    lighting: ['dim', 'darkness', 'darkness'],
    features: [['stalactites', 'pool'], ['narrow-passage', 'crystals'], ['underground-river', 'fungi']],
    poiNames: ['Entrance', 'Crystal Chamber', 'Underground Lake', 'Narrow Squeeze', 'Bat Colony', 'Deep Pit'],
  },
  ruin: {
    tiles: 'crumbled-stone',
    lighting: ['bright', 'dim', 'dim'],
    features: [['broken-columns', 'overgrown-altar'], ['collapsed-wall', 'statue'], ['mosaic-floor', 'fountain']],
    poiNames: ['Gate', 'Courtyard', 'Collapsed Tower', 'Throne Hall', 'Library Ruins', 'Crypt Entrance'],
  },
  swamp: {
    tiles: 'mud-water',
    lighting: ['dim', 'dim', 'darkness'],
    features: [['bog', 'dead-tree'], ['hut-stilts', 'will-o-wisp'], ['quicksand', 'lily-pads']],
    poiNames: ['Marsh Edge', 'Sunken Bridge', 'Witch Hut', 'Deep Bog', 'Ancient Bones', 'Foggy Hollow'],
  },
  mountain: {
    tiles: 'rocky-terrain',
    lighting: ['bright', 'bright', 'dim'],
    features: [['cliff-edge', 'eagle-nest'], ['narrow-ledge', 'cave-mouth'], ['rock-slide', 'overlook']],
    poiNames: ['Trail Head', 'Mountain Pass', 'Eagle Peak', 'Rock Slide', 'Hidden Cave', 'Summit'],
  },
  desert: {
    tiles: 'sand-stone',
    lighting: ['bright', 'bright', 'bright'],
    features: [['oasis', 'sand-dune'], ['ancient-pillar', 'scorpion-nest'], ['buried-ruin', 'mirage']],
    poiNames: ['Oasis', 'Sand Dune Ridge', 'Buried Temple', 'Scorpion Pit', 'Nomad Camp', 'Stone Circle'],
  },
}

export function generateWilderness(config: WildernessConfig): WildernessResult {
  const rng = createRng(config.seed)
  const template = TEMPLATES[config.template]
  const poiCount = config.pointsOfInterest ?? 3
  const partySize = config.partySize ?? 4
  const difficulty = config.difficulty ?? 'moderate'

  const mapWidth = config.mapWidth ?? 30
  const mapHeight = config.mapHeight ?? 25

  // Place POIs using Poisson-like distribution
  const rooms: GeneratedRoom[] = []
  const minDist = Math.min(mapWidth, mapHeight) / (poiCount + 1)

  for (let i = 0; i < poiCount; i++) {
    let placed = false
    for (let attempt = 0; attempt < 50; attempt++) {
      const x = rng.intRange(1, mapWidth - 8)
      const y = rng.intRange(1, mapHeight - 8)
      const w = rng.intRange(4, 7)
      const h = rng.intRange(4, 7)

      // Check minimum distance from existing rooms
      const tooClose = rooms.some((r) => {
        const dx = (r.x + r.width / 2) - (x + w / 2)
        const dy = (r.y + r.height / 2) - (y + h / 2)
        return Math.sqrt(dx * dx + dy * dy) < minDist
      })

      if (!tooClose) {
        const name = i < template.poiNames.length ? template.poiNames[i] : `POI-${i}`
        rooms.push({
          id: `poi-${i}`,
          x, y,
          width: w,
          height: h,
          lighting: rng.pick(template.lighting),
          isEntrance: i === 0,
        })
        placed = true
        break
      }
    }

    // Fallback: place anyway if we could not find a good spot
    if (!placed) {
      const x = rng.intRange(1, mapWidth - 6)
      const y = rng.intRange(1, mapHeight - 6)
      rooms.push({
        id: `poi-${i}`,
        x, y,
        width: 5, height: 5,
        lighting: rng.pick(template.lighting),
        isEntrance: i === 0,
      })
    }
  }

  if (rooms.length >= 3) {
    rooms[rooms.length - 1].isBoss = true
  }

  const corridors = generateCorridors(rooms, createRng(config.seed + 1))

  return {
    rooms,
    corridors,
    mapWidth,
    mapHeight,
    config,
    toScenario(): Scenario {
      const encounters = populateEncounters(rooms, config.level, partySize, difficulty, createRng(config.seed + 2))

      return scenario({
        name: `Generated ${config.template} wilderness (seed: ${config.seed})`,
        level: { min: config.level, max: config.level + 1 },
        description: `Procedurally generated ${config.template} wilderness with ${rooms.length} points of interest for level ${config.level} party.`,
        maps: [
          map('main', {
            tiles: template.tiles,
            size: [mapWidth, mapHeight],
            rooms: rooms.map((r, i) => room(r.id, {
              position: [r.x, r.y],
              size: [r.width, r.height],
              lighting: r.lighting,
              terrain: [],
              features: template.features[i % template.features.length],
            })),
            connections: corridors.map((c) => ({
              from: c.from,
              to: c.to,
              type: c.type,
            })),
          }),
        ],
        npcs: [],
        encounters: encounters.map((e) => encounter(e.id, {
          room: e.room,
          trigger: e.trigger,
          monsters: e.monsters,
          difficulty: e.difficulty,
          tactics: e.tactics,
          phases: e.phases,
        })),
        triggers: [],
        loot: [],
      })
    },
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @dndmanager/scene-framework test`
Expected: All wilderness-generator tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/scene-framework/src/generators/wilderness-generator.ts packages/scene-framework/src/generators/__tests__/wilderness-generator.test.ts
git commit -m "feat(scene-framework): add procedural wilderness generator with template system"
```

---

### Task 11: Generator Index & Scene-Framework Exports

**Files:**
- Create: `packages/scene-framework/src/generators/index.ts`
- Modify: `packages/scene-framework/src/index.ts`

- [ ] **Step 1: Create generators/index.ts**

`packages/scene-framework/src/generators/index.ts`:
```typescript
export { createRng, type Rng } from './rng.js'
export { generateDungeon, type DungeonResult } from './dungeon-generator.js'
export { generateWilderness, type WildernessResult } from './wilderness-generator.js'
export { generateCorridors } from './corridor-generator.js'
export { populateEncounters } from './encounter-populator.js'
export type {
  DungeonConfig,
  DungeonTheme,
  WildernessConfig,
  WildernessTemplate,
  BspNode,
  GeneratedRoom,
  GeneratedCorridor,
} from './types.js'
```

- [ ] **Step 2: Update scene-framework index.ts**

Add to `packages/scene-framework/src/index.ts`:
```typescript
export * from './generators/index.js'
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm --filter @dndmanager/scene-framework typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/scene-framework/src/generators/index.ts packages/scene-framework/src/index.ts
git commit -m "feat(scene-framework): export procedural generators from package index"
```

---

### Task 12: Generator CLI

**Files:**
- Create: `packages/scene-framework/src/cli/generate.ts`
- Modify: `packages/scene-framework/package.json` (add bin/script)

- [ ] **Step 1: Implement CLI entry point**

`packages/scene-framework/src/cli/generate.ts`:
```typescript
#!/usr/bin/env tsx
import { parseArgs } from 'node:util'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { generateDungeon } from '../generators/dungeon-generator.js'
import { generateWilderness } from '../generators/wilderness-generator.js'
import { validateScenario } from '../validator.js'

const { values } = parseArgs({
  options: {
    type: { type: 'string', short: 't', default: 'dungeon' },
    rooms: { type: 'string', short: 'r', default: '5' },
    level: { type: 'string', short: 'l', default: '3' },
    seed: { type: 'string', short: 's', default: String(Date.now()) },
    output: { type: 'string', short: 'o', default: '' },
    template: { type: 'string', default: 'forest' },
    theme: { type: 'string', default: 'stone' },
    party: { type: 'string', short: 'p', default: '4' },
    difficulty: { type: 'string', short: 'd', default: 'moderate' },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: true,
})

if (values.help) {
  console.log(`
Usage: pnpm scenario:generate [options]

Options:
  -t, --type <type>         Generator type: dungeon | forest | cave | ruin | swamp | mountain | desert
  -r, --rooms <count>       Number of rooms / points of interest (default: 5)
  -l, --level <level>       Party level (default: 3)
  -s, --seed <seed>         Random seed for deterministic generation
  -o, --output <path>       Output file path (default: stdout as JSON)
  -p, --party <size>        Party size (default: 4)
  -d, --difficulty <diff>   Base difficulty: trivial | low | moderate | severe | extreme
  --template <template>     Wilderness template (forest, cave, ruin, swamp, mountain, desert)
  --theme <theme>           Dungeon theme (stone, cave, crypt, sewer, temple, mine)
  -h, --help                Show this help
`)
  process.exit(0)
}

const seed = parseInt(values.seed!, 10)
const level = parseInt(values.level!, 10)
const roomCount = parseInt(values.rooms!, 10)
const partySize = parseInt(values.party!, 10)

let scenario

if (values.type === 'dungeon') {
  const result = generateDungeon({
    seed,
    rooms: roomCount,
    level,
    partySize,
    theme: values.theme as any,
    difficulty: values.difficulty as any,
  })
  scenario = result.toScenario()
} else {
  const result = generateWilderness({
    seed,
    template: (values.type === 'dungeon' ? values.template : values.type) as any,
    level,
    partySize,
    pointsOfInterest: roomCount,
    difficulty: values.difficulty as any,
  })
  scenario = result.toScenario()
}

// Validate
const validation = validateScenario(scenario)
if (!validation.valid) {
  console.error('Validation errors:')
  for (const err of validation.errors) console.error(`  - ${err}`)
  process.exit(1)
}
if (validation.warnings.length > 0) {
  console.warn('Warnings:')
  for (const warn of validation.warnings) console.warn(`  - ${warn}`)
}

const json = JSON.stringify(scenario, null, 2)

if (values.output) {
  const outputPath = resolve(values.output)
  writeFileSync(outputPath, json, 'utf-8')
  console.log(`Scenario written to ${outputPath}`)
} else {
  console.log(json)
}
```

- [ ] **Step 2: Add script to package.json**

Add to `packages/scene-framework/package.json` in `"scripts"`:
```json
"scenario:generate": "tsx src/cli/generate.ts"
```

Add to root `package.json` in `"scripts"`:
```json
"scenario:generate": "pnpm --filter @dndmanager/scene-framework scenario:generate --"
```

- [ ] **Step 3: Verify CLI works**

Run: `pnpm scenario:generate --type dungeon --rooms 5 --level 3 --seed 42`
Expected: JSON scenario output to stdout

Run: `pnpm scenario:generate --type forest --rooms 4 --level 5 --seed 99`
Expected: JSON wilderness scenario output to stdout

- [ ] **Step 4: Commit**

```bash
git add packages/scene-framework/src/cli/ packages/scene-framework/package.json package.json
git commit -m "feat(scene-framework): add scenario:generate CLI for procedural dungeon and wilderness generation"
```

---

### Task 13: Full Test Suite Verification

- [ ] **Step 1: Run all game-runtime tests**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: All tests pass (existing + new trigger/boss/multi-room tests)

- [ ] **Step 2: Run all scene-framework tests**

Run: `pnpm --filter @dndmanager/scene-framework test`
Expected: All tests pass (existing + new generator tests)

- [ ] **Step 3: Run full project tests**

Run: `pnpm test`
Expected: All packages pass

- [ ] **Step 4: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 5: Commit if any changes**

Only commit if there are uncommitted changes (e.g., lockfile updates):
```bash
git add -A && git diff --cached --quiet || git commit -m "chore: update lockfile after trigger and generator implementation"
```
