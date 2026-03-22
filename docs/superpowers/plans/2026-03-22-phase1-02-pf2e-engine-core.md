# Phase 1.2: PF2e Engine Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core Pathfinder 2e rules engine as a pure TypeScript library — ability scores, modifiers, proficiency, check resolution, attack/damage, HP tracking, and basic conditions.

**Architecture:** Pure TypeScript package (`packages/pf2e-engine`) with zero UI dependencies. Every rule is a pure function: input data in, result out. TDD throughout — every rule gets tested against known PF2e outcomes before implementation. The engine is the single source of truth for all game mechanics.

**Tech Stack:** TypeScript strict, Vitest

**Spec:** `docs/superpowers/specs/2026-03-21-dndmanager-platform-design.md` (Sections 8, 10, 14)

---

## File Structure

```
packages/pf2e-engine/src/
├── index.ts                          → Public API re-exports
├── types.ts                          → All PF2e type definitions
├── abilities.ts                      → Ability scores & modifiers
├── proficiency.ts                    → Proficiency ranks & bonuses
├── modifiers.ts                      → Modifier collection & stacking
├── dice.ts                           → Dice rolling & notation parsing
├── checks.ts                         → d20 checks & degree of success
├── combat.ts                         → Attack resolution & MAP
├── damage.ts                         → Damage calculation & types
├── hp.ts                             → HP tracking, dying, wounded
├── conditions.ts                     → Condition definitions & effects
├── actions.ts                        → Basic actions (Strike, Move, Step)
├── __tests__/
│   ├── abilities.test.ts
│   ├── proficiency.test.ts
│   ├── modifiers.test.ts
│   ├── dice.test.ts
│   ├── checks.test.ts
│   ├── combat.test.ts
│   ├── damage.test.ts
│   ├── hp.test.ts
│   ├── conditions.test.ts
│   └── actions.test.ts
```

---

### Task 1: PF2e Type Definitions

**Files:**
- Create: `packages/pf2e-engine/src/types.ts`
- Modify: `packages/pf2e-engine/src/index.ts`

- [ ] **Step 1: Create type definitions**

`packages/pf2e-engine/src/types.ts`:
```typescript
// ─── Ability Scores ───────────────────────────
export type AbilityId = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface AbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

// ─── Proficiency ──────────────────────────────
export type ProficiencyRank = 'untrained' | 'trained' | 'expert' | 'master' | 'legendary'

// ─── Modifiers ────────────────────────────────
export type ModifierType =
  | 'ability'
  | 'proficiency'
  | 'circumstance'
  | 'status'
  | 'item'
  | 'untyped'

export interface Modifier {
  type: ModifierType
  value: number
  source: string
  enabled?: boolean
}

// ─── Dice ─────────────────────────────────────
export interface DiceRoll {
  count: number
  sides: number
}

export interface RollResult {
  rolls: number[]
  total: number
  formula: string
}

// ─── Checks ───────────────────────────────────
export type DegreeOfSuccess = 'critical-success' | 'success' | 'failure' | 'critical-failure'

export interface CheckResult {
  naturalRoll: number
  totalModifier: number
  total: number
  dc: number
  degree: DegreeOfSuccess
}

// ─── Damage ───────────────────────────────────
export type DamageType =
  | 'bludgeoning' | 'piercing' | 'slashing'
  | 'fire' | 'cold' | 'electricity' | 'acid' | 'sonic'
  | 'positive' | 'negative' | 'force'
  | 'mental' | 'poison'
  | 'bleed' | 'precision'

export interface DamageRoll {
  dice: DiceRoll
  bonus: number
  type: DamageType
}

export interface DamageResult {
  rolls: number[]
  bonus: number
  total: number
  type: DamageType
}

// ─── HP ───────────────────────────────────────
export interface HitPoints {
  current: number
  max: number
  temp: number
}

export interface DyingState {
  dying: number      // 0-4, 4 = dead
  wounded: number    // increases dying threshold
  doomed: number     // reduces max dying
}

// ─── Conditions ───────────────────────────────
export type ConditionId =
  | 'blinded' | 'clumsy' | 'concealed' | 'confused'
  | 'dazzled' | 'deafened' | 'drained' | 'enfeebled'
  | 'fascinated' | 'fatigued' | 'flat-footed' | 'fleeing'
  | 'frightened' | 'grabbed' | 'hidden' | 'immobilized'
  | 'invisible' | 'observed' | 'paralyzed' | 'persistent-damage'
  | 'petrified' | 'prone' | 'quickened' | 'restrained'
  | 'sickened' | 'slowed' | 'stunned' | 'stupefied'
  | 'unconscious' | 'undetected' | 'wounded'

export interface ActiveCondition {
  id: ConditionId
  value: number       // 0 for valueless conditions, 1+ for valued
  source: string
}

// ─── Combat ───────────────────────────────────
export interface AttackParams {
  attackBonus: number
  targetAC: number
  attackNumber: 1 | 2 | 3
  agile: boolean
  modifiers?: Modifier[]
}

export interface AttackResult {
  check: CheckResult
  hit: boolean
  critical: boolean
}

// ─── Actions ──────────────────────────────────
export type ActionCost = 1 | 2 | 3 | 'free' | 'reaction'

export interface ActionContext {
  actionsRemaining: number
  reactionAvailable: boolean
  conditions: ActiveCondition[]
  speed: number         // in feet
  position: [number, number]
}
```

- [ ] **Step 2: Update index.ts to re-export types**

`packages/pf2e-engine/src/index.ts`:
```typescript
export * from './types.js'
```

- [ ] **Step 3: Verify typecheck**

Run: `cd /Users/asanstefanski/Private/dndmanager && pnpm --filter @dndmanager/pf2e-engine typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/pf2e-engine/src/
git commit -m "feat(pf2e-engine): add core type definitions"
```

---

### Task 2: Ability Scores & Modifiers

