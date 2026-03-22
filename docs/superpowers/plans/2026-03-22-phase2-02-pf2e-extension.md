# Phase 2.2: PF2e Engine Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the PF2e engine with the spell system (traditions, slots, heightening), skill actions (Trip, Grapple, Demoralize, Recall Knowledge), reactions (Attack of Opportunity, Shield Block), and secret rolls — completing the combat subsystem for a full PF2e encounter.

**Architecture:** New modules in `packages/pf2e-engine/src/`. Each module is a focused file with pure functions. The spell system uses spell slot tracking and heightening rules. Skill actions resolve as checks against DCs. Reactions are validated against trigger conditions. Secret rolls return result only to the GM.

**Tech Stack:** TypeScript strict, Vitest

**Spec:** `docs/superpowers/specs/2026-03-21-dndmanager-platform-design.md` (Sections 8, 10)

---

## File Structure

```
packages/pf2e-engine/src/
├── spells.ts                         → Spell slots, traditions, heightening
├── skills.ts                         → Skill actions (Trip, Grapple, etc.)
├── reactions.ts                      → Reaction validation and resolution
├── secret-rolls.ts                   → Secret roll handling
├── __tests__/
│   ├── spells.test.ts
│   ├── skills.test.ts
│   ├── reactions.test.ts
│   └── secret-rolls.test.ts
```

---

### Task 1: Spell System Types & Slot Tracking

**Files:**
- Modify: `packages/pf2e-engine/src/types.ts`
- Create: `packages/pf2e-engine/src/spells.ts`
- Test: `packages/pf2e-engine/src/__tests__/spells.test.ts`

- [ ] **Step 1: Add spell types to types.ts**

Add to `packages/pf2e-engine/src/types.ts`:
```typescript
// ─── Spells ───────────────────────────────────
export type SpellTradition = 'arcane' | 'divine' | 'occult' | 'primal'
export type SpellComponent = 'somatic' | 'verbal' | 'material' | 'focus'

export interface SpellSlot {
  level: number        // 1-10
  max: number
  used: number
}

export interface SpellDefinition {
  id: string
  name: string
  level: number
  traditions: SpellTradition[]
  components: SpellComponent[]
  castActions: ActionCost
  range?: number       // in feet
  area?: { type: 'burst' | 'cone' | 'line' | 'emanation'; size: number }
  save?: { type: 'fortitude' | 'reflex' | 'will'; basic: boolean }
  damage?: {
    formula: string    // e.g. "6d6"
    type: DamageType
    heightenedPerLevel?: string  // e.g. "2d6" per level above base
  }
  description: string
}

export interface SpellcastingState {
  tradition: SpellTradition
  abilityId: AbilityId
  slots: SpellSlot[]
  knownSpells: string[]        // spell IDs
  preparedSpells?: string[]    // for prepared casters
}
```

- [ ] **Step 2: Write failing tests**

