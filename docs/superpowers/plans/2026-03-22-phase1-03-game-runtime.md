# Phase 1.3: Game Runtime Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the game runtime that manages game state (exploration/encounter/downtime), initiative, turn order, action tracking, token positions, and grid-based movement — all as pure TypeScript logic, ready for Supabase Realtime sync in Phase 1.6.

**Architecture:** Pure TypeScript package (`packages/game-runtime`) with no database or UI dependencies. The runtime manages an immutable game state that transitions through actions. Each state change produces a new state + an event log entry. This makes the runtime testable, replayable, and sync-friendly (state diffs can be pushed to Supabase later).

**Tech Stack:** TypeScript strict, Vitest, @dndmanager/pf2e-engine (dependency)

**Spec:** `docs/superpowers/specs/2026-03-21-dndmanager-platform-design.md` (Section 7: Game Runtime)

---

## File Structure

```
packages/game-runtime/src/
├── index.ts                          → Public API re-exports
├── types.ts                          → Game runtime type definitions
├── state-machine.ts                  → Exploration/Encounter/Downtime transitions
├── initiative.ts                     → Initiative rolling & turn order
├── turns.ts                          → Turn management, action tracking
├── tokens.ts                         → Token positions & movement on grid
├── grid.ts                           → Grid utilities, distance, pathfinding
├── events.ts                         → Event/action log
├── __tests__/
│   ├── state-machine.test.ts
│   ├── initiative.test.ts
│   ├── turns.test.ts
│   ├── tokens.test.ts
│   ├── grid.test.ts
│   └── events.test.ts
```

---

### Task 1: Game Runtime Type Definitions

**Files:**
- Create: `packages/game-runtime/src/types.ts`
- Modify: `packages/game-runtime/src/index.ts`

- [ ] **Step 1: Create type definitions**

`packages/game-runtime/src/types.ts`:
```typescript
import type { ActiveCondition, DegreeOfSuccess } from '@dndmanager/pf2e-engine'

// ─── Game Mode ────────────────────────────────
export type GameMode = 'exploration' | 'encounter' | 'downtime'

// ─── Tokens ───────────────────────────────────
export type TokenType = 'player' | 'monster' | 'npc'

export interface Token {
  id: string
  name: string
  type: TokenType
  ownerId: string         // user_id for players, gm for monsters/npcs
  position: GridPosition
  speed: number           // in feet
  conditions: ActiveCondition[]
  hp: { current: number; max: number; temp: number }
  ac: number
  visible: boolean        // GM can hide tokens
}

export interface GridPosition {
  x: number
  y: number
}

// ─── Initiative ───────────────────────────────
export interface InitiativeEntry {
  tokenId: string
  roll: number
  modifier: number
  total: number
}

// ─── Turn Tracking ────────────────────────────
export interface TurnState {
  currentTokenId: string
  actionsRemaining: number   // PF2e: 3 per turn
  reactionAvailable: boolean
  actionsUsed: ActionRecord[]
}

export interface ActionRecord {
  type: string          // 'strike', 'move', 'step', 'cast', 'skill', etc.
  details: string
  result?: string
}

// ─── Game State ───────────────────────────────
export interface GameState {
  id: string
  sessionId: string
  mode: GameMode
  tokens: Token[]
  initiative: InitiativeEntry[]
  turnOrder: string[]          // token IDs in initiative order
  currentTurnIndex: number
  turn: TurnState | null       // null when not in encounter
  round: number
  actionLog: GameEvent[]
}

// ─── Events ───────────────────────────────────
export type GameEventType =
  | 'mode_change'
  | 'encounter_start'
  | 'encounter_end'
  | 'initiative_rolled'
  | 'turn_start'
  | 'turn_end'
  | 'action_performed'
  | 'token_moved'
  | 'token_added'
  | 'token_removed'
  | 'damage_dealt'
  | 'healing_applied'
  | 'condition_added'
  | 'condition_removed'
  | 'round_start'

export interface GameEvent {
  type: GameEventType
  timestamp: number
  data: Record<string, unknown>
}
```

- [ ] **Step 2: Update index.ts**

`packages/game-runtime/src/index.ts`:
```typescript
export * from './types.js'
```

- [ ] **Step 3: Verify typecheck**

Run: `cd /Users/asanstefanski/Private/dndmanager && pnpm --filter @dndmanager/game-runtime typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/game-runtime/src/
git commit -m "feat(game-runtime): add core type definitions"
```

---

### Task 2: Grid Utilities