**Files:**
- Create: `packages/pf2e-engine/src/abilities.ts`
- Test: `packages/pf2e-engine/src/__tests__/abilities.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/abilities.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { abilityModifier, createAbilityScores, applyBoost, applyFlaw } from '../abilities.js'

describe('abilityModifier', () => {
  it('returns -1 for score 8', () => {
    expect(abilityModifier(8)).toBe(-1)
  })

  it('returns 0 for score 10', () => {
    expect(abilityModifier(10)).toBe(0)
  })

  it('returns 0 for score 11', () => {
    expect(abilityModifier(11)).toBe(0)
  })

  it('returns 1 for score 12', () => {
    expect(abilityModifier(12)).toBe(1)
  })

  it('returns 4 for score 18', () => {
    expect(abilityModifier(18)).toBe(4)
  })

  it('returns 5 for score 20', () => {
    expect(abilityModifier(20)).toBe(5)
  })

  it('returns -5 for score 1', () => {
    expect(abilityModifier(1)).toBe(-5)
  })
})

describe('createAbilityScores', () => {
  it('creates default scores of 10', () => {
    const scores = createAbilityScores()
    expect(scores.str).toBe(10)
    expect(scores.dex).toBe(10)
    expect(scores.con).toBe(10)
    expect(scores.int).toBe(10)
    expect(scores.wis).toBe(10)
    expect(scores.cha).toBe(10)
  })

  it('accepts partial overrides', () => {
    const scores = createAbilityScores({ str: 18, dex: 14 })
    expect(scores.str).toBe(18)
    expect(scores.dex).toBe(14)
    expect(scores.con).toBe(10)
  })
})

describe('applyBoost', () => {
  it('adds 2 to score below 18', () => {
    expect(applyBoost(10)).toBe(12)
  })

  it('adds 2 to score 16', () => {
    expect(applyBoost(16)).toBe(18)
  })

  it('adds 1 to score 18 (partial boost)', () => {
    expect(applyBoost(18)).toBe(19)
  })

  it('adds 1 to score 19 (partial boost)', () => {
    expect(applyBoost(19)).toBe(20)
  })

  it('adds 1 to score 20 (partial boost)', () => {
    expect(applyBoost(20)).toBe(21)
  })
})

describe('applyFlaw', () => {
  it('subtracts 2 from score', () => {
    expect(applyFlaw(10)).toBe(8)
  })

  it('does not go below 1', () => {
    expect(applyFlaw(1)).toBe(1)
  })

  it('subtracts 2 from score 3', () => {
    expect(applyFlaw(3)).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/asanstefanski/Private/dndmanager && pnpm --filter @dndmanager/pf2e-engine test`
Expected: FAIL — module not found

- [ ] **Step 3: Implement abilities.ts**

`packages/pf2e-engine/src/abilities.ts`:
```typescript
import type { AbilityId, AbilityScores } from './types.js'

/**
 * PF2e ability modifier: (score - 10) / 2 rounded down
 */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/**
 * Create ability scores with defaults of 10.
 */
export function createAbilityScores(
  overrides?: Partial<AbilityScores>
): AbilityScores {
  return {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    ...overrides,
  }
}

/**
 * PF2e boost: +2 if below 18, +1 if 18 or above.
 */
export function applyBoost(score: number): number {
  return score >= 18 ? score + 1 : score + 2
}

/**
 * PF2e flaw: -2, minimum 1.
 */
export function applyFlaw(score: number): number {
  return Math.max(1, score - 2)
}
```

- [ ] **Step 4: Update index.ts**

Add to `packages/pf2e-engine/src/index.ts`:
```typescript
export * from './types.js'
export * from './abilities.js'
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: All 13 tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/pf2e-engine/src/
git commit -m "feat(pf2e-engine): add ability scores, modifiers, boosts, flaws"
```

---

### Task 3: Proficiency System

**Files:**
- Create: `packages/pf2e-engine/src/proficiency.ts`
- Test: `packages/pf2e-engine/src/__tests__/proficiency.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/proficiency.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { proficiencyBonus, proficiencyRankValue, nextProficiencyRank } from '../proficiency.js'

describe('proficiencyRankValue', () => {
  it('returns 0 for untrained', () => {
    expect(proficiencyRankValue('untrained')).toBe(0)
  })

  it('returns 2 for trained', () => {
    expect(proficiencyRankValue('trained')).toBe(2)
  })

  it('returns 4 for expert', () => {
    expect(proficiencyRankValue('expert')).toBe(4)
  })

  it('returns 6 for master', () => {
    expect(proficiencyRankValue('master')).toBe(6)
  })

  it('returns 8 for legendary', () => {
    expect(proficiencyRankValue('legendary')).toBe(8)
  })
})

describe('proficiencyBonus', () => {
  it('returns 0 for untrained at any level', () => {
    expect(proficiencyBonus('untrained', 5)).toBe(0)
  })

  it('returns level + rank for trained', () => {
    expect(proficiencyBonus('trained', 1)).toBe(3)   // 1 + 2
    expect(proficiencyBonus('trained', 5)).toBe(7)   // 5 + 2
    expect(proficiencyBonus('trained', 10)).toBe(12)  // 10 + 2
  })

  it('returns level + rank for expert', () => {
    expect(proficiencyBonus('expert', 5)).toBe(9)    // 5 + 4
  })

  it('returns level + rank for master', () => {
    expect(proficiencyBonus('master', 10)).toBe(16)  // 10 + 6
  })

  it('returns level + rank for legendary', () => {
    expect(proficiencyBonus('legendary', 20)).toBe(28) // 20 + 8
  })
})

describe('nextProficiencyRank', () => {
  it('untrained -> trained', () => {
    expect(nextProficiencyRank('untrained')).toBe('trained')
  })

  it('trained -> expert', () => {
    expect(nextProficiencyRank('trained')).toBe('expert')
  })

  it('expert -> master', () => {
    expect(nextProficiencyRank('expert')).toBe('master')
  })

  it('master -> legendary', () => {
    expect(nextProficiencyRank('master')).toBe('legendary')
  })

  it('legendary -> null (max rank)', () => {
    expect(nextProficiencyRank('legendary')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: FAIL

- [ ] **Step 3: Implement proficiency.ts**

`packages/pf2e-engine/src/proficiency.ts`:
```typescript
import type { ProficiencyRank } from './types.js'

const RANK_VALUES: Record<ProficiencyRank, number> = {
  untrained: 0,
  trained: 2,
  expert: 4,
  master: 6,
  legendary: 8,
}

const RANK_ORDER: ProficiencyRank[] = ['untrained', 'trained', 'expert', 'master', 'legendary']

export function proficiencyRankValue(rank: ProficiencyRank): number {
  return RANK_VALUES[rank]
}

/**
 * PF2e proficiency bonus:
 * - Untrained: 0 (no level added)
 * - Trained+: level + rank value
 */
export function proficiencyBonus(rank: ProficiencyRank, level: number): number {
  if (rank === 'untrained') return 0
  return level + RANK_VALUES[rank]
}