`packages/pf2e-engine/src/__tests__/spells.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import {
  createSpellSlots,
  canCastSpell,
  useSpellSlot,
  restoreAllSlots,
  heightenDamage,
  getAvailableSlotLevels,
} from '../spells.js'
import type { SpellSlot, SpellDefinition } from '../types.js'

describe('createSpellSlots', () => {
  it('creates slots for given levels', () => {
    const slots = createSpellSlots([
      { level: 1, count: 3 },
      { level: 2, count: 2 },
    ])
    expect(slots).toHaveLength(2)
    expect(slots[0]).toEqual({ level: 1, max: 3, used: 0 })
    expect(slots[1]).toEqual({ level: 2, max: 2, used: 0 })
  })
})

describe('canCastSpell', () => {
  it('returns true if slot available at spell level', () => {
    const slots: SpellSlot[] = [{ level: 1, max: 3, used: 0 }]
    expect(canCastSpell(slots, 1)).toBe(true)
  })

  it('returns false if all slots used', () => {
    const slots: SpellSlot[] = [{ level: 1, max: 3, used: 3 }]
    expect(canCastSpell(slots, 1)).toBe(false)
  })

  it('returns true if higher slot available (heightening)', () => {
    const slots: SpellSlot[] = [
      { level: 1, max: 3, used: 3 },
      { level: 2, max: 2, used: 0 },
    ]
    expect(canCastSpell(slots, 1)).toBe(true)
  })

  it('returns false if no slots at or above level', () => {
    const slots: SpellSlot[] = [{ level: 1, max: 3, used: 0 }]
    expect(canCastSpell(slots, 2)).toBe(false)
  })
})

describe('useSpellSlot', () => {
  it('uses a slot at the given level', () => {
    const slots: SpellSlot[] = [{ level: 1, max: 3, used: 0 }]
    const result = useSpellSlot(slots, 1)
    expect(result[0].used).toBe(1)
  })

  it('uses lowest available slot at or above level', () => {
    const slots: SpellSlot[] = [
      { level: 1, max: 3, used: 3 },
      { level: 2, max: 2, used: 0 },
    ]
    const result = useSpellSlot(slots, 1)
    expect(result[0].used).toBe(3) // level 1 unchanged
    expect(result[1].used).toBe(1) // level 2 used
  })

  it('throws if no slot available', () => {
    const slots: SpellSlot[] = [{ level: 1, max: 3, used: 3 }]
    expect(() => useSpellSlot(slots, 1)).toThrow()
  })
})

describe('restoreAllSlots', () => {
  it('resets all used to 0', () => {
    const slots: SpellSlot[] = [
      { level: 1, max: 3, used: 2 },
      { level: 2, max: 2, used: 1 },
    ]
    const result = restoreAllSlots(slots)
    expect(result[0].used).toBe(0)
    expect(result[1].used).toBe(0)
  })
})

describe('heightenDamage', () => {
  it('increases damage dice for heightened spell', () => {
    const spell: SpellDefinition = {
      id: 'fireball',
      name: 'Fireball',
      level: 3,
      traditions: ['arcane', 'primal'],
      components: ['somatic', 'verbal'],
      castActions: 2,
      range: 500,
      area: { type: 'burst', size: 20 },
      save: { type: 'reflex', basic: true },
      damage: { formula: '6d6', type: 'fire', heightenedPerLevel: '2d6' },
      description: '',
    }
    // Cast at level 5 (2 levels above base 3)
    const result = heightenDamage(spell, 5)
    expect(result).toBe('10d6') // 6d6 + 2*2d6
  })

  it('returns base formula at spell level', () => {
    const spell: SpellDefinition = {
      id: 'fireball',
      name: 'Fireball',
      level: 3,
      traditions: ['arcane'],
      components: ['somatic', 'verbal'],
      castActions: 2,
      damage: { formula: '6d6', type: 'fire', heightenedPerLevel: '2d6' },
      description: '',
    }
    expect(heightenDamage(spell, 3)).toBe('6d6')
  })

  it('returns base formula if no heightening defined', () => {
    const spell: SpellDefinition = {
      id: 'magic-missile',
      name: 'Magic Missile',
      level: 1,
      traditions: ['arcane', 'occult'],
      components: ['somatic', 'verbal'],
      castActions: 2,
      damage: { formula: '1d4+1', type: 'force' },
      description: '',
    }
    expect(heightenDamage(spell, 3)).toBe('1d4+1')
  })
})

describe('getAvailableSlotLevels', () => {
  it('returns levels with available slots', () => {
    const slots: SpellSlot[] = [
      { level: 1, max: 3, used: 3 },
      { level: 2, max: 2, used: 1 },
      { level: 3, max: 1, used: 0 },
    ]
    expect(getAvailableSlotLevels(slots)).toEqual([2, 3])
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: FAIL

- [ ] **Step 4: Implement spells.ts**

`packages/pf2e-engine/src/spells.ts`:
```typescript
import type { SpellSlot, SpellDefinition } from './types.js'
import { parseDiceNotation } from './dice.js'