**Files:**
- Create: `packages/game-runtime/src/grid.ts`
- Test: `packages/game-runtime/src/__tests__/grid.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/game-runtime/src/__tests__/grid.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { gridDistance, isAdjacent, getAdjacentPositions, positionsInRange, positionEquals } from '../grid.js'
import type { GridPosition } from '../types.js'

describe('gridDistance', () => {
  it('returns 0 for same position', () => {
    expect(gridDistance({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(0)
  })

  it('returns 5 for adjacent horizontal', () => {
    expect(gridDistance({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(5)
  })

  it('returns 5 for adjacent vertical', () => {
    expect(gridDistance({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(5)
  })

  it('returns 5 for diagonal (PF2e: first diagonal = 5ft)', () => {
    expect(gridDistance({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(5)
  })

  it('returns 15 for 2 diagonal + 1 straight (Chebyshev * 5)', () => {
    expect(gridDistance({ x: 0, y: 0 }, { x: 3, y: 2 })).toBe(15)
  })

  it('returns 25 for 5 squares straight', () => {
    expect(gridDistance({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(25)
  })
})

describe('isAdjacent', () => {
  it('returns true for horizontal neighbor', () => {
    expect(isAdjacent({ x: 3, y: 3 }, { x: 4, y: 3 })).toBe(true)
  })

  it('returns true for diagonal neighbor', () => {
    expect(isAdjacent({ x: 3, y: 3 }, { x: 4, y: 4 })).toBe(true)
  })

  it('returns false for same position', () => {
    expect(isAdjacent({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(false)
  })

  it('returns false for 2 squares away', () => {
    expect(isAdjacent({ x: 3, y: 3 }, { x: 5, y: 3 })).toBe(false)
  })
})

describe('getAdjacentPositions', () => {
  it('returns 8 positions for open field', () => {
    const adj = getAdjacentPositions({ x: 5, y: 5 })
    expect(adj).toHaveLength(8)
  })

  it('includes all cardinal and diagonal neighbors', () => {
    const adj = getAdjacentPositions({ x: 1, y: 1 })
    expect(adj).toContainEqual({ x: 0, y: 0 })
    expect(adj).toContainEqual({ x: 1, y: 0 })
    expect(adj).toContainEqual({ x: 2, y: 0 })
    expect(adj).toContainEqual({ x: 0, y: 1 })
    expect(adj).toContainEqual({ x: 2, y: 1 })
    expect(adj).toContainEqual({ x: 0, y: 2 })
    expect(adj).toContainEqual({ x: 1, y: 2 })
    expect(adj).toContainEqual({ x: 2, y: 2 })
  })
})

describe('positionsInRange', () => {
  it('returns positions within movement range', () => {
    const positions = positionsInRange({ x: 5, y: 5 }, 10) // 2 squares
    // Should include all positions within Chebyshev distance 2
    expect(positions).toContainEqual({ x: 5, y: 5 })
    expect(positions).toContainEqual({ x: 6, y: 5 })
    expect(positions).toContainEqual({ x: 7, y: 5 })
    expect(positions).toContainEqual({ x: 7, y: 7 })
  })

  it('does not include positions outside range', () => {
    const positions = positionsInRange({ x: 5, y: 5 }, 10)
    expect(positions).not.toContainEqual({ x: 8, y: 5 }) // 3 squares = 15ft
  })

  it('returns only origin for 0 range', () => {
    const positions = positionsInRange({ x: 5, y: 5 }, 0)
    expect(positions).toEqual([{ x: 5, y: 5 }])
  })
})

describe('positionEquals', () => {
  it('returns true for same coordinates', () => {
    expect(positionEquals({ x: 3, y: 5 }, { x: 3, y: 5 })).toBe(true)
  })

  it('returns false for different coordinates', () => {
    expect(positionEquals({ x: 3, y: 5 }, { x: 3, y: 6 })).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: FAIL

- [ ] **Step 3: Implement grid.ts**

`packages/game-runtime/src/grid.ts`:
```typescript
import type { GridPosition } from './types.js'

/**
 * PF2e grid distance using Chebyshev distance (diagonal = 1 square).
 * Each square = 5 feet.
 */
export function gridDistance(a: GridPosition, b: GridPosition): number {
  const dx = Math.abs(a.x - b.x)
  const dy = Math.abs(a.y - b.y)
  return Math.max(dx, dy) * 5
}

export function isAdjacent(a: GridPosition, b: GridPosition): boolean {
  if (a.x === b.x && a.y === b.y) return false
  return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1
}

export function getAdjacentPositions(pos: GridPosition): GridPosition[] {
  const positions: GridPosition[] = []
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue
      positions.push({ x: pos.x + dx, y: pos.y + dy })
    }
  }
  return positions
}

/**
 * All grid positions within a given range (in feet) from origin.
 */