export function nextProficiencyRank(rank: ProficiencyRank): ProficiencyRank | null {
  const idx = RANK_ORDER.indexOf(rank)
  if (idx >= RANK_ORDER.length - 1) return null
  return RANK_ORDER[idx + 1]
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './proficiency.js'` to index.ts.

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/pf2e-engine/src/
git commit -m "feat(pf2e-engine): add proficiency system with rank bonuses"
```

---

### Task 4: Modifier Collection & Stacking

**Files:**
- Create: `packages/pf2e-engine/src/modifiers.ts`
- Test: `packages/pf2e-engine/src/__tests__/modifiers.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/modifiers.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { collectModifiers, totalBonus, totalPenalty, netModifier } from '../modifiers.js'
import type { Modifier } from '../types.js'

describe('collectModifiers', () => {
  it('returns empty for no modifiers', () => {
    expect(collectModifiers([])).toEqual({ bonuses: [], penalties: [] })
  })

  it('separates bonuses and penalties', () => {
    const mods: Modifier[] = [
      { type: 'circumstance', value: 2, source: 'flanking' },
      { type: 'status', value: -1, source: 'frightened' },
    ]
    const result = collectModifiers(mods)
    expect(result.bonuses).toHaveLength(1)
    expect(result.penalties).toHaveLength(1)
  })

  it('filters out disabled modifiers', () => {
    const mods: Modifier[] = [
      { type: 'circumstance', value: 2, source: 'flanking', enabled: false },
      { type: 'status', value: 1, source: 'bless' },
    ]
    const result = collectModifiers(mods)
    expect(result.bonuses).toHaveLength(1)
    expect(result.bonuses[0].source).toBe('bless')
  })
})

describe('totalBonus (stacking rules)', () => {
  it('same typed bonuses do not stack — highest wins', () => {
    const mods: Modifier[] = [
      { type: 'circumstance', value: 2, source: 'flanking' },
      { type: 'circumstance', value: 1, source: 'aid' },
    ]
    expect(totalBonus(mods)).toBe(2)
  })

  it('different typed bonuses stack', () => {
    const mods: Modifier[] = [
      { type: 'circumstance', value: 2, source: 'flanking' },
      { type: 'status', value: 1, source: 'bless' },
      { type: 'item', value: 1, source: 'weapon-potency' },
    ]
    expect(totalBonus(mods)).toBe(4)
  })

  it('untyped bonuses always stack', () => {
    const mods: Modifier[] = [
      { type: 'untyped', value: 2, source: 'special-a' },
      { type: 'untyped', value: 1, source: 'special-b' },
    ]
    expect(totalBonus(mods)).toBe(3)
  })

  it('ability modifier stacks with everything', () => {
    const mods: Modifier[] = [
      { type: 'ability', value: 4, source: 'str' },
      { type: 'proficiency', value: 7, source: 'trained+level' },
      { type: 'item', value: 1, source: 'weapon-potency' },
    ]
    expect(totalBonus(mods)).toBe(12)
  })
})

describe('totalPenalty (stacking rules)', () => {
  it('same typed penalties do not stack — worst wins', () => {
    const mods: Modifier[] = [
      { type: 'circumstance', value: -2, source: 'cover' },
      { type: 'circumstance', value: -4, source: 'greater-cover' },
    ]
    expect(totalPenalty(mods)).toBe(-4)
  })

  it('different typed penalties stack', () => {
    const mods: Modifier[] = [
      { type: 'circumstance', value: -2, source: 'cover' },
      { type: 'status', value: -1, source: 'frightened' },
    ]
    expect(totalPenalty(mods)).toBe(-3)
  })

  it('untyped penalties always stack', () => {
    const mods: Modifier[] = [
      { type: 'untyped', value: -5, source: 'map-2' },
      { type: 'untyped', value: -1, source: 'range' },
    ]
    expect(totalPenalty(mods)).toBe(-6)
  })
})

describe('netModifier', () => {
  it('combines bonuses and penalties', () => {
    const mods: Modifier[] = [
      { type: 'ability', value: 4, source: 'str' },
      { type: 'proficiency', value: 7, source: 'trained' },
      { type: 'circumstance', value: 2, source: 'flanking' },
      { type: 'status', value: -2, source: 'frightened' },
      { type: 'untyped', value: -5, source: 'map' },
    ]
    expect(netModifier(mods)).toBe(6) // 4+7+2-2-5 = 6
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: FAIL

- [ ] **Step 3: Implement modifiers.ts**

`packages/pf2e-engine/src/modifiers.ts`:
```typescript
import type { Modifier, ModifierType } from './types.js'

interface CollectedModifiers {
  bonuses: Modifier[]
  penalties: Modifier[]
}

export function collectModifiers(modifiers: Modifier[]): CollectedModifiers {
  const active = modifiers.filter((m) => m.enabled !== false)
  return {
    bonuses: active.filter((m) => m.value > 0),
    penalties: active.filter((m) => m.value < 0),
  }
}

/**
 * PF2e stacking: same bonus type → highest only.
 * Exception: untyped, ability, proficiency always stack.
 */
export function totalBonus(modifiers: Modifier[]): number {
  const { bonuses } = collectModifiers(modifiers)
  const alwaysStack: ModifierType[] = ['untyped', 'ability', 'proficiency']
  const byType = new Map<ModifierType, number>()
  let total = 0

  for (const mod of bonuses) {
    if (alwaysStack.includes(mod.type)) {
      total += mod.value
    } else {
      const current = byType.get(mod.type) ?? 0
      byType.set(mod.type, Math.max(current, mod.value))
    }
  }

  for (const value of byType.values()) {
    total += value
  }

  return total
}

/**
 * PF2e stacking: same penalty type → worst only.
 * Exception: untyped penalties always stack.
 */
export function totalPenalty(modifiers: Modifier[]): number {
  const { penalties } = collectModifiers(modifiers)
  const byType = new Map<ModifierType, number>()
  let total = 0

  for (const mod of penalties) {
    if (mod.type === 'untyped') {
      total += mod.value
    } else {
      const current = byType.get(mod.type) ?? 0
      byType.set(mod.type, Math.min(current, mod.value))
    }
  }

  for (const value of byType.values()) {
    total += value
  }

  return total
}

export function netModifier(modifiers: Modifier[]): number {
  return totalBonus(modifiers) + totalPenalty(modifiers)
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './modifiers.js'` to index.ts.

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/pf2e-engine/src/
git commit -m "feat(pf2e-engine): add modifier stacking rules"
```

---

### Task 5: Dice Rolling

**Files:**
- Create: `packages/pf2e-engine/src/dice.ts`
- Test: `packages/pf2e-engine/src/__tests__/dice.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/dice.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { rollDice, rollD20, parseDiceNotation } from '../dice.js'

describe('rollDice', () => {
  it('rolls correct number of dice', () => {
    const result = rollDice({ count: 3, sides: 6 })
    expect(result.rolls).toHaveLength(3)
    expect(result.formula).toBe('3d6')
  })

  it('each die is within range', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollDice({ count: 1, sides: 20 })
      expect(result.rolls[0]).toBeGreaterThanOrEqual(1)
      expect(result.rolls[0]).toBeLessThanOrEqual(20)
    }
  })

  it('total equals sum of rolls', () => {
    const result = rollDice({ count: 4, sides: 6 })
    expect(result.total).toBe(result.rolls.reduce((a, b) => a + b, 0))
  })

  it('uses provided random function for deterministic testing', () => {
    const mockRandom = vi.fn()
      .mockReturnValueOnce(0.0)   // → 1
      .mockReturnValueOnce(0.999) // → 6
    const result = rollDice({ count: 2, sides: 6 }, mockRandom)
    expect(result.rolls).toEqual([1, 6])
    expect(result.total).toBe(7)
  })
})

describe('rollD20', () => {
  it('returns a number between 1 and 20', () => {
    for (let i = 0; i < 100; i++) {
      const roll = rollD20()
      expect(roll).toBeGreaterThanOrEqual(1)
      expect(roll).toBeLessThanOrEqual(20)
    }
  })

  it('uses provided random function', () => {
    const mockRandom = vi.fn().mockReturnValue(0.5) // → 11
    expect(rollD20(mockRandom)).toBe(11)
  })
})

describe('parseDiceNotation', () => {
  it('parses "1d8"', () => {
    expect(parseDiceNotation('1d8')).toEqual({ count: 1, sides: 8 })
  })

  it('parses "2d6"', () => {
    expect(parseDiceNotation('2d6')).toEqual({ count: 2, sides: 6 })
  })

  it('parses "6d6"', () => {
    expect(parseDiceNotation('6d6')).toEqual({ count: 6, sides: 6 })
  })

  it('parses "1d20"', () => {
    expect(parseDiceNotation('1d20')).toEqual({ count: 1, sides: 20 })
  })

  it('returns null for invalid notation', () => {
    expect(parseDiceNotation('abc')).toBeNull()
    expect(parseDiceNotation('d6')).toBeNull()
    expect(parseDiceNotation('')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: FAIL

- [ ] **Step 3: Implement dice.ts**

`packages/pf2e-engine/src/dice.ts`:
```typescript
import type { DiceRoll, RollResult } from './types.js'

type RandomFn = () => number

function defaultRandom(): number {
  return Math.random()
}

function rollSingleDie(sides: number, random: RandomFn): number {
  return Math.floor(random() * sides) + 1
}

export function rollDice(dice: DiceRoll, random: RandomFn = defaultRandom): RollResult {
  const rolls: number[] = []
  for (let i = 0; i < dice.count; i++) {
    rolls.push(rollSingleDie(dice.sides, random))
  }
  return {
    rolls,
    total: rolls.reduce((a, b) => a + b, 0),
    formula: `${dice.count}d${dice.sides}`,
  }
}

export function rollD20(random: RandomFn = defaultRandom): number {
  return rollSingleDie(20, random)
}

export function parseDiceNotation(notation: string): DiceRoll | null {
  const match = notation.match(/^(\d+)d(\d+)$/)
  if (!match) return null
  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10),
  }
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './dice.js'` to index.ts.

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/pf2e-engine/src/
git commit -m "feat(pf2e-engine): add dice rolling with deterministic testing support"
```

---

### Task 6: Check Resolution & Degree of Success

**Files:**
- Create: `packages/pf2e-engine/src/checks.ts`
- Test: `packages/pf2e-engine/src/__tests__/checks.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/checks.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { degreeOfSuccess, resolveCheck } from '../checks.js'

describe('degreeOfSuccess', () => {
  it('critical success when total >= DC + 10', () => {
    expect(degreeOfSuccess(30, 20, 15)).toBe('critical-success')
  })

  it('natural 20 upgrades failure to success', () => {
    // total = 25 vs DC 30 → base failure, nat 20 upgrades to success
    expect(degreeOfSuccess(20, 5, 30)).toBe('success')
  })

  it('natural 20 upgrades success to critical success', () => {
    // total = 30 vs DC 25 → base success, nat 20 upgrades to critical success
    expect(degreeOfSuccess(20, 10, 25)).toBe('critical-success')
  })

  it('success when total >= DC', () => {
    expect(degreeOfSuccess(15, 10, 20)).toBe('success')
  })

  it('success when total equals DC exactly', () => {
    expect(degreeOfSuccess(10, 10, 20)).toBe('success')
  })

  it('failure when total < DC', () => {
    expect(degreeOfSuccess(5, 10, 20)).toBe('failure')
  })

  it('critical failure when total <= DC - 10', () => {
    expect(degreeOfSuccess(5, 0, 20)).toBe('critical-failure')
  })

  it('critical failure on natural 1 even if would succeed', () => {
    expect(degreeOfSuccess(1, 25, 20)).toBe('failure')
  })

  it('natural 1 downgrades success to failure', () => {
    expect(degreeOfSuccess(1, 25, 20)).toBe('failure')
  })

  it('natural 1 downgrades critical success to success', () => {
    expect(degreeOfSuccess(1, 35, 25)).toBe('success')
  })

  it('natural 1 downgrades failure to critical failure', () => {
    expect(degreeOfSuccess(1, 5, 15)).toBe('critical-failure')
  })
})

describe('resolveCheck', () => {
  it('returns full check result', () => {
    const result = resolveCheck({
      naturalRoll: 15,
      modifier: 10,
      dc: 20,
    })
    expect(result.naturalRoll).toBe(15)
    expect(result.totalModifier).toBe(10)
    expect(result.total).toBe(25)
    expect(result.dc).toBe(20)
    expect(result.degree).toBe('success')
  })

  it('nat 20 with low modifier still crits', () => {
    const result = resolveCheck({
      naturalRoll: 20,
      modifier: 0,
      dc: 25,
    })
    expect(result.degree).toBe('critical-success')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: FAIL

- [ ] **Step 3: Implement checks.ts**

`packages/pf2e-engine/src/checks.ts`:
```typescript
import type { DegreeOfSuccess, CheckResult } from './types.js'

const DEGREE_ORDER: DegreeOfSuccess[] = [
  'critical-failure',
  'failure',
  'success',
  'critical-success',
]

function adjustDegree(degree: DegreeOfSuccess, steps: number): DegreeOfSuccess {
  const idx = DEGREE_ORDER.indexOf(degree)
  const newIdx = Math.max(0, Math.min(DEGREE_ORDER.length - 1, idx + steps))
  return DEGREE_ORDER[newIdx]
}

/**
 * PF2e degree of success:
 * 1. Calculate base degree from total vs DC
 * 2. Natural 20 upgrades by one step
 * 3. Natural 1 downgrades by one step
 */
export function degreeOfSuccess(
  naturalRoll: number,
  modifier: number,
  dc: number
): DegreeOfSuccess {
  const total = naturalRoll + modifier

  // Base degree
  let degree: DegreeOfSuccess
  if (total >= dc + 10) {
    degree = 'critical-success'
  } else if (total >= dc) {
    degree = 'success'
  } else if (total <= dc - 10) {
    degree = 'critical-failure'
  } else {
    degree = 'failure'
  }

  // Natural 20: upgrade one step
  if (naturalRoll === 20) {
    degree = adjustDegree(degree, 1)
  }

  // Natural 1: downgrade one step
  if (naturalRoll === 1) {
    degree = adjustDegree(degree, -1)
  }

  return degree
}

export interface ResolveCheckParams {
  naturalRoll: number
  modifier: number
  dc: number
}

export function resolveCheck(params: ResolveCheckParams): CheckResult {
  const { naturalRoll, modifier, dc } = params
  const total = naturalRoll + modifier
  const degree = degreeOfSuccess(naturalRoll, modifier, dc)

  return {
    naturalRoll,
    totalModifier: modifier,
    total,
    dc,
    degree,
  }
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './checks.js'` to index.ts.

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/pf2e-engine/src/
git commit -m "feat(pf2e-engine): add check resolution with degree of success and nat 1/20 rules"
```

---

### Task 7: Attack Resolution & Multiple Attack Penalty

**Files:**
- Create: `packages/pf2e-engine/src/combat.ts`
- Test: `packages/pf2e-engine/src/__tests__/combat.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/combat.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { multipleAttackPenalty, resolveAttack } from '../combat.js'

describe('multipleAttackPenalty', () => {
  it('no penalty on first attack', () => {
    expect(multipleAttackPenalty(1, false)).toBe(0)
  })

  it('-5 on second attack (non-agile)', () => {
    expect(multipleAttackPenalty(2, false)).toBe(-5)
  })

  it('-10 on third attack (non-agile)', () => {
    expect(multipleAttackPenalty(3, false)).toBe(-10)
  })

  it('-4 on second attack (agile)', () => {
    expect(multipleAttackPenalty(2, true)).toBe(-4)
  })

  it('-8 on third attack (agile)', () => {
    expect(multipleAttackPenalty(3, true)).toBe(-8)
  })
})

describe('resolveAttack', () => {
  it('resolves a hit (total >= AC)', () => {
    const result = resolveAttack({
      naturalRoll: 15,
      attackBonus: 12,
      targetAC: 20,
      attackNumber: 1,
      agile: false,
    })
    expect(result.check.total).toBe(27)
    expect(result.hit).toBe(true)
    expect(result.critical).toBe(false)
  })

  it('resolves a miss (total < AC)', () => {
    const result = resolveAttack({
      naturalRoll: 3,
      attackBonus: 12,
      targetAC: 20,
      attackNumber: 1,
      agile: false,
    })
    expect(result.check.total).toBe(15)
    expect(result.hit).toBe(false)
  })

  it('resolves a critical hit (total >= AC + 10)', () => {
    const result = resolveAttack({
      naturalRoll: 18,
      attackBonus: 12,
      targetAC: 20,
      attackNumber: 1,
      agile: false,
    })
    expect(result.check.total).toBe(30)
    expect(result.hit).toBe(true)
    expect(result.critical).toBe(true)
  })

  it('applies MAP on second attack', () => {
    const result = resolveAttack({
      naturalRoll: 15,
      attackBonus: 12,
      targetAC: 20,
      attackNumber: 2,
      agile: false,
    })
    expect(result.check.totalModifier).toBe(7) // 12 - 5
    expect(result.check.total).toBe(22)
  })

  it('applies agile MAP on second attack', () => {
    const result = resolveAttack({
      naturalRoll: 15,
      attackBonus: 12,
      targetAC: 20,
      attackNumber: 2,
      agile: true,
    })
    expect(result.check.totalModifier).toBe(8) // 12 - 4
  })

  it('applies additional modifiers', () => {
    const result = resolveAttack({
      naturalRoll: 10,
      attackBonus: 12,
      targetAC: 20,
      attackNumber: 1,
      agile: false,
      modifiers: [
        { type: 'circumstance', value: 2, source: 'flanking' },
        { type: 'status', value: -1, source: 'frightened' },
      ],
    })
    expect(result.check.totalModifier).toBe(13) // 12 + 2 - 1
  })

  it('nat 20 is always a critical hit', () => {
    const result = resolveAttack({
      naturalRoll: 20,
      attackBonus: 0,
      targetAC: 30,
      attackNumber: 1,
      agile: false,
    })
    expect(result.critical).toBe(true)
    expect(result.hit).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: FAIL

- [ ] **Step 3: Implement combat.ts**

`packages/pf2e-engine/src/combat.ts`:
```typescript
import type { Modifier, AttackResult } from './types.js'
import { resolveCheck } from './checks.js'
import { netModifier } from './modifiers.js'

export function multipleAttackPenalty(attackNumber: 1 | 2 | 3, agile: boolean): number {
  if (attackNumber === 1) return 0
  if (agile) {
    return attackNumber === 2 ? -4 : -8
  }
  return attackNumber === 2 ? -5 : -10
}

export interface ResolveAttackParams {
  naturalRoll: number
  attackBonus: number
  targetAC: number
  attackNumber: 1 | 2 | 3
  agile: boolean
  modifiers?: Modifier[]
}

export function resolveAttack(params: ResolveAttackParams): AttackResult {
  const { naturalRoll, attackBonus, targetAC, attackNumber, agile, modifiers = [] } = params

  const map = multipleAttackPenalty(attackNumber, agile)
  const additionalMod = netModifier(modifiers)
  const totalMod = attackBonus + map + additionalMod

  const check = resolveCheck({
    naturalRoll,
    modifier: totalMod,
    dc: targetAC,
  })

  return {
    check,
    hit: check.degree === 'success' || check.degree === 'critical-success',
    critical: check.degree === 'critical-success',
  }
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './combat.js'` to index.ts.

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/pf2e-engine/src/
git commit -m "feat(pf2e-engine): add attack resolution with MAP and modifier support"
```

---

### Task 8: Damage Calculation

**Files:**
- Create: `packages/pf2e-engine/src/damage.ts`
- Test: `packages/pf2e-engine/src/__tests__/damage.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/damage.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { rollDamage, applyCriticalDamage, applyResistance, applyWeakness } from '../damage.js'
import type { DamageRoll } from '../types.js'

describe('rollDamage', () => {
  it('rolls dice and adds bonus', () => {
    const mockRandom = vi.fn()
      .mockReturnValueOnce(0.5) // → 4 on d8
    const damage: DamageRoll = {
      dice: { count: 1, sides: 8 },
      bonus: 4,
      type: 'slashing',
    }
    const result = rollDamage(damage, mockRandom)
    expect(result.rolls).toEqual([5])
    expect(result.bonus).toBe(4)
    expect(result.total).toBe(9)
    expect(result.type).toBe('slashing')
  })

  it('minimum damage is 1', () => {
    const damage: DamageRoll = {
      dice: { count: 0, sides: 0 },
      bonus: -5,
      type: 'bludgeoning',
    }
    const result = rollDamage(damage)
    expect(result.total).toBe(1)
  })
})

describe('applyCriticalDamage', () => {
  it('doubles total damage', () => {
    expect(applyCriticalDamage(10)).toBe(20)
  })

  it('doubles damage of 1', () => {
    expect(applyCriticalDamage(1)).toBe(2)
  })
})

describe('applyResistance', () => {
  it('reduces damage by resistance amount', () => {
    expect(applyResistance(10, 5)).toBe(5)
  })

  it('minimum damage is 0', () => {
    expect(applyResistance(3, 10)).toBe(0)
  })
})

describe('applyWeakness', () => {
  it('increases damage by weakness amount', () => {
    expect(applyWeakness(10, 5)).toBe(15)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: FAIL

- [ ] **Step 3: Implement damage.ts**

`packages/pf2e-engine/src/damage.ts`:
```typescript
import type { DamageRoll, DamageResult } from './types.js'
import { rollDice } from './dice.js'

type RandomFn = () => number

export function rollDamage(damage: DamageRoll, random?: RandomFn): DamageResult {
  const diceResult = damage.dice.count > 0
    ? rollDice(damage.dice, random)
    : { rolls: [] as number[], total: 0, formula: '0' }

  const total = Math.max(1, diceResult.total + damage.bonus)

  return {
    rolls: diceResult.rolls,
    bonus: damage.bonus,
    total,
    type: damage.type,
  }
}

export function applyCriticalDamage(damage: number): number {
  return damage * 2
}

export function applyResistance(damage: number, resistance: number): number {
  return Math.max(0, damage - resistance)
}

export function applyWeakness(damage: number, weakness: number): number {
  return damage + weakness
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './damage.js'` to index.ts.

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/pf2e-engine/src/
git commit -m "feat(pf2e-engine): add damage calculation with crit, resistance, weakness"
```

---

### Task 9: HP Tracking & Dying

**Files:**
- Create: `packages/pf2e-engine/src/hp.ts`
- Test: `packages/pf2e-engine/src/__tests__/hp.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/hp.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import {
  createHitPoints,
  applyDamage,
  applyHealing,
  addTempHP,
  createDyingState,
  incrementDying,
  checkDeath,
  applyWounded,
} from '../hp.js'

describe('createHitPoints', () => {
  it('creates HP with max and current equal', () => {
    const hp = createHitPoints(45)
    expect(hp.current).toBe(45)
    expect(hp.max).toBe(45)
    expect(hp.temp).toBe(0)
  })
})

describe('applyDamage', () => {
  it('reduces current HP', () => {
    const hp = createHitPoints(45)
    const result = applyDamage(hp, 10)
    expect(result.current).toBe(35)
  })

  it('temp HP absorbs damage first', () => {
    const hp = { current: 45, max: 45, temp: 10 }
    const result = applyDamage(hp, 15)
    expect(result.temp).toBe(0)
    expect(result.current).toBe(40)
  })

  it('temp HP partially absorbs damage', () => {
    const hp = { current: 45, max: 45, temp: 5 }
    const result = applyDamage(hp, 3)
    expect(result.temp).toBe(2)
    expect(result.current).toBe(45)
  })

  it('HP can go below 0', () => {
    const hp = createHitPoints(10)
    const result = applyDamage(hp, 25)
    expect(result.current).toBe(-15)
  })

  it('does not modify max HP', () => {
    const hp = createHitPoints(45)
    const result = applyDamage(hp, 10)
    expect(result.max).toBe(45)
  })
})

describe('applyHealing', () => {
  it('increases current HP', () => {
    const hp = { current: 20, max: 45, temp: 0 }
    const result = applyHealing(hp, 10)
    expect(result.current).toBe(30)
  })

  it('cannot exceed max HP', () => {
    const hp = { current: 40, max: 45, temp: 0 }
    const result = applyHealing(hp, 20)
    expect(result.current).toBe(45)
  })
})

describe('addTempHP', () => {
  it('sets temp HP', () => {
    const hp = createHitPoints(45)
    const result = addTempHP(hp, 10)
    expect(result.temp).toBe(10)
  })

  it('does not stack — uses higher value', () => {
    const hp = { current: 45, max: 45, temp: 8 }
    const result = addTempHP(hp, 5)
    expect(result.temp).toBe(8)
  })

  it('replaces if new is higher', () => {
    const hp = { current: 45, max: 45, temp: 5 }
    const result = addTempHP(hp, 10)
    expect(result.temp).toBe(10)
  })
})

describe('dying state', () => {
  it('creates default dying state', () => {
    const state = createDyingState()
    expect(state.dying).toBe(0)
    expect(state.wounded).toBe(0)
    expect(state.doomed).toBe(0)
  })

  it('increments dying value', () => {
    const state = createDyingState()
    const result = incrementDying(state)
    expect(result.dying).toBe(1)
  })

  it('wounded adds to dying value', () => {
    const state = { dying: 0, wounded: 2, doomed: 0 }
    const result = incrementDying(state)
    expect(result.dying).toBe(3) // 1 base + 2 wounded
  })

  it('checkDeath returns false when dying < max', () => {
    expect(checkDeath({ dying: 3, wounded: 0, doomed: 0 })).toBe(false)
  })

  it('checkDeath returns true when dying >= 4', () => {
    expect(checkDeath({ dying: 4, wounded: 0, doomed: 0 })).toBe(true)
  })

  it('doomed reduces max dying', () => {
    expect(checkDeath({ dying: 3, wounded: 0, doomed: 1 })).toBe(true) // max = 4-1 = 3
  })

  it('applyWounded increments wounded by 1', () => {
    const state = { dying: 0, wounded: 0, doomed: 0 }
    expect(applyWounded(state).wounded).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: FAIL

- [ ] **Step 3: Implement hp.ts**

`packages/pf2e-engine/src/hp.ts`:
```typescript
import type { HitPoints, DyingState } from './types.js'

export function createHitPoints(max: number): HitPoints {
  return { current: max, max, temp: 0 }
}

export function applyDamage(hp: HitPoints, damage: number): HitPoints {
  let remaining = damage

  // Temp HP absorbs first
  const tempAbsorbed = Math.min(hp.temp, remaining)
  remaining -= tempAbsorbed

  return {
    current: hp.current - remaining,
    max: hp.max,
    temp: hp.temp - tempAbsorbed,
  }
}

export function applyHealing(hp: HitPoints, healing: number): HitPoints {
  return {
    current: Math.min(hp.max, hp.current + healing),
    max: hp.max,
    temp: hp.temp,
  }
}

export function addTempHP(hp: HitPoints, amount: number): HitPoints {
  return {
    ...hp,
    temp: Math.max(hp.temp, amount),
  }
}

export function createDyingState(): DyingState {
  return { dying: 0, wounded: 0, doomed: 0 }
}

export function incrementDying(state: DyingState): DyingState {
  return {
    ...state,
    dying: state.dying + 1 + state.wounded,
  }
}

export function checkDeath(state: DyingState): boolean {
  const maxDying = 4 - state.doomed
  return state.dying >= maxDying
}

export function applyWounded(state: DyingState): DyingState {
  return {
    ...state,
    wounded: state.wounded + 1,
  }
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './hp.js'` to index.ts.

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/pf2e-engine/src/
git commit -m "feat(pf2e-engine): add HP tracking with temp HP, dying, wounded, doomed"
```

---

### Task 10: Basic Conditions

**Files:**
- Create: `packages/pf2e-engine/src/conditions.ts`
- Test: `packages/pf2e-engine/src/__tests__/conditions.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/conditions.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import {
  getConditionModifiers,
  addCondition,
  removeCondition,
  reduceCondition,
  hasCondition,
} from '../conditions.js'
import type { ActiveCondition, Modifier } from '../types.js'

describe('getConditionModifiers', () => {
  it('frightened applies status penalty to all checks', () => {
    const mods = getConditionModifiers({ id: 'frightened', value: 2, source: 'dragon-roar' })
    expect(mods).toContainEqual({
      type: 'status',
      value: -2,
      source: 'frightened',
    } satisfies Modifier)
  })

  it('flat-footed applies -2 circumstance to AC', () => {
    const mods = getConditionModifiers({ id: 'flat-footed', value: 0, source: 'flanking' })
    expect(mods).toContainEqual({
      type: 'circumstance',
      value: -2,
      source: 'flat-footed',
    } satisfies Modifier)
  })

  it('clumsy applies status penalty', () => {
    const mods = getConditionModifiers({ id: 'clumsy', value: 1, source: 'spell' })
    expect(mods).toContainEqual({
      type: 'status',
      value: -1,
      source: 'clumsy',
    } satisfies Modifier)
  })

  it('enfeebled applies status penalty', () => {
    const mods = getConditionModifiers({ id: 'enfeebled', value: 2, source: 'poison' })
    expect(mods).toContainEqual({
      type: 'status',
      value: -2,
      source: 'enfeebled',
    } satisfies Modifier)
  })

  it('sickened applies status penalty', () => {
    const mods = getConditionModifiers({ id: 'sickened', value: 1, source: 'stench' })
    expect(mods).toContainEqual({
      type: 'status',
      value: -1,
      source: 'sickened',
    } satisfies Modifier)
  })

  it('drained applies status penalty', () => {
    const mods = getConditionModifiers({ id: 'drained', value: 2, source: 'vampire' })
    expect(mods).toContainEqual({
      type: 'status',
      value: -2,
      source: 'drained',
    } satisfies Modifier)
  })

  it('stupefied applies status penalty', () => {
    const mods = getConditionModifiers({ id: 'stupefied', value: 1, source: 'curse' })
    expect(mods).toContainEqual({
      type: 'status',
      value: -1,
      source: 'stupefied',
    } satisfies Modifier)
  })

  it('prone applies -2 circumstance to attack', () => {
    const mods = getConditionModifiers({ id: 'prone', value: 0, source: 'tripped' })
    expect(mods).toContainEqual({
      type: 'circumstance',
      value: -2,
      source: 'prone',
    } satisfies Modifier)
  })

  it('condition with no modifiers returns empty array', () => {
    const mods = getConditionModifiers({ id: 'hidden', value: 0, source: 'stealth' })
    expect(mods).toEqual([])
  })
})

describe('condition management', () => {
  it('addCondition adds to list', () => {
    const conditions: ActiveCondition[] = []
    const result = addCondition(conditions, { id: 'frightened', value: 2, source: 'dragon' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('frightened')
  })

  it('addCondition replaces if already exists with higher value', () => {
    const conditions: ActiveCondition[] = [
      { id: 'frightened', value: 1, source: 'goblin' },
    ]
    const result = addCondition(conditions, { id: 'frightened', value: 3, source: 'dragon' })
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(3)
  })

  it('addCondition keeps higher existing value', () => {
    const conditions: ActiveCondition[] = [
      { id: 'frightened', value: 3, source: 'dragon' },
    ]
    const result = addCondition(conditions, { id: 'frightened', value: 1, source: 'goblin' })
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(3)
  })

  it('removeCondition removes by id', () => {
    const conditions: ActiveCondition[] = [
      { id: 'frightened', value: 2, source: 'dragon' },
      { id: 'prone', value: 0, source: 'trip' },
    ]
    const result = removeCondition(conditions, 'frightened')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('prone')
  })

  it('reduceCondition decreases value by 1', () => {
    const conditions: ActiveCondition[] = [
      { id: 'frightened', value: 2, source: 'dragon' },
    ]
    const result = reduceCondition(conditions, 'frightened')
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(1)
  })

  it('reduceCondition removes when value reaches 0', () => {
    const conditions: ActiveCondition[] = [
      { id: 'frightened', value: 1, source: 'dragon' },
    ]
    const result = reduceCondition(conditions, 'frightened')
    expect(result).toHaveLength(0)
  })

  it('hasCondition checks presence', () => {
    const conditions: ActiveCondition[] = [
      { id: 'frightened', value: 2, source: 'dragon' },
    ]
    expect(hasCondition(conditions, 'frightened')).toBe(true)
    expect(hasCondition(conditions, 'prone')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: FAIL

- [ ] **Step 3: Implement conditions.ts**

`packages/pf2e-engine/src/conditions.ts`:
```typescript
import type { ActiveCondition, ConditionId, Modifier } from './types.js'

/**
 * Returns modifiers applied by a condition.
 * PF2e conditions that apply numeric penalties/bonuses.
 */
export function getConditionModifiers(condition: ActiveCondition): Modifier[] {
  const { id, value } = condition

  switch (id) {
    case 'frightened':
      return [{ type: 'status', value: -value, source: 'frightened' }]

    case 'sickened':
      return [{ type: 'status', value: -value, source: 'sickened' }]

    case 'clumsy':
      return [{ type: 'status', value: -value, source: 'clumsy' }]

    case 'enfeebled':
      return [{ type: 'status', value: -value, source: 'enfeebled' }]

    case 'drained':
      return [{ type: 'status', value: -value, source: 'drained' }]

    case 'stupefied':
      return [{ type: 'status', value: -value, source: 'stupefied' }]

    case 'flat-footed':
      return [{ type: 'circumstance', value: -2, source: 'flat-footed' }]

    case 'prone':
      return [{ type: 'circumstance', value: -2, source: 'prone' }]

    default:
      return []
  }
}

export function addCondition(
  conditions: ActiveCondition[],
  condition: ActiveCondition
): ActiveCondition[] {
  const existing = conditions.find((c) => c.id === condition.id)
  if (existing) {
    if (condition.value > existing.value) {
      return conditions.map((c) => (c.id === condition.id ? condition : c))
    }
    return conditions
  }
  return [...conditions, condition]
}

export function removeCondition(
  conditions: ActiveCondition[],
  id: ConditionId
): ActiveCondition[] {
  return conditions.filter((c) => c.id !== id)
}

export function reduceCondition(
  conditions: ActiveCondition[],
  id: ConditionId
): ActiveCondition[] {
  return conditions
    .map((c) => (c.id === id ? { ...c, value: c.value - 1 } : c))
    .filter((c) => c.value > 0 || (c.id !== id))
}

export function hasCondition(conditions: ActiveCondition[], id: ConditionId): boolean {
  return conditions.some((c) => c.id === id)
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './conditions.js'` to index.ts.

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/pf2e-engine/src/
git commit -m "feat(pf2e-engine): add conditions with modifiers and management functions"
```

---

### Task 11: Basic Actions (Strike, Move, Step)

**Files:**
- Create: `packages/pf2e-engine/src/actions.ts`
- Test: `packages/pf2e-engine/src/__tests__/actions.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/actions.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { canAct, canMove, movementCost, validateStrike, validateMove, validateStep } from '../actions.js'
import type { ActionContext } from '../types.js'

function makeContext(overrides?: Partial<ActionContext>): ActionContext {
  return {
    actionsRemaining: 3,
    reactionAvailable: true,
    conditions: [],
    speed: 25,
    position: [0, 0],
    ...overrides,
  }
}

describe('canAct', () => {
  it('returns true with actions remaining', () => {
    expect(canAct(makeContext())).toBe(true)
  })

  it('returns false with no actions', () => {
    expect(canAct(makeContext({ actionsRemaining: 0 }))).toBe(false)
  })

  it('returns false when paralyzed', () => {
    expect(canAct(makeContext({
      conditions: [{ id: 'paralyzed', value: 0, source: 'spell' }],
    }))).toBe(false)
  })

  it('returns false when unconscious', () => {
    expect(canAct(makeContext({
      conditions: [{ id: 'unconscious', value: 0, source: 'dying' }],
    }))).toBe(false)
  })
})

describe('canMove', () => {
  it('returns true normally', () => {
    expect(canMove(makeContext())).toBe(true)
  })

  it('returns false when immobilized', () => {
    expect(canMove(makeContext({
      conditions: [{ id: 'immobilized', value: 0, source: 'web' }],
    }))).toBe(false)
  })

  it('returns false when grabbed', () => {
    expect(canMove(makeContext({
      conditions: [{ id: 'grabbed', value: 0, source: 'tentacle' }],
    }))).toBe(false)
  })

  it('returns false when restrained', () => {
    expect(canMove(makeContext({
      conditions: [{ id: 'restrained', value: 0, source: 'chains' }],
    }))).toBe(false)
  })
})

describe('movementCost', () => {
  it('normal terrain costs 5ft per square', () => {
    expect(movementCost(1, false)).toBe(5)
    expect(movementCost(3, false)).toBe(15)
  })

  it('difficult terrain costs 10ft per square', () => {
    expect(movementCost(1, true)).toBe(10)
    expect(movementCost(3, true)).toBe(30)
  })
})

describe('validateStrike', () => {
  it('valid with 1+ actions', () => {
    expect(validateStrike(makeContext()).valid).toBe(true)
  })

  it('invalid with 0 actions', () => {
    expect(validateStrike(makeContext({ actionsRemaining: 0 })).valid).toBe(false)
  })

  it('costs 1 action', () => {
    expect(validateStrike(makeContext()).cost).toBe(1)
  })
})

describe('validateMove (Stride)', () => {
  it('valid with 1+ actions and not immobilized', () => {
    expect(validateMove(makeContext(), 5).valid).toBe(true)
  })

  it('invalid if distance exceeds speed', () => {
    expect(validateMove(makeContext({ speed: 25 }), 30).valid).toBe(false)
  })

  it('valid if distance equals speed', () => {
    expect(validateMove(makeContext({ speed: 25 }), 25).valid).toBe(true)
  })

  it('invalid when immobilized', () => {
    expect(validateMove(makeContext({
      conditions: [{ id: 'immobilized', value: 0, source: 'web' }],
    }), 5).valid).toBe(false)
  })

  it('costs 1 action', () => {
    expect(validateMove(makeContext(), 5).cost).toBe(1)
  })
})

describe('validateStep', () => {
  it('valid with 1+ actions', () => {
    expect(validateStep(makeContext()).valid).toBe(true)
  })

  it('costs 1 action', () => {
    expect(validateStep(makeContext()).cost).toBe(1)
  })

  it('max distance is 5 feet (1 square)', () => {
    expect(validateStep(makeContext()).maxDistance).toBe(5)
  })

  it('invalid when immobilized', () => {
    expect(validateStep(makeContext({
      conditions: [{ id: 'immobilized', value: 0, source: 'web' }],
    })).valid).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: FAIL

- [ ] **Step 3: Implement actions.ts**

`packages/pf2e-engine/src/actions.ts`:
```typescript
import type { ActionContext, ActionCost, ConditionId } from './types.js'
import { hasCondition } from './conditions.js'

interface ActionValidation {
  valid: boolean
  reason?: string
  cost: ActionCost
}

interface StepValidation extends ActionValidation {
  maxDistance: number
}

const PREVENTS_ACTING: ConditionId[] = ['paralyzed', 'petrified', 'unconscious']
const PREVENTS_MOVING: ConditionId[] = ['immobilized', 'grabbed', 'restrained', 'paralyzed', 'petrified', 'unconscious']

export function canAct(ctx: ActionContext): boolean {
  if (ctx.actionsRemaining <= 0) return false
  return !PREVENTS_ACTING.some((id) => hasCondition(ctx.conditions, id))
}

export function canMove(ctx: ActionContext): boolean {
  return !PREVENTS_MOVING.some((id) => hasCondition(ctx.conditions, id))
}

export function movementCost(squares: number, difficultTerrain: boolean): number {
  return squares * (difficultTerrain ? 10 : 5)
}

export function validateStrike(ctx: ActionContext): ActionValidation {
  if (!canAct(ctx)) {
    return { valid: false, reason: 'Cannot act', cost: 1 }
  }
  return { valid: true, cost: 1 }
}

export function validateMove(ctx: ActionContext, distanceFeet: number): ActionValidation {
  if (!canAct(ctx)) {
    return { valid: false, reason: 'Cannot act', cost: 1 }
  }
  if (!canMove(ctx)) {
    return { valid: false, reason: 'Cannot move', cost: 1 }
  }
  if (distanceFeet > ctx.speed) {
    return { valid: false, reason: 'Exceeds speed', cost: 1 }
  }
  return { valid: true, cost: 1 }
}

export function validateStep(ctx: ActionContext): StepValidation {
  if (!canAct(ctx)) {
    return { valid: false, reason: 'Cannot act', cost: 1, maxDistance: 5 }
  }
  if (!canMove(ctx)) {
    return { valid: false, reason: 'Cannot move', cost: 1, maxDistance: 5 }
  }
  return { valid: true, cost: 1, maxDistance: 5 }
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './actions.js'` to index.ts.

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: All tests pass

- [ ] **Step 5: Run full test suite**

Run: `cd /Users/asanstefanski/Private/dndmanager && pnpm test`
Expected: All packages pass (shared + pf2e-engine), placeholder packages pass with no tests

- [ ] **Step 6: Commit**

```bash
git add packages/pf2e-engine/src/
git commit -m "feat(pf2e-engine): add basic actions (Strike, Move, Step) with validation"
```