export function createSpellSlots(
  config: { level: number; count: number }[]
): SpellSlot[] {
  return config.map(({ level, count }) => ({
    level,
    max: count,
    used: 0,
  }))
}

export function canCastSpell(slots: SpellSlot[], spellLevel: number): boolean {
  return slots.some((s) => s.level >= spellLevel && s.used < s.max)
}

export function useSpellSlot(slots: SpellSlot[], spellLevel: number): SpellSlot[] {
  const targetIdx = slots.findIndex((s) => s.level >= spellLevel && s.used < s.max)
  if (targetIdx === -1) {
    throw new Error(`No available spell slot at level ${spellLevel} or above`)
  }
  return slots.map((s, i) =>
    i === targetIdx ? { ...s, used: s.used + 1 } : s
  )
}

export function restoreAllSlots(slots: SpellSlot[]): SpellSlot[] {
  return slots.map((s) => ({ ...s, used: 0 }))
}

export function heightenDamage(spell: SpellDefinition, castLevel: number): string {
  if (!spell.damage) return ''
  if (!spell.damage.heightenedPerLevel || castLevel <= spell.level) {
    return spell.damage.formula
  }

  const levelsAbove = castLevel - spell.level
  const baseDice = parseDiceNotation(spell.damage.formula)
  const addDice = parseDiceNotation(spell.damage.heightenedPerLevel)

  if (!baseDice || !addDice) return spell.damage.formula

  const totalCount = baseDice.count + addDice.count * levelsAbove
  return `${totalCount}d${baseDice.sides}`
}

export function getAvailableSlotLevels(slots: SpellSlot[]): number[] {
  return slots.filter((s) => s.used < s.max).map((s) => s.level)
}
```

- [ ] **Step 5: Update index.ts, run tests**

Add `export * from './spells.js'` to index.ts.

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/pf2e-engine/src/
git commit -m "feat(pf2e-engine): add spell system with slots, heightening, and traditions"
```

---

### Task 2: Skill Actions

**Files:**
- Create: `packages/pf2e-engine/src/skills.ts`
- Test: `packages/pf2e-engine/src/__tests__/skills.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/skills.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { resolveSkillAction, SKILL_ACTIONS, getSkillActionInfo } from '../skills.js'

describe('SKILL_ACTIONS', () => {
  it('has Trip defined', () => {
    expect(SKILL_ACTIONS.trip).toBeDefined()
    expect(SKILL_ACTIONS.trip.skill).toBe('athletics')
    expect(SKILL_ACTIONS.trip.actions).toBe(1)
  })

  it('has Grapple defined', () => {
    expect(SKILL_ACTIONS.grapple).toBeDefined()
    expect(SKILL_ACTIONS.grapple.skill).toBe('athletics')
  })

  it('has Demoralize defined', () => {
    expect(SKILL_ACTIONS.demoralize).toBeDefined()
    expect(SKILL_ACTIONS.demoralize.skill).toBe('intimidation')
  })

  it('has Recall Knowledge defined', () => {
    expect(SKILL_ACTIONS.recall_knowledge).toBeDefined()
    expect(SKILL_ACTIONS.recall_knowledge.secret).toBe(true)
  })
})

describe('getSkillActionInfo', () => {
  it('returns action info', () => {
    const info = getSkillActionInfo('trip')
    expect(info).not.toBeNull()
    expect(info!.name).toBe('Trip')
  })

  it('returns null for unknown action', () => {
    expect(getSkillActionInfo('nonexistent')).toBeNull()
  })
})

describe('resolveSkillAction', () => {
  it('resolves Trip with critical success', () => {
    const result = resolveSkillAction('trip', {
      naturalRoll: 20,
      skillBonus: 10,
      dc: 18,
    })
    expect(result.degree).toBe('critical-success')
    expect(result.effects).toContain('target falls prone')
    expect(result.effects).toContain('target takes 1d6 bludgeoning damage')
  })

  it('resolves Trip with success', () => {
    const result = resolveSkillAction('trip', {
      naturalRoll: 12,
      skillBonus: 10,
      dc: 18,
    })
    expect(result.degree).toBe('success')
    expect(result.effects).toContain('target falls prone')
  })

  it('resolves Trip with critical failure (you fall prone)', () => {
    const result = resolveSkillAction('trip', {
      naturalRoll: 1,
      skillBonus: 5,
      dc: 18,
    })
    expect(result.degree).toBe('critical-failure')
    expect(result.effects).toContain('you fall prone')
  })

  it('resolves Demoralize with success', () => {
    const result = resolveSkillAction('demoralize', {
      naturalRoll: 15,
      skillBonus: 8,
      dc: 18,
    })
    expect(result.degree).toBe('success')
    expect(result.effects).toContain('target is frightened 1')
  })

  it('resolves Demoralize with critical success', () => {
    const result = resolveSkillAction('demoralize', {
      naturalRoll: 18,
      skillBonus: 12,
      dc: 18,
    })
    expect(result.degree).toBe('critical-success')
    expect(result.effects).toContain('target is frightened 2')
  })

  it('resolves Grapple with success', () => {
    const result = resolveSkillAction('grapple', {
      naturalRoll: 12,
      skillBonus: 10,
      dc: 18,
    })
    expect(result.degree).toBe('success')
    expect(result.effects).toContain('target is grabbed')
  })

  it('resolves Recall Knowledge as secret', () => {
    const result = resolveSkillAction('recall_knowledge', {
      naturalRoll: 15,
      skillBonus: 8,
      dc: 15,
    })
    expect(result.secret).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: FAIL

- [ ] **Step 3: Implement skills.ts**

`packages/pf2e-engine/src/skills.ts`:
```typescript
import type { DegreeOfSuccess, ActionCost } from './types.js'
import { degreeOfSuccess } from './checks.js'