export function positionsInRange(origin: GridPosition, rangeFeet: number): GridPosition[] {
  const rangeSquares = Math.floor(rangeFeet / 5)
  const positions: GridPosition[] = []

  for (let dx = -rangeSquares; dx <= rangeSquares; dx++) {
    for (let dy = -rangeSquares; dy <= rangeSquares; dy++) {
      const pos = { x: origin.x + dx, y: origin.y + dy }
      if (gridDistance(origin, pos) <= rangeFeet) {
        positions.push(pos)
      }
    }
  }

  return positions
}

export function positionEquals(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './grid.js'` to index.ts.

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/game-runtime/src/
git commit -m "feat(game-runtime): add grid utilities with distance and adjacency"
```

---

### Task 3: Token Management

**Files:**
- Create: `packages/game-runtime/src/tokens.ts`
- Test: `packages/game-runtime/src/__tests__/tokens.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/game-runtime/src/__tests__/tokens.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import {
  createToken,
  addToken,
  removeToken,
  moveToken,
  getToken,
  getTokenAt,
  getTokensByType,
} from '../tokens.js'
import type { Token } from '../types.js'

describe('createToken', () => {
  it('creates a player token with defaults', () => {
    const token = createToken({
      id: 'thorin',
      name: 'Thorin',
      type: 'player',
      ownerId: 'user-1',
      position: { x: 3, y: 5 },
      speed: 25,
      ac: 18,
      hp: { current: 45, max: 45, temp: 0 },
    })
    expect(token.id).toBe('thorin')
    expect(token.visible).toBe(true)
    expect(token.conditions).toEqual([])
  })
})

describe('addToken', () => {
  it('adds token to list', () => {
    const tokens: Token[] = []
    const token = createToken({
      id: 'thorin', name: 'Thorin', type: 'player',
      ownerId: 'user-1', position: { x: 0, y: 0 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    const result = addToken(tokens, token)
    expect(result).toHaveLength(1)
  })

  it('rejects duplicate ID', () => {
    const token = createToken({
      id: 'thorin', name: 'Thorin', type: 'player',
      ownerId: 'user-1', position: { x: 0, y: 0 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    const tokens = [token]
    expect(() => addToken(tokens, token)).toThrow('duplicate')
  })
})

describe('removeToken', () => {
  it('removes token by ID', () => {
    const token = createToken({
      id: 'goblin-1', name: 'Goblin', type: 'monster',
      ownerId: 'gm', position: { x: 5, y: 5 },
      speed: 25, ac: 16, hp: { current: 20, max: 20, temp: 0 },
    })
    const result = removeToken([token], 'goblin-1')
    expect(result).toHaveLength(0)
  })
})

describe('moveToken', () => {
  it('updates token position', () => {
    const token = createToken({
      id: 'thorin', name: 'Thorin', type: 'player',
      ownerId: 'user-1', position: { x: 0, y: 0 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    const result = moveToken([token], 'thorin', { x: 3, y: 2 })
    expect(result[0].position).toEqual({ x: 3, y: 2 })
  })

  it('does not mutate original array', () => {
    const token = createToken({
      id: 'thorin', name: 'Thorin', type: 'player',
      ownerId: 'user-1', position: { x: 0, y: 0 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    const original = [token]
    moveToken(original, 'thorin', { x: 3, y: 2 })
    expect(original[0].position).toEqual({ x: 0, y: 0 })
  })
})

describe('getToken', () => {
  it('finds token by ID', () => {
    const token = createToken({
      id: 'thorin', name: 'Thorin', type: 'player',
      ownerId: 'user-1', position: { x: 0, y: 0 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    expect(getToken([token], 'thorin')).toBe(token)
  })

  it('returns undefined for missing ID', () => {
    expect(getToken([], 'nonexistent')).toBeUndefined()
  })
})

describe('getTokenAt', () => {
  it('finds token at position', () => {
    const token = createToken({
      id: 'thorin', name: 'Thorin', type: 'player',
      ownerId: 'user-1', position: { x: 3, y: 5 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    expect(getTokenAt([token], { x: 3, y: 5 })).toBe(token)
  })

  it('returns undefined for empty position', () => {
    expect(getTokenAt([], { x: 0, y: 0 })).toBeUndefined()
  })
})

describe('getTokensByType', () => {
  it('filters by type', () => {
    const player = createToken({
      id: 'p1', name: 'Player', type: 'player',
      ownerId: 'u1', position: { x: 0, y: 0 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    const monster = createToken({
      id: 'm1', name: 'Goblin', type: 'monster',
      ownerId: 'gm', position: { x: 5, y: 5 },
      speed: 25, ac: 16, hp: { current: 20, max: 20, temp: 0 },
    })
    expect(getTokensByType([player, monster], 'monster')).toEqual([monster])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: FAIL

- [ ] **Step 3: Implement tokens.ts**

`packages/game-runtime/src/tokens.ts`:
```typescript
import type { Token, TokenType, GridPosition } from './types.js'
import { positionEquals } from './grid.js'

export interface CreateTokenParams {
  id: string
  name: string
  type: TokenType
  ownerId: string
  position: GridPosition
  speed: number
  ac: number
  hp: { current: number; max: number; temp: number }
  visible?: boolean
}

export function createToken(params: CreateTokenParams): Token {
  return {
    conditions: [],
    visible: true,
    ...params,
  }
}

export function addToken(tokens: Token[], token: Token): Token[] {
  if (tokens.some((t) => t.id === token.id)) {
    throw new Error(`Token with duplicate id: ${token.id}`)
  }
  return [...tokens, token]
}

export function removeToken(tokens: Token[], tokenId: string): Token[] {
  return tokens.filter((t) => t.id !== tokenId)
}

export function moveToken(tokens: Token[], tokenId: string, position: GridPosition): Token[] {
  return tokens.map((t) =>
    t.id === tokenId ? { ...t, position } : t
  )
}

export function getToken(tokens: Token[], tokenId: string): Token | undefined {
  return tokens.find((t) => t.id === tokenId)
}

export function getTokenAt(tokens: Token[], position: GridPosition): Token | undefined {
  return tokens.find((t) => positionEquals(t.position, position))
}

export function getTokensByType(tokens: Token[], type: TokenType): Token[] {
  return tokens.filter((t) => t.type === type)
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './tokens.js'` to index.ts.

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/game-runtime/src/
git commit -m "feat(game-runtime): add token management with position and queries"
```

---

### Task 4: State Machine (Exploration/Encounter/Downtime)

**Files:**
- Create: `packages/game-runtime/src/state-machine.ts`
- Test: `packages/game-runtime/src/__tests__/state-machine.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/game-runtime/src/__tests__/state-machine.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createGameState, transitionMode, canTransition } from '../state-machine.js'
import type { GameMode } from '../types.js'

describe('createGameState', () => {
  it('creates initial state in exploration mode', () => {
    const state = createGameState('session-1')
    expect(state.mode).toBe('exploration')
    expect(state.tokens).toEqual([])
    expect(state.initiative).toEqual([])
    expect(state.turnOrder).toEqual([])
    expect(state.currentTurnIndex).toBe(-1)
    expect(state.turn).toBeNull()
    expect(state.round).toBe(0)
    expect(state.actionLog).toEqual([])
  })
})

describe('canTransition', () => {
  it('exploration → encounter: allowed', () => {
    expect(canTransition('exploration', 'encounter')).toBe(true)
  })

  it('exploration → downtime: allowed', () => {
    expect(canTransition('exploration', 'downtime')).toBe(true)
  })

  it('encounter → exploration: allowed', () => {
    expect(canTransition('encounter', 'exploration')).toBe(true)
  })

  it('encounter → downtime: not allowed (must go through exploration)', () => {
    expect(canTransition('encounter', 'downtime')).toBe(false)
  })

  it('downtime → exploration: allowed', () => {
    expect(canTransition('downtime', 'exploration')).toBe(true)
  })

  it('downtime → encounter: not allowed (must go through exploration)', () => {
    expect(canTransition('downtime', 'encounter')).toBe(false)
  })

  it('same mode: not allowed', () => {
    expect(canTransition('exploration', 'exploration')).toBe(false)
  })
})

describe('transitionMode', () => {
  it('transitions exploration → encounter', () => {
    const state = createGameState('session-1')
    const next = transitionMode(state, 'encounter')
    expect(next.mode).toBe('encounter')
  })

  it('logs mode_change event', () => {
    const state = createGameState('session-1')
    const next = transitionMode(state, 'encounter')
    expect(next.actionLog).toHaveLength(1)
    expect(next.actionLog[0].type).toBe('mode_change')
  })

  it('resets encounter state when leaving encounter', () => {
    let state = createGameState('session-1')
    state = { ...state, mode: 'encounter', round: 3, currentTurnIndex: 2 }
    const next = transitionMode(state, 'exploration')
    expect(next.round).toBe(0)
    expect(next.currentTurnIndex).toBe(-1)
    expect(next.turn).toBeNull()
    expect(next.initiative).toEqual([])
    expect(next.turnOrder).toEqual([])
  })

  it('throws for invalid transition', () => {
    const state = { ...createGameState('session-1'), mode: 'encounter' as GameMode }
    expect(() => transitionMode(state, 'downtime')).toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: FAIL

- [ ] **Step 3: Implement state-machine.ts**

`packages/game-runtime/src/state-machine.ts`:
```typescript
import type { GameState, GameMode, GameEvent } from './types.js'

const VALID_TRANSITIONS: Record<GameMode, GameMode[]> = {
  exploration: ['encounter', 'downtime'],
  encounter: ['exploration'],
  downtime: ['exploration'],
}

export function createGameState(sessionId: string): GameState {
  return {
    id: crypto.randomUUID(),
    sessionId,
    mode: 'exploration',
    tokens: [],
    initiative: [],
    turnOrder: [],
    currentTurnIndex: -1,
    turn: null,
    round: 0,
    actionLog: [],
  }
}

export function canTransition(from: GameMode, to: GameMode): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

export function transitionMode(state: GameState, to: GameMode): GameState {
  if (!canTransition(state.mode, to)) {
    throw new Error(`Invalid transition: ${state.mode} → ${to}`)
  }

  const event: GameEvent = {
    type: 'mode_change',
    timestamp: Date.now(),
    data: { from: state.mode, to },
  }

  const base = {
    ...state,
    mode: to,
    actionLog: [...state.actionLog, event],
  }

  // Reset encounter state when leaving encounter
  if (state.mode === 'encounter') {
    return {
      ...base,
      initiative: [],
      turnOrder: [],
      currentTurnIndex: -1,
      turn: null,
      round: 0,
    }
  }

  return base
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './state-machine.js'` to index.ts.

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/game-runtime/src/
git commit -m "feat(game-runtime): add state machine with exploration/encounter/downtime transitions"
```

---

### Task 5: Initiative System

**Files:**
- Create: `packages/game-runtime/src/initiative.ts`
- Test: `packages/game-runtime/src/__tests__/initiative.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/game-runtime/src/__tests__/initiative.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { rollInitiative, sortInitiative, startEncounter } from '../initiative.js'
import { createGameState } from '../state-machine.js'
import { createToken } from '../tokens.js'
import type { InitiativeEntry, Token } from '../types.js'

describe('rollInitiative', () => {
  it('creates initiative entry for a token', () => {
    const entry = rollInitiative('thorin', 7, 14)
    expect(entry.tokenId).toBe('thorin')
    expect(entry.modifier).toBe(7)
    expect(entry.roll).toBe(14)
    expect(entry.total).toBe(21)
  })
})

describe('sortInitiative', () => {
  it('sorts by total descending', () => {
    const entries: InitiativeEntry[] = [
      { tokenId: 'a', roll: 10, modifier: 5, total: 15 },
      { tokenId: 'b', roll: 18, modifier: 3, total: 21 },
      { tokenId: 'c', roll: 12, modifier: 6, total: 18 },
    ]
    const sorted = sortInitiative(entries)
    expect(sorted.map((e) => e.tokenId)).toEqual(['b', 'c', 'a'])
  })

  it('breaks ties by modifier (higher goes first)', () => {
    const entries: InitiativeEntry[] = [
      { tokenId: 'a', roll: 10, modifier: 5, total: 15 },
      { tokenId: 'b', roll: 8, modifier: 7, total: 15 },
    ]
    const sorted = sortInitiative(entries)
    expect(sorted[0].tokenId).toBe('b')
  })
})

describe('startEncounter', () => {
  it('transitions to encounter mode', () => {
    const state = createGameState('session-1')
    const thorin = createToken({
      id: 'thorin', name: 'Thorin', type: 'player',
      ownerId: 'u1', position: { x: 0, y: 0 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    const goblin = createToken({
      id: 'goblin', name: 'Goblin', type: 'monster',
      ownerId: 'gm', position: { x: 5, y: 5 },
      speed: 25, ac: 16, hp: { current: 20, max: 20, temp: 0 },
    })
    const stateWithTokens = { ...state, tokens: [thorin, goblin] }

    const initiatives: InitiativeEntry[] = [
      { tokenId: 'thorin', roll: 15, modifier: 7, total: 22 },
      { tokenId: 'goblin', roll: 12, modifier: 3, total: 15 },
    ]

    const result = startEncounter(stateWithTokens, initiatives)

    expect(result.mode).toBe('encounter')
    expect(result.round).toBe(1)
    expect(result.turnOrder).toEqual(['thorin', 'goblin'])
    expect(result.currentTurnIndex).toBe(0)
    expect(result.turn).not.toBeNull()
    expect(result.turn!.currentTokenId).toBe('thorin')
    expect(result.turn!.actionsRemaining).toBe(3)
    expect(result.turn!.reactionAvailable).toBe(true)
  })

  it('logs encounter_start and round_start events', () => {
    const state = createGameState('session-1')
    const initiatives: InitiativeEntry[] = [
      { tokenId: 'a', roll: 10, modifier: 5, total: 15 },
    ]
    const result = startEncounter(state, initiatives)
    const eventTypes = result.actionLog.map((e) => e.type)
    expect(eventTypes).toContain('mode_change')
    expect(eventTypes).toContain('encounter_start')
    expect(eventTypes).toContain('round_start')
    expect(eventTypes).toContain('turn_start')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: FAIL

- [ ] **Step 3: Implement initiative.ts**

`packages/game-runtime/src/initiative.ts`:
```typescript
import type { GameState, InitiativeEntry, TurnState, GameEvent } from './types.js'
import { transitionMode } from './state-machine.js'

export function rollInitiative(tokenId: string, modifier: number, roll: number): InitiativeEntry {
  return {
    tokenId,
    roll,
    modifier,
    total: roll + modifier,
  }
}

export function sortInitiative(entries: InitiativeEntry[]): InitiativeEntry[] {
  return [...entries].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return b.modifier - a.modifier // tiebreaker: higher modifier
  })
}

export function startEncounter(state: GameState, initiatives: InitiativeEntry[]): GameState {
  // Transition to encounter mode
  let next = transitionMode(state, 'encounter')

  const sorted = sortInitiative(initiatives)
  const turnOrder = sorted.map((e) => e.tokenId)
  const firstTokenId = turnOrder[0]

  const turn: TurnState = {
    currentTokenId: firstTokenId,
    actionsRemaining: 3,
    reactionAvailable: true,
    actionsUsed: [],
  }

  const events: GameEvent[] = [
    { type: 'encounter_start', timestamp: Date.now(), data: { initiatives: sorted } },
    { type: 'round_start', timestamp: Date.now(), data: { round: 1 } },
    { type: 'turn_start', timestamp: Date.now(), data: { tokenId: firstTokenId } },
  ]

  return {
    ...next,
    initiative: sorted,
    turnOrder,
    currentTurnIndex: 0,
    turn,
    round: 1,
    actionLog: [...next.actionLog, ...events],
  }
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './initiative.js'` to index.ts.

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/game-runtime/src/
git commit -m "feat(game-runtime): add initiative system with encounter start"
```

---

### Task 6: Turn Management

**Files:**
- Create: `packages/game-runtime/src/turns.ts`
- Test: `packages/game-runtime/src/__tests__/turns.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/game-runtime/src/__tests__/turns.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { useAction, endTurn, nextTurn, useReaction, getCurrentToken } from '../turns.js'
import { createGameState } from '../state-machine.js'
import { startEncounter } from '../initiative.js'
import type { GameState, TurnState, InitiativeEntry } from '../types.js'

function setupEncounterState(): GameState {
  const state = createGameState('session-1')
  const initiatives: InitiativeEntry[] = [
    { tokenId: 'thorin', roll: 15, modifier: 7, total: 22 },
    { tokenId: 'goblin', roll: 12, modifier: 3, total: 15 },
  ]
  return startEncounter(state, initiatives)
}

describe('useAction', () => {
  it('decrements actions remaining', () => {
    const state = setupEncounterState()
    const next = useAction(state, { type: 'strike', details: 'Longsword attack' })
    expect(next.turn!.actionsRemaining).toBe(2)
  })

  it('records action in actionsUsed', () => {
    const state = setupEncounterState()
    const next = useAction(state, { type: 'strike', details: 'Longsword attack' })
    expect(next.turn!.actionsUsed).toHaveLength(1)
    expect(next.turn!.actionsUsed[0].type).toBe('strike')
  })

  it('logs action_performed event', () => {
    const state = setupEncounterState()
    const next = useAction(state, { type: 'move', details: 'Stride 25ft' })
    const lastEvent = next.actionLog[next.actionLog.length - 1]
    expect(lastEvent.type).toBe('action_performed')
  })

  it('throws when no actions remaining', () => {
    let state = setupEncounterState()
    state = useAction(state, { type: 'strike', details: '1st' })
    state = useAction(state, { type: 'strike', details: '2nd' })
    state = useAction(state, { type: 'strike', details: '3rd' })
    expect(() => useAction(state, { type: 'strike', details: '4th' })).toThrow()
  })

  it('throws when not in encounter', () => {
    const state = createGameState('session-1')
    expect(() => useAction(state, { type: 'strike', details: 'attack' })).toThrow()
  })
})

describe('useReaction', () => {
  it('marks reaction as used', () => {
    const state = setupEncounterState()
    const next = useReaction(state, { type: 'reactive-strike', details: 'AoO' })
    expect(next.turn!.reactionAvailable).toBe(false)
  })

  it('throws when reaction already used', () => {
    let state = setupEncounterState()
    state = useReaction(state, { type: 'reactive-strike', details: 'AoO' })
    expect(() => useReaction(state, { type: 'shield-block', details: 'block' })).toThrow()
  })
})

describe('endTurn / nextTurn', () => {
  it('advances to next token in turn order', () => {
    const state = setupEncounterState()
    expect(state.turn!.currentTokenId).toBe('thorin')

    const next = nextTurn(state)
    expect(next.turn!.currentTokenId).toBe('goblin')
    expect(next.currentTurnIndex).toBe(1)
  })

  it('wraps to round start and increments round', () => {
    let state = setupEncounterState()
    state = nextTurn(state) // goblin's turn
    state = nextTurn(state) // back to thorin, round 2

    expect(state.turn!.currentTokenId).toBe('thorin')
    expect(state.round).toBe(2)
    expect(state.currentTurnIndex).toBe(0)
  })

  it('resets actions and reaction for new turn', () => {
    let state = setupEncounterState()
    state = useAction(state, { type: 'strike', details: 'attack' })
    state = useReaction(state, { type: 'reactive-strike', details: 'AoO' })

    const next = nextTurn(state)
    expect(next.turn!.actionsRemaining).toBe(3)
    expect(next.turn!.reactionAvailable).toBe(true)
    expect(next.turn!.actionsUsed).toEqual([])
  })

  it('logs turn_end and turn_start events', () => {
    const state = setupEncounterState()
    const next = nextTurn(state)
    const eventTypes = next.actionLog.map((e) => e.type)
    expect(eventTypes).toContain('turn_end')
    expect(eventTypes).toContain('turn_start')
  })

  it('logs round_start when wrapping', () => {
    let state = setupEncounterState()
    state = nextTurn(state)
    state = nextTurn(state) // wraps
    const roundStarts = state.actionLog.filter((e) => e.type === 'round_start')
    expect(roundStarts).toHaveLength(2) // initial + wrap
  })
})

describe('getCurrentToken', () => {
  it('returns current turn token ID', () => {
    const state = setupEncounterState()
    expect(getCurrentToken(state)).toBe('thorin')
  })

  it('returns null when not in encounter', () => {
    const state = createGameState('session-1')
    expect(getCurrentToken(state)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: FAIL

- [ ] **Step 3: Implement turns.ts**

`packages/game-runtime/src/turns.ts`:
```typescript
import type { GameState, TurnState, ActionRecord, GameEvent } from './types.js'

export function useAction(state: GameState, action: ActionRecord): GameState {
  if (state.mode !== 'encounter' || !state.turn) {
    throw new Error('Not in encounter mode')
  }
  if (state.turn.actionsRemaining <= 0) {
    throw new Error('No actions remaining')
  }

  const event: GameEvent = {
    type: 'action_performed',
    timestamp: Date.now(),
    data: { tokenId: state.turn.currentTokenId, action },
  }

  return {
    ...state,
    turn: {
      ...state.turn,
      actionsRemaining: state.turn.actionsRemaining - 1,
      actionsUsed: [...state.turn.actionsUsed, action],
    },
    actionLog: [...state.actionLog, event],
  }
}

export function useReaction(state: GameState, action: ActionRecord): GameState {
  if (state.mode !== 'encounter' || !state.turn) {
    throw new Error('Not in encounter mode')
  }
  if (!state.turn.reactionAvailable) {
    throw new Error('Reaction already used this round')
  }

  const event: GameEvent = {
    type: 'action_performed',
    timestamp: Date.now(),
    data: { tokenId: state.turn.currentTokenId, action, isReaction: true },
  }

  return {
    ...state,
    turn: {
      ...state.turn,
      reactionAvailable: false,
      actionsUsed: [...state.turn.actionsUsed, action],
    },
    actionLog: [...state.actionLog, event],
  }
}

export function nextTurn(state: GameState): GameState {
  if (state.mode !== 'encounter' || !state.turn) {
    throw new Error('Not in encounter mode')
  }

  const events: GameEvent[] = [
    {
      type: 'turn_end',
      timestamp: Date.now(),
      data: { tokenId: state.turn.currentTokenId },
    },
  ]

  let nextIndex = state.currentTurnIndex + 1
  let round = state.round

  if (nextIndex >= state.turnOrder.length) {
    nextIndex = 0
    round += 1
    events.push({
      type: 'round_start',
      timestamp: Date.now(),
      data: { round },
    })
  }

  const nextTokenId = state.turnOrder[nextIndex]

  const newTurn: TurnState = {
    currentTokenId: nextTokenId,
    actionsRemaining: 3,
    reactionAvailable: true,
    actionsUsed: [],
  }

  events.push({
    type: 'turn_start',
    timestamp: Date.now(),
    data: { tokenId: nextTokenId },
  })

  return {
    ...state,
    currentTurnIndex: nextIndex,
    turn: newTurn,
    round,
    actionLog: [...state.actionLog, ...events],
  }
}

export function getCurrentToken(state: GameState): string | null {
  if (state.mode !== 'encounter' || !state.turn) return null
  return state.turn.currentTokenId
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './turns.js'` to index.ts.

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/game-runtime/src/
git commit -m "feat(game-runtime): add turn management with action/reaction tracking"
```

---

### Task 7: Event Log

**Files:**
- Create: `packages/game-runtime/src/events.ts`
- Test: `packages/game-runtime/src/__tests__/events.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/game-runtime/src/__tests__/events.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createEvent, filterEvents, getEventsSince, formatEventAsText } from '../events.js'
import type { GameEvent, GameEventType } from '../types.js'

describe('createEvent', () => {
  it('creates event with timestamp', () => {
    const event = createEvent('damage_dealt', { tokenId: 'goblin', damage: 12 })
    expect(event.type).toBe('damage_dealt')
    expect(event.timestamp).toBeGreaterThan(0)
    expect(event.data.damage).toBe(12)
  })
})

describe('filterEvents', () => {
  it('filters by event type', () => {
    const events: GameEvent[] = [
      { type: 'turn_start', timestamp: 1, data: {} },
      { type: 'damage_dealt', timestamp: 2, data: {} },
      { type: 'turn_end', timestamp: 3, data: {} },
      { type: 'damage_dealt', timestamp: 4, data: {} },
    ]
    expect(filterEvents(events, 'damage_dealt')).toHaveLength(2)
  })
})

describe('getEventsSince', () => {
  it('returns events after timestamp', () => {
    const events: GameEvent[] = [
      { type: 'turn_start', timestamp: 100, data: {} },
      { type: 'damage_dealt', timestamp: 200, data: {} },
      { type: 'turn_end', timestamp: 300, data: {} },
    ]
    expect(getEventsSince(events, 150)).toHaveLength(2)
  })
})

describe('formatEventAsText', () => {
  it('formats damage event', () => {
    const event: GameEvent = {
      type: 'damage_dealt',
      timestamp: Date.now(),
      data: { source: 'Thorin', target: 'Goblin', damage: 12, type: 'slashing' },
    }
    const text = formatEventAsText(event)
    expect(text).toContain('Thorin')
    expect(text).toContain('Goblin')
    expect(text).toContain('12')
  })

  it('formats turn start event', () => {
    const event: GameEvent = {
      type: 'turn_start',
      timestamp: Date.now(),
      data: { tokenId: 'thorin' },
    }
    const text = formatEventAsText(event)
    expect(text).toContain('thorin')
  })

  it('formats mode change event', () => {
    const event: GameEvent = {
      type: 'mode_change',
      timestamp: Date.now(),
      data: { from: 'exploration', to: 'encounter' },
    }
    const text = formatEventAsText(event)
    expect(text).toContain('encounter')
  })

  it('handles unknown event gracefully', () => {
    const event: GameEvent = {
      type: 'token_added',
      timestamp: Date.now(),
      data: { tokenId: 'npc-1' },
    }
    const text = formatEventAsText(event)
    expect(text).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: FAIL

- [ ] **Step 3: Implement events.ts**

`packages/game-runtime/src/events.ts`:
```typescript
import type { GameEvent, GameEventType } from './types.js'

export function createEvent(type: GameEventType, data: Record<string, unknown>): GameEvent {
  return {
    type,
    timestamp: Date.now(),
    data,
  }
}

export function filterEvents(events: GameEvent[], type: GameEventType): GameEvent[] {
  return events.filter((e) => e.type === type)
}

export function getEventsSince(events: GameEvent[], timestamp: number): GameEvent[] {
  return events.filter((e) => e.timestamp > timestamp)
}

export function formatEventAsText(event: GameEvent): string {
  switch (event.type) {
    case 'damage_dealt':
      return `${event.data.source} dealt ${event.data.damage} ${event.data.type ?? ''} damage to ${event.data.target}`

    case 'healing_applied':
      return `${event.data.source} healed ${event.data.target} for ${event.data.healing} HP`

    case 'turn_start':
      return `Turn started: ${event.data.tokenId}`

    case 'turn_end':
      return `Turn ended: ${event.data.tokenId}`

    case 'round_start':
      return `Round ${event.data.round} started`

    case 'mode_change':
      return `Mode changed: ${event.data.from} → ${event.data.to}`

    case 'encounter_start':
      return 'Encounter started'

    case 'encounter_end':
      return 'Encounter ended'

    case 'token_moved':
      return `${event.data.tokenId} moved to (${event.data.x}, ${event.data.y})`

    case 'condition_added':
      return `${event.data.tokenId} gained ${event.data.condition}`

    case 'condition_removed':
      return `${event.data.tokenId} lost ${event.data.condition}`

    default:
      return `${event.type}: ${JSON.stringify(event.data)}`
  }
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './events.js'` to index.ts.

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: All tests pass

- [ ] **Step 5: Run full test suite**

Run: `cd /Users/asanstefanski/Private/dndmanager && pnpm test`
Expected: All packages pass

- [ ] **Step 6: Commit**

```bash
git add packages/game-runtime/src/
git commit -m "feat(game-runtime): add event log with filtering and text formatting"
```