export interface SkillActionDef {
  id: string
  name: string
  skill: string
  actions: ActionCost
  traits: string[]
  secret: boolean
  successEffects: Record<DegreeOfSuccess, string[]>
}

export interface SkillActionResult {
  actionId: string
  degree: DegreeOfSuccess
  effects: string[]
  secret: boolean
}

export const SKILL_ACTIONS: Record<string, SkillActionDef> = {
  trip: {
    id: 'trip',
    name: 'Trip',
    skill: 'athletics',
    actions: 1,
    traits: ['attack'],
    secret: false,
    successEffects: {
      'critical-success': ['target falls prone', 'target takes 1d6 bludgeoning damage'],
      'success': ['target falls prone'],
      'failure': [],
      'critical-failure': ['you fall prone'],
    },
  },
  grapple: {
    id: 'grapple',
    name: 'Grapple',
    skill: 'athletics',
    actions: 1,
    traits: ['attack'],
    secret: false,
    successEffects: {
      'critical-success': ['target is restrained'],
      'success': ['target is grabbed'],
      'failure': [],
      'critical-failure': ['target can grab you or push you away'],
    },
  },
  shove: {
    id: 'shove',
    name: 'Shove',
    skill: 'athletics',
    actions: 1,
    traits: ['attack'],
    secret: false,
    successEffects: {
      'critical-success': ['push target 10 feet', 'you can follow'],
      'success': ['push target 5 feet', 'you can follow'],
      'failure': [],
      'critical-failure': ['you fall prone'],
    },
  },
  demoralize: {
    id: 'demoralize',
    name: 'Demoralize',
    skill: 'intimidation',
    actions: 1,
    traits: ['auditory', 'emotion', 'mental'],
    secret: false,
    successEffects: {
      'critical-success': ['target is frightened 2'],
      'success': ['target is frightened 1'],
      'failure': [],
      'critical-failure': ['target is temporarily immune for 10 minutes'],
    },
  },
  recall_knowledge: {
    id: 'recall_knowledge',
    name: 'Recall Knowledge',
    skill: 'varies',
    actions: 1,
    traits: ['concentrate', 'secret'],
    secret: true,
    successEffects: {
      'critical-success': ['learn two pieces of information about the target'],
      'success': ['learn one piece of information about the target'],
      'failure': ['no information learned'],
      'critical-failure': ['receive incorrect information'],
    },
  },
  sense_motive: {
    id: 'sense_motive',
    name: 'Sense Motive',
    skill: 'perception',
    actions: 1,
    traits: ['concentrate', 'secret'],
    secret: true,
    successEffects: {
      'critical-success': ['know if target is lying or honest'],
      'success': ['gain a sense of whether target is being honest'],
      'failure': ['no useful information'],
      'critical-failure': ['get a false impression'],
    },
  },
}

export function getSkillActionInfo(actionId: string): SkillActionDef | null {
  return SKILL_ACTIONS[actionId] ?? null
}

export interface ResolveSkillActionParams {
  naturalRoll: number
  skillBonus: number
  dc: number
}

export function resolveSkillAction(
  actionId: string,
  params: ResolveSkillActionParams
): SkillActionResult {
  const action = SKILL_ACTIONS[actionId]
  if (!action) throw new Error(`Unknown skill action: ${actionId}`)

  const degree = degreeOfSuccess(params.naturalRoll, params.skillBonus, params.dc)

  return {
    actionId,
    degree,
    effects: action.successEffects[degree],
    secret: action.secret,
  }
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './skills.js'` to index.ts.

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/pf2e-engine/src/
git commit -m "feat(pf2e-engine): add skill actions (Trip, Grapple, Demoralize, Recall Knowledge)"
```

---

### Task 3: Reactions

**Files:**
- Create: `packages/pf2e-engine/src/reactions.ts`
- Test: `packages/pf2e-engine/src/__tests__/reactions.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/reactions.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { REACTIONS, canUseReaction, resolveReaction } from '../reactions.js'

describe('REACTIONS', () => {
  it('has Reactive Strike defined', () => {
    expect(REACTIONS.reactive_strike).toBeDefined()
    expect(REACTIONS.reactive_strike.trigger).toBe('enemy_leaves_reach')
  })

  it('has Shield Block defined', () => {
    expect(REACTIONS.shield_block).toBeDefined()
    expect(REACTIONS.shield_block.trigger).toBe('damage_taken')
  })
})

describe('canUseReaction', () => {
  it('returns true when reaction available and trigger matches', () => {
    expect(canUseReaction('reactive_strike', {
      reactionAvailable: true,
      trigger: 'enemy_leaves_reach',
      conditions: [],
    })).toBe(true)
  })

  it('returns false when reaction already used', () => {
    expect(canUseReaction('reactive_strike', {
      reactionAvailable: false,
      trigger: 'enemy_leaves_reach',
      conditions: [],
    })).toBe(false)
  })

  it('returns false when trigger does not match', () => {
    expect(canUseReaction('reactive_strike', {
      reactionAvailable: true,
      trigger: 'damage_taken',
      conditions: [],
    })).toBe(false)
  })

  it('returns false when stunned', () => {
    expect(canUseReaction('reactive_strike', {
      reactionAvailable: true,
      trigger: 'enemy_leaves_reach',
      conditions: [{ id: 'stunned', value: 1, source: 'spell' }],
    })).toBe(false)
  })
})

describe('resolveReaction', () => {
  it('resolves Shield Block by reducing damage', () => {
    const result = resolveReaction('shield_block', {
      damage: 15,
      shieldHardness: 5,
      shieldHP: 20,
    })
    expect(result.damageReduced).toBe(5)
    expect(result.remainingDamage).toBe(10)
    expect(result.shieldDamage).toBe(10) // remaining damage goes to shield
  })

  it('shield breaks if damage exceeds shield HP', () => {
    const result = resolveReaction('shield_block', {
      damage: 30,
      shieldHardness: 5,
      shieldHP: 10,
    })
    expect(result.damageReduced).toBe(5)
    expect(result.shieldBroken).toBe(true)
  })

  it('resolves Reactive Strike as a normal attack', () => {
    const result = resolveReaction('reactive_strike', {
      naturalRoll: 15,
      attackBonus: 12,
      targetAC: 20,
    })
    expect(result.hit).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: FAIL

- [ ] **Step 3: Implement reactions.ts**

`packages/pf2e-engine/src/reactions.ts`:
```typescript
import type { ActiveCondition } from './types.js'
import { degreeOfSuccess } from './checks.js'
import { hasCondition } from './conditions.js'

export type ReactionTrigger =
  | 'enemy_leaves_reach'
  | 'enemy_uses_manipulate'
  | 'damage_taken'
  | 'ally_attacked'

export interface ReactionDef {
  id: string
  name: string
  trigger: ReactionTrigger
  description: string
}

export const REACTIONS: Record<string, ReactionDef> = {
  reactive_strike: {
    id: 'reactive_strike',
    name: 'Reactive Strike',
    trigger: 'enemy_leaves_reach',
    description: 'Make a melee Strike against the triggering creature.',
  },
  shield_block: {
    id: 'shield_block',
    name: 'Shield Block',
    trigger: 'damage_taken',
    description: 'Reduce damage by shield hardness.',
  },
}

interface ReactionContext {
  reactionAvailable: boolean
  trigger: string
  conditions: ActiveCondition[]
}

const PREVENTS_REACTIONS: string[] = ['stunned', 'paralyzed', 'unconscious', 'petrified']

export function canUseReaction(reactionId: string, ctx: ReactionContext): boolean {
  const reaction = REACTIONS[reactionId]
  if (!reaction) return false
  if (!ctx.reactionAvailable) return false
  if (reaction.trigger !== ctx.trigger) return false
  if (PREVENTS_REACTIONS.some((c) => hasCondition(ctx.conditions, c as any))) return false
  return true
}

interface ShieldBlockParams {
  damage: number
  shieldHardness: number
  shieldHP: number
}

interface ReactiveStrikeParams {
  naturalRoll: number
  attackBonus: number
  targetAC: number
}

export function resolveReaction(
  reactionId: string,
  params: ShieldBlockParams | ReactiveStrikeParams
): Record<string, unknown> {
  if (reactionId === 'shield_block') {
    const p = params as ShieldBlockParams
    const damageReduced = Math.min(p.damage, p.shieldHardness)
    const remainingDamage = p.damage - damageReduced
    const shieldDamage = remainingDamage
    const shieldBroken = shieldDamage > p.shieldHP

    return {
      damageReduced,
      remainingDamage,
      shieldDamage,
      shieldBroken,
    }
  }

  if (reactionId === 'reactive_strike') {
    const p = params as ReactiveStrikeParams
    const degree = degreeOfSuccess(p.naturalRoll, p.attackBonus, p.targetAC)
    return {
      hit: degree === 'success' || degree === 'critical-success',
      critical: degree === 'critical-success',
      degree,
    }
  }

  throw new Error(`Unknown reaction: ${reactionId}`)
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './reactions.js'` to index.ts.

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/pf2e-engine/src/
git commit -m "feat(pf2e-engine): add reactions (Reactive Strike, Shield Block)"
```

---

### Task 4: Secret Rolls

**Files:**
- Create: `packages/pf2e-engine/src/secret-rolls.ts`
- Test: `packages/pf2e-engine/src/__tests__/secret-rolls.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/secret-rolls.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { isSecretRoll, createSecretRollResult, createPlayerView } from '../secret-rolls.js'

describe('isSecretRoll', () => {
  it('returns true for Recall Knowledge', () => {
    expect(isSecretRoll('recall_knowledge')).toBe(true)
  })

  it('returns true for Sense Motive', () => {
    expect(isSecretRoll('sense_motive')).toBe(true)
  })

  it('returns true for perception trap detection', () => {
    expect(isSecretRoll('perception_trap')).toBe(true)
  })

  it('returns false for Trip', () => {
    expect(isSecretRoll('trip')).toBe(false)
  })

  it('returns false for strike', () => {
    expect(isSecretRoll('strike')).toBe(false)
  })
})

describe('createSecretRollResult', () => {
  it('includes full result for GM', () => {
    const result = createSecretRollResult({
      actionId: 'recall_knowledge',
      naturalRoll: 15,
      modifier: 8,
      dc: 20,
      degree: 'success',
      effects: ['learn one piece of information'],
    })
    expect(result.gmView.naturalRoll).toBe(15)
    expect(result.gmView.degree).toBe('success')
    expect(result.gmView.effects).toHaveLength(1)
  })

  it('hides details from player', () => {
    const result = createSecretRollResult({
      actionId: 'recall_knowledge',
      naturalRoll: 3,
      modifier: 8,
      dc: 20,
      degree: 'failure',
      effects: ['no information learned'],
    })
    expect(result.playerView.message).toBe('Du versuchst dich zu erinnern...')
    expect(result.playerView).not.toHaveProperty('naturalRoll')
    expect(result.playerView).not.toHaveProperty('degree')
  })
})

describe('createPlayerView', () => {
  it('returns generic message for secret actions', () => {
    const view = createPlayerView('recall_knowledge')
    expect(view.message).toBeTruthy()
  })

  it('returns specific message for sense_motive', () => {
    const view = createPlayerView('sense_motive')
    expect(view.message).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: FAIL

- [ ] **Step 3: Implement secret-rolls.ts**

`packages/pf2e-engine/src/secret-rolls.ts`:
```typescript
import type { DegreeOfSuccess } from './types.js'

const SECRET_ACTIONS = new Set([
  'recall_knowledge',
  'sense_motive',
  'perception_trap',
  'perception_secret_door',
])

export function isSecretRoll(actionId: string): boolean {
  return SECRET_ACTIONS.has(actionId)
}

interface SecretRollParams {
  actionId: string
  naturalRoll: number
  modifier: number
  dc: number
  degree: DegreeOfSuccess
  effects: string[]
}

interface SecretRollResult {
  gmView: {
    actionId: string
    naturalRoll: number
    modifier: number
    total: number
    dc: number
    degree: DegreeOfSuccess
    effects: string[]
  }
  playerView: {
    actionId: string
    message: string
  }
}

const PLAYER_MESSAGES: Record<string, string> = {
  recall_knowledge: 'Du versuchst dich zu erinnern...',
  sense_motive: 'Du beobachtest dein Gegenueber genau...',
  perception_trap: 'Du untersuchst die Umgebung...',
  perception_secret_door: 'Du suchst nach verborgenen Durchgaengen...',
}

export function createSecretRollResult(params: SecretRollParams): SecretRollResult {
  return {
    gmView: {
      actionId: params.actionId,
      naturalRoll: params.naturalRoll,
      modifier: params.modifier,
      total: params.naturalRoll + params.modifier,
      dc: params.dc,
      degree: params.degree,
      effects: params.effects,
    },
    playerView: createPlayerView(params.actionId),
  }
}

export function createPlayerView(actionId: string): { actionId: string; message: string } {
  return {
    actionId,
    message: PLAYER_MESSAGES[actionId] ?? 'Du fuehrst eine Aktion aus...',
  }
}
```

- [ ] **Step 4: Update index.ts, run tests**

Add `export * from './secret-rolls.js'` to index.ts.

Run: `pnpm --filter @dndmanager/pf2e-engine test`
Expected: All tests pass

- [ ] **Step 5: Run full test suite**

Run: `pnpm test`
Expected: All packages pass

- [ ] **Step 6: Commit**

```bash
git add packages/pf2e-engine/src/
git commit -m "feat(pf2e-engine): add secret rolls for Recall Knowledge, Sense Motive, Perception"
```
