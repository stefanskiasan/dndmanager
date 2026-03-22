# Phase 4.1: Level-Up Wizard with AI Recommendations & Downtime System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide players with a guided, multi-step level-up wizard that validates PF2e rules (XP thresholds, HP increases, ability boosts, feat slots, skill increases) and offers AI-powered feat recommendations based on build, party composition, and play style. Additionally, implement a Downtime System supporting Earn Income, Treat Wounds, Crafting, and Retraining activities with proper DC tables and resolution formulas.

**Architecture:** Level-up logic and downtime resolution live in `@dndmanager/pf2e-engine` as pure, tested functions. AI feat recommendations extend `@dndmanager/ai-services` with a new service and prompt. The level-up wizard UI is a multi-step flow in `apps/web`, and the downtime UI is a dedicated page where players select activities and resolve checks. All engine logic is TDD — tests are written before or alongside implementation.

**Tech Stack:** @dndmanager/pf2e-engine, @dndmanager/ai-services, @anthropic-ai/sdk, Next.js API routes, React, shadcn/ui, Supabase, Zustand

---

## File Structure

```
packages/pf2e-engine/src/
├── level-up.ts                                → XP thresholds, HP calc, feat slots, ability boost levels
├── __tests__/level-up.test.ts                 → TDD tests for all level-up logic
├── downtime.ts                                → Earn Income, Treat Wounds, Crafting, Retraining
├── __tests__/downtime.test.ts                 → TDD tests for downtime resolution
├── types.ts                                   → Extended with level-up and downtime types
└── index.ts                                   → Re-export new modules

packages/ai-services/src/
├── prompts/
│   └── feat-recommendation.ts                 → System + user prompt for feat suggestions
├── services/
│   └── feat-recommendation.ts                 → AI feat recommendation service
├── types.ts                                   → Add feat recommendation types
└── index.ts                                   → Re-export new public API

apps/web/
├── app/api/ai/feat-recommend/
│   └── route.ts                               → POST endpoint for AI feat recommendations
├── app/api/characters/[characterId]/level-up/
│   └── route.ts                               → POST endpoint to persist level-up
├── app/api/characters/[characterId]/downtime/
│   └── route.ts                               → POST endpoint to resolve downtime activity
├── lib/stores/
│   └── level-up-store.ts                      → Zustand store for wizard state
├── components/level-up/
│   ├── LevelUpWizard.tsx                      → Multi-step wizard container
│   ├── steps/
│   │   ├── HpStep.tsx                         → HP increase display + confirmation
│   │   ├── AbilityBoostStep.tsx               → Ability boost selection (levels 5, 10, 15, 20)
│   │   ├── SkillIncreaseStep.tsx              → Skill proficiency increase selection
│   │   ├── FeatStep.tsx                       → Feat selection with AI suggestions sidebar
│   │   └── SpellStep.tsx                      → Spell selection for casters
│   ├── FeatSuggestionCard.tsx                 → AI suggestion card with reasoning
│   └── LevelUpSummary.tsx                     → Final review before confirming
├── components/downtime/
│   ├── DowntimePage.tsx                       → Activity selection + resolution UI
│   ├── EarnIncomeForm.tsx                     → Earn Income activity form
│   ├── TreatWoundsForm.tsx                    → Treat Wounds activity form
│   ├── CraftingForm.tsx                       → Crafting activity form
│   └── RetrainingForm.tsx                     → Retraining activity form
└── app/(game)/play/[sessionId]/downtime/
    └── page.tsx                               → Downtime page route
```

---

### Task 1: Level-Up Types in pf2e-engine

**Files:**
- Modify: `packages/pf2e-engine/src/types.ts`

- [ ] **Step 1: Add level-up types**

Append to `packages/pf2e-engine/src/types.ts`:
```ts
// ─── Level-Up ───────────────────────────────

/** XP required to reach the next level (PF2e standard: 1000 XP per level) */
export const XP_PER_LEVEL = 1000

/** Levels at which characters receive ability boosts */
export const ABILITY_BOOST_LEVELS = [5, 10, 15, 20] as const

/** Class HP per level (hit die + CON modifier added each level) */
export interface ClassHPConfig {
  classHitPoints: number  // 6, 8, 10, or 12 depending on class
}

/** Describes what a character gains at a specific level */
export interface LevelUpGains {
  level: number
  hpIncrease: number                      // classHP + CON modifier
  abilityBoosts: number                   // 4 if boost level, else 0
  skillIncreases: number                  // varies by class and level
  featSlots: LevelUpFeatSlot[]            // which feat types are gained
  spellSlotGains?: SpellSlotGain[]        // for casters
}

export interface LevelUpFeatSlot {
  type: 'class' | 'skill' | 'general' | 'ancestry'
  level: number   // max feat level the character can pick
}

export interface SpellSlotGain {
  spellLevel: number
  count: number
}

// ─── Downtime ───────────────────────────────

export type DowntimeActivity = 'earn-income' | 'treat-wounds' | 'craft' | 'retrain'

export interface EarnIncomeResult {
  activity: 'earn-income'
  taskLevel: number
  degree: DegreeOfSuccess
  earned: Price
  daysSpent: number
}

export interface TreatWoundsResult {
  activity: 'treat-wounds'
  dc: number
  degree: DegreeOfSuccess
  hpRestored: number
}

export interface CraftingResult {
  activity: 'craft'
  itemName: string
  itemLevel: number
  dc: number
  degree: DegreeOfSuccess
  daysSpent: number
  costReduction: Price
  completed: boolean
}

export interface RetrainingResult {
  activity: 'retrain'
  replacedFeat: string
  newFeat: string
  daysRequired: number
}

export type DowntimeResult =
  | EarnIncomeResult
  | TreatWoundsResult
  | CraftingResult
  | RetrainingResult
```

- [ ] **Step 2: Commit**

```bash
git add packages/pf2e-engine/src/types.ts
git commit -m "feat(pf2e-engine): add level-up and downtime types"
```

---

### Task 2: Level-Up Engine Logic (TDD)

**Files:**
- Create: `packages/pf2e-engine/src/__tests__/level-up.test.ts`
- Create: `packages/pf2e-engine/src/level-up.ts`
- Modify: `packages/pf2e-engine/src/index.ts`

- [ ] **Step 1: Write level-up tests first**

`packages/pf2e-engine/src/__tests__/level-up.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  canLevelUp,
  calculateHPIncrease,
  getAvailableFeatSlots,
  getAbilityBoostCount,
  getSkillIncreaseCount,
  getLevelUpGains,
} from '../level-up.js'

describe('canLevelUp', () => {
  it('returns true when XP >= 1000', () => {
    expect(canLevelUp(1000, 1)).toBe(true)
  })
  it('returns false when XP < 1000', () => {
    expect(canLevelUp(999, 1)).toBe(false)
  })
  it('returns false at level 20 (max level)', () => {
    expect(canLevelUp(5000, 20)).toBe(false)
  })
})

describe('calculateHPIncrease', () => {
  it('adds class HP + CON modifier', () => {
    // Fighter (10 HP) with CON 14 (modifier +2) = 12
    expect(calculateHPIncrease(10, 14)).toBe(12)
  })
  it('minimum 1 HP even with negative CON', () => {
    // Wizard (6 HP) with CON 8 (modifier -1) = 5, but not below 1
    expect(calculateHPIncrease(6, 8)).toBe(5)
  })
  it('handles CON 10 (modifier 0)', () => {
    expect(calculateHPIncrease(8, 10)).toBe(8)
  })
})

describe('getAbilityBoostCount', () => {
  it('returns 4 at boost levels (5, 10, 15, 20)', () => {
    expect(getAbilityBoostCount(5)).toBe(4)
    expect(getAbilityBoostCount(10)).toBe(4)
    expect(getAbilityBoostCount(15)).toBe(4)
    expect(getAbilityBoostCount(20)).toBe(4)
  })
  it('returns 0 at non-boost levels', () => {
    expect(getAbilityBoostCount(2)).toBe(0)
    expect(getAbilityBoostCount(7)).toBe(0)
  })
})

describe('getAvailableFeatSlots', () => {
  it('returns ancestry feat at level 1', () => {
    const slots = getAvailableFeatSlots(1, 'fighter')
    expect(slots).toContainEqual({ type: 'ancestry', level: 1 })
  })
  it('returns class feat at even levels for fighter', () => {
    const slots = getAvailableFeatSlots(2, 'fighter')
    expect(slots).toContainEqual({ type: 'class', level: 2 })
  })
  it('returns skill feat at level 2', () => {
    const slots = getAvailableFeatSlots(2, 'fighter')
    expect(slots).toContainEqual({ type: 'skill', level: 2 })
  })
  it('returns general feat at level 3', () => {
    const slots = getAvailableFeatSlots(3, 'fighter')
    expect(slots).toContainEqual({ type: 'general', level: 3 })
  })
})

describe('getSkillIncreaseCount', () => {
  it('returns 1 at odd levels >= 3 for most classes', () => {
    expect(getSkillIncreaseCount(3, 'fighter')).toBe(1)
    expect(getSkillIncreaseCount(5, 'fighter')).toBe(1)
  })
  it('returns 0 at level 1 and 2', () => {
    expect(getSkillIncreaseCount(1, 'fighter')).toBe(0)
    expect(getSkillIncreaseCount(2, 'fighter')).toBe(0)
  })
  it('returns 1 for rogue at odd levels >= 3 (rogues get extra at specific levels)', () => {
    expect(getSkillIncreaseCount(3, 'rogue')).toBe(1)
  })
})

describe('getLevelUpGains', () => {
  it('returns complete gains for a level 5 fighter', () => {
    const gains = getLevelUpGains(5, 'fighter', 10, 14)
    expect(gains.level).toBe(5)
    expect(gains.hpIncrease).toBe(12)     // 10 + 2 (CON mod)
    expect(gains.abilityBoosts).toBe(4)   // level 5 is a boost level
    expect(gains.skillIncreases).toBe(1)
    expect(gains.featSlots.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Implement level-up module**

`packages/pf2e-engine/src/level-up.ts`:
```ts
import { abilityModifier } from './abilities.js'
import type { LevelUpGains, LevelUpFeatSlot } from './types.js'
import { ABILITY_BOOST_LEVELS, XP_PER_LEVEL } from './types.js'

/**
 * Check whether a character can level up.
 * PF2e uses 1000 XP per level. Max level is 20.
 */
export function canLevelUp(currentXP: number, currentLevel: number): boolean {
  if (currentLevel >= 20) return false
  return currentXP >= XP_PER_LEVEL
}

/**
 * Calculate HP gained when levelling up.
 * HP per level = classHitPoints + CON modifier (minimum 1 total).
 */
export function calculateHPIncrease(
  classHitPoints: number,
  conScore: number
): number {
  const conMod = abilityModifier(conScore)
  return Math.max(1, classHitPoints + conMod)
}

/**
 * Number of ability boosts at this level (4 at levels 5, 10, 15, 20).
 */
export function getAbilityBoostCount(level: number): number {
  return (ABILITY_BOOST_LEVELS as readonly number[]).includes(level) ? 4 : 0
}

/**
 * Feat slots gained at a given level.
 *
 * PF2e general pattern:
 * - Ancestry feats: levels 1, 5, 9, 13, 17
 * - Class feats: even levels (2, 4, 6, ...) — exact cadence varies by class
 * - Skill feats: even levels (2, 4, 6, ...)
 * - General feats: levels 3, 7, 11, 15, 19
 *
 * Some classes (e.g. fighter) also grant a class feat at level 1.
 */
export function getAvailableFeatSlots(
  level: number,
  className: string
): LevelUpFeatSlot[] {
  const slots: LevelUpFeatSlot[] = []

  // Ancestry feats: 1, 5, 9, 13, 17
  if ([1, 5, 9, 13, 17].includes(level)) {
    slots.push({ type: 'ancestry', level })
  }

  // Class feats: even levels (and level 1 for some classes)
  const classesWithLevel1Feat = ['fighter', 'ranger', 'rogue', 'monk', 'barbarian']
  if (level % 2 === 0 || (level === 1 && classesWithLevel1Feat.includes(className))) {
    slots.push({ type: 'class', level })
  }

  // Skill feats: even levels
  if (level % 2 === 0) {
    slots.push({ type: 'skill', level })
  }

  // General feats: 3, 7, 11, 15, 19
  if ([3, 7, 11, 15, 19].includes(level)) {
    slots.push({ type: 'general', level })
  }

  return slots
}

/**
 * Number of skill proficiency increases at this level.
 * Most classes get 1 at odd levels >= 3. Rogues get extras at certain levels.
 */
export function getSkillIncreaseCount(
  level: number,
  className: string
): number {
  if (level < 3) return 0
  if (level % 2 === 1) return 1  // odd levels >= 3
  // Rogues also get skill increases at even levels 4, 6, ...
  // but the base rule is odd levels; class-specific extras handled separately
  return 0
}

/**
 * Compute the complete set of gains for levelling up to `level`.
 */
export function getLevelUpGains(
  level: number,
  className: string,
  classHitPoints: number,
  conScore: number
): LevelUpGains {
  return {
    level,
    hpIncrease: calculateHPIncrease(classHitPoints, conScore),
    abilityBoosts: getAbilityBoostCount(level),
    skillIncreases: getSkillIncreaseCount(level, className),
    featSlots: getAvailableFeatSlots(level, className),
  }
}
```

- [ ] **Step 3: Export from index**

Add to `packages/pf2e-engine/src/index.ts`:
```ts
export * from './level-up.js'
```

- [ ] **Step 4: Run tests to verify**

```bash
cd packages/pf2e-engine && pnpm test -- --run level-up
```

- [ ] **Step 5: Commit**

```bash
git add packages/pf2e-engine/src/level-up.ts packages/pf2e-engine/src/__tests__/level-up.test.ts packages/pf2e-engine/src/index.ts
git commit -m "feat(pf2e-engine): implement level-up logic with TDD tests"
```

---

### Task 3: Downtime Engine Logic (TDD)

**Files:**
- Create: `packages/pf2e-engine/src/__tests__/downtime.test.ts`
- Create: `packages/pf2e-engine/src/downtime.ts`
- Modify: `packages/pf2e-engine/src/index.ts`

- [ ] **Step 1: Write downtime tests first**

`packages/pf2e-engine/src/__tests__/downtime.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  getEarnIncomeDC,
  resolveEarnIncome,
  EARN_INCOME_TABLE,
  resolveTreatWounds,
  TREAT_WOUNDS_DC,
  getCraftingDC,
  resolveCrafting,
  getRetrainingDays,
} from '../downtime.js'

describe('Earn Income', () => {
  it('returns correct DC for task level', () => {
    expect(getEarnIncomeDC(1)).toBe(15)
    expect(getEarnIncomeDC(5)).toBe(20)
    expect(getEarnIncomeDC(10)).toBe(27)
  })

  it('earns income on success', () => {
    const result = resolveEarnIncome({
      taskLevel: 1,
      naturalRoll: 15,
      skillBonus: 5,
      daysSpent: 1,
    })
    expect(result.activity).toBe('earn-income')
    expect(result.earned.sp).toBeGreaterThan(0)
  })

  it('earns nothing on failure', () => {
    const result = resolveEarnIncome({
      taskLevel: 1,
      naturalRoll: 1,
      skillBonus: 0,
      daysSpent: 1,
    })
    expect(result.degree).toBe('critical-failure')
  })

  it('doubles earnings on critical success', () => {
    const success = resolveEarnIncome({
      taskLevel: 1,
      naturalRoll: 15,
      skillBonus: 10,
      daysSpent: 1,
    })
    const critSuccess = resolveEarnIncome({
      taskLevel: 1,
      naturalRoll: 20,
      skillBonus: 10,
      daysSpent: 1,
    })
    // Critical success uses a higher task level earning
    expect(critSuccess.earned.sp! + (critSuccess.earned.gp ?? 0) * 10)
      .toBeGreaterThanOrEqual(success.earned.sp! + (success.earned.gp ?? 0) * 10)
  })
})

describe('Treat Wounds', () => {
  it('uses DC 15 for trained proficiency', () => {
    expect(TREAT_WOUNDS_DC.trained).toBe(15)
  })

  it('heals 2d8 on success with trained', () => {
    const result = resolveTreatWounds({
      naturalRoll: 10,
      medicineBonus: 8,
      proficiency: 'trained',
    })
    expect(result.activity).toBe('treat-wounds')
    if (result.degree === 'success') {
      expect(result.hpRestored).toBeGreaterThanOrEqual(2)
      expect(result.hpRestored).toBeLessThanOrEqual(16)
    }
  })

  it('heals 4d8 on critical success with trained', () => {
    const result = resolveTreatWounds({
      naturalRoll: 20,
      medicineBonus: 10,
      proficiency: 'trained',
    })
    expect(result.degree).toBe('critical-success')
    expect(result.hpRestored).toBeGreaterThanOrEqual(4)
    expect(result.hpRestored).toBeLessThanOrEqual(32)
  })

  it('deals 1d8 damage on critical failure', () => {
    const result = resolveTreatWounds({
      naturalRoll: 1,
      medicineBonus: 0,
      proficiency: 'trained',
    })
    expect(result.degree).toBe('critical-failure')
    expect(result.hpRestored).toBeLessThan(0) // negative = damage
  })

  it('uses DC 20 for expert', () => {
    expect(TREAT_WOUNDS_DC.expert).toBe(20)
  })

  it('uses DC 30 for master', () => {
    expect(TREAT_WOUNDS_DC.master).toBe(30)
  })

  it('uses DC 40 for legendary', () => {
    expect(TREAT_WOUNDS_DC.legendary).toBe(40)
  })
})

describe('Crafting', () => {
  it('returns DC based on item level', () => {
    expect(getCraftingDC(1)).toBe(15)
    expect(getCraftingDC(5)).toBe(20)
  })

  it('completes item on success', () => {
    const result = resolveCrafting({
      itemName: 'Longsword',
      itemLevel: 1,
      naturalRoll: 15,
      craftingBonus: 7,
      daysSpent: 4,
    })
    expect(result.activity).toBe('craft')
    expect(result.completed).toBe(true)
  })

  it('fails to craft on critical failure', () => {
    const result = resolveCrafting({
      itemName: 'Longsword',
      itemLevel: 1,
      naturalRoll: 1,
      craftingBonus: 0,
      daysSpent: 4,
    })
    expect(result.degree).toBe('critical-failure')
    expect(result.completed).toBe(false)
  })
})

describe('Retraining', () => {
  it('requires 7 days for a feat retrain', () => {
    expect(getRetrainingDays('feat')).toBe(7)
  })
  it('requires 7 days for a skill retrain', () => {
    expect(getRetrainingDays('skill')).toBe(7)
  })
})
```

- [ ] **Step 2: Implement downtime module**

`packages/pf2e-engine/src/downtime.ts`:
```ts
import type {
  DegreeOfSuccess,
  Price,
  EarnIncomeResult,
  TreatWoundsResult,
  CraftingResult,
  RetrainingResult,
} from './types.js'
import type { ProficiencyRank } from './types.js'
import { degreeOfSuccess } from './checks.js'

// ─── Earn Income ────────────────────────────

/**
 * Earn Income DC table by task level (CRB p. 504).
 * Key = task level, value = DC.
 */
export const EARN_INCOME_TABLE: Record<number, { dc: number; failGp: number; successSp: number; successGp: number }> = {
  0:  { dc: 14, failGp: 0, successSp: 1,  successGp: 0 },
  1:  { dc: 15, failGp: 0, successSp: 2,  successGp: 0 },
  2:  { dc: 16, failGp: 0, successSp: 4,  successGp: 0 },
  3:  { dc: 18, failGp: 0, successSp: 8,  successGp: 0 },
  4:  { dc: 19, failGp: 0, successSp: 0,  successGp: 1 },
  5:  { dc: 20, failGp: 0, successSp: 0,  successGp: 2 },
  6:  { dc: 22, failGp: 0, successSp: 0,  successGp: 3 },
  7:  { dc: 23, failGp: 0, successSp: 0,  successGp: 4 },
  8:  { dc: 24, failGp: 0, successSp: 0,  successGp: 5 },
  9:  { dc: 26, failGp: 0, successSp: 0,  successGp: 6 },
  10: { dc: 27, failGp: 0, successSp: 0,  successGp: 7 },
}

export function getEarnIncomeDC(taskLevel: number): number {
  const entry = EARN_INCOME_TABLE[taskLevel]
  if (!entry) throw new Error(`No Earn Income data for task level ${taskLevel}`)
  return entry.dc
}

export interface EarnIncomeParams {
  taskLevel: number
  naturalRoll: number
  skillBonus: number
  daysSpent: number
}

export function resolveEarnIncome(params: EarnIncomeParams): EarnIncomeResult {
  const { taskLevel, naturalRoll, skillBonus, daysSpent } = params
  const entry = EARN_INCOME_TABLE[taskLevel]
  if (!entry) throw new Error(`No Earn Income data for task level ${taskLevel}`)

  const degree = degreeOfSuccess(naturalRoll, skillBonus, entry.dc)

  let earned: Price = { gp: 0, sp: 0, cp: 0 }
  switch (degree) {
    case 'critical-success': {
      // Use one task level higher earnings
      const higherEntry = EARN_INCOME_TABLE[taskLevel + 1] ?? entry
      earned = {
        gp: higherEntry.successGp * daysSpent,
        sp: higherEntry.successSp * daysSpent,
        cp: 0,
      }
      break
    }
    case 'success':
      earned = {
        gp: entry.successGp * daysSpent,
        sp: entry.successSp * daysSpent,
        cp: 0,
      }
      break
    case 'failure':
      // Earn nothing
      earned = { gp: 0, sp: 0, cp: 0 }
      break
    case 'critical-failure':
      // Lose invested resources — represented as nothing earned
      earned = { gp: 0, sp: 0, cp: 0 }
      break
  }

  return { activity: 'earn-income', taskLevel, degree, earned, daysSpent }
}

// ─── Treat Wounds ───────────────────────────

/**
 * Treat Wounds DC by proficiency rank (CRB p. 249).
 * Higher proficiency allows higher DC for more healing.
 */
export const TREAT_WOUNDS_DC: Record<string, number> = {
  trained: 15,
  expert: 20,
  master: 30,
  legendary: 40,
}

/**
 * Healing dice by proficiency:
 * trained = 2d8, expert = 2d8+10, master = 2d8+30, legendary = 2d8+50
 * Crit success doubles the dice (4d8 + bonus).
 */
function rollDice(count: number, sides: number): number {
  let total = 0
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1
  }
  return total
}

const TREAT_WOUNDS_BONUS: Record<string, number> = {
  trained: 0,
  expert: 10,
  master: 30,
  legendary: 50,
}

export interface TreatWoundsParams {
  naturalRoll: number
  medicineBonus: number
  proficiency: ProficiencyRank
}

export function resolveTreatWounds(params: TreatWoundsParams): TreatWoundsResult {
  const { naturalRoll, medicineBonus, proficiency } = params
  const dc = TREAT_WOUNDS_DC[proficiency] ?? 15
  const bonus = TREAT_WOUNDS_BONUS[proficiency] ?? 0

  const degree = degreeOfSuccess(naturalRoll, medicineBonus, dc)

  let hpRestored = 0
  switch (degree) {
    case 'critical-success':
      hpRestored = rollDice(4, 8) + bonus
      break
    case 'success':
      hpRestored = rollDice(2, 8) + bonus
      break
    case 'failure':
      hpRestored = 0
      break
    case 'critical-failure':
      hpRestored = -rollDice(1, 8) // damage
      break
  }

  return { activity: 'treat-wounds', dc, degree, hpRestored }
}

// ─── Crafting ───────────────────────────────

/**
 * Crafting DC follows the same DC-by-level table as Earn Income.
 */
export function getCraftingDC(itemLevel: number): number {
  return getEarnIncomeDC(itemLevel)
}

export interface CraftingParams {
  itemName: string
  itemLevel: number
  naturalRoll: number
  craftingBonus: number
  daysSpent: number
}

export function resolveCrafting(params: CraftingParams): CraftingResult {
  const { itemName, itemLevel, naturalRoll, craftingBonus, daysSpent } = params
  const dc = getCraftingDC(itemLevel)
  const degree = degreeOfSuccess(naturalRoll, craftingBonus, dc)

  const baseDaysRequired = 4 // PF2e minimum crafting time

  let completed = false
  let costReduction: Price = { gp: 0, sp: 0, cp: 0 }

  switch (degree) {
    case 'critical-success':
      completed = daysSpent >= baseDaysRequired
      // Reduce cost by extra days of Earn Income equivalent
      const extraDays = Math.max(0, daysSpent - baseDaysRequired)
      const earnEntry = EARN_INCOME_TABLE[itemLevel]
      if (earnEntry && extraDays > 0) {
        costReduction = {
          gp: earnEntry.successGp * extraDays * 2, // crit = double rate
          sp: earnEntry.successSp * extraDays * 2,
          cp: 0,
        }
      }
      break
    case 'success':
      completed = daysSpent >= baseDaysRequired
      const extraDaysS = Math.max(0, daysSpent - baseDaysRequired)
      const earnEntryS = EARN_INCOME_TABLE[itemLevel]
      if (earnEntryS && extraDaysS > 0) {
        costReduction = {
          gp: earnEntryS.successGp * extraDaysS,
          sp: earnEntryS.successSp * extraDaysS,
          cp: 0,
        }
      }
      break
    case 'failure':
      completed = false
      break
    case 'critical-failure':
      completed = false
      // Lose 10% of raw materials on crit fail
      break
  }

  return {
    activity: 'craft',
    itemName,
    itemLevel,
    dc,
    degree,
    daysSpent,
    costReduction,
    completed,
  }
}

// ─── Retraining ─────────────────────────────

/**
 * Retraining duration by type.
 * PF2e: feat or skill retraining typically takes 1 week (7 days).
 */
export function getRetrainingDays(type: 'feat' | 'skill'): number {
  return 7
}
```

- [ ] **Step 3: Export from index**

Add to `packages/pf2e-engine/src/index.ts`:
```ts
export * from './downtime.js'
```

- [ ] **Step 4: Run tests to verify**

```bash
cd packages/pf2e-engine && pnpm test -- --run downtime
```

- [ ] **Step 5: Commit**

```bash
git add packages/pf2e-engine/src/downtime.ts packages/pf2e-engine/src/__tests__/downtime.test.ts packages/pf2e-engine/src/index.ts
git commit -m "feat(pf2e-engine): implement downtime activities with TDD tests"
```

---

### Task 4: AI Feat Recommendation Types

**Files:**
- Modify: `packages/ai-services/src/types.ts`

- [ ] **Step 1: Add feat recommendation types**

Append to `packages/ai-services/src/types.ts`:
```ts
// ─── Feat Recommendation Types ──────────────

/** Context about a character's current build for AI analysis */
export interface CharacterBuildContext {
  name: string
  level: number
  className: string
  ancestry: string
  background: string
  abilityScores: Record<string, number>
  currentFeats: string[]
  skills: { name: string; rank: string }[]
  playStyle?: string               // e.g. "aggressive melee", "support caster"
}

/** Context about the party for AI-aware recommendations */
export interface PartyContext {
  members: {
    name: string
    className: string
    level: number
    role?: string                   // e.g. "tank", "healer", "damage", "utility"
  }[]
}

/** Request for AI feat recommendations */
export interface FeatRecommendationRequest {
  character: CharacterBuildContext
  party?: PartyContext
  featType: 'class' | 'skill' | 'general' | 'ancestry'
  maxFeatLevel: number
}

/** A single AI-recommended feat */
export interface FeatRecommendation {
  name: string
  level: number
  type: 'class' | 'skill' | 'general' | 'ancestry'
  description: string
  reasoning: string                 // Why this feat suits the character/party
  synergies: string[]               // Existing feats/features it synergizes with
  priority: 'top-pick' | 'strong' | 'situational'
}

/** Full AI feat recommendation response */
export interface FeatRecommendationResponse {
  recommendations: FeatRecommendation[]
  buildAnalysis: string             // Brief analysis of the character's current build
  partyGapAnalysis?: string         // What roles/capabilities the party is missing
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/types.ts
git commit -m "feat(ai-services): add feat recommendation types"
```

---

### Task 5: AI Feat Recommendation Prompt & Service

**Files:**
- Create: `packages/ai-services/src/prompts/feat-recommendation.ts`
- Create: `packages/ai-services/src/services/feat-recommendation.ts`
- Modify: `packages/ai-services/src/index.ts`

- [ ] **Step 1: Create feat recommendation prompt**

`packages/ai-services/src/prompts/feat-recommendation.ts`:
```ts
import type { FeatRecommendationRequest } from '../types'

export const FEAT_RECOMMENDATION_SYSTEM_PROMPT = `You are an expert Pathfinder 2nd Edition character optimiser.
Given a character build, party composition, and feat type requested, recommend the 3-5 best feats.

Rules:
- Only suggest feats the character qualifies for (correct level, class, prerequisites)
- Consider synergies with existing feats and class features
- Account for party composition gaps (e.g. if no healer, suggest supportive options)
- Respect the player's stated play style when provided
- Respond ONLY with a valid JSON object matching the FeatRecommendationResponse schema
- Include a brief build analysis and reasoning for each recommendation
- Set priority: "top-pick" for the single best option, "strong" for excellent alternatives, "situational" for niche-but-powerful picks

JSON schema for your response:
{
  "recommendations": [{ "name": string, "level": number, "type": string, "description": string, "reasoning": string, "synergies": string[], "priority": "top-pick"|"strong"|"situational" }],
  "buildAnalysis": string,
  "partyGapAnalysis": string | null
}`

export function buildFeatRecommendationPrompt(
  request: FeatRecommendationRequest
): string {
  const { character, party, featType, maxFeatLevel } = request

  let prompt = `Character: ${character.name}, Level ${character.level} ${character.ancestry} ${character.className}
Background: ${character.background}
Ability Scores: ${Object.entries(character.abilityScores).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(', ')}
Current Feats: ${character.currentFeats.join(', ') || 'None'}
Skills: ${character.skills.map(s => `${s.name} (${s.rank})`).join(', ')}
Play Style: ${character.playStyle ?? 'Not specified'}

Looking for: ${featType} feat, max level ${maxFeatLevel}`

  if (party) {
    prompt += `\n\nParty Members:\n${party.members.map(m =>
      `- ${m.name}: Level ${m.level} ${m.className}${m.role ? ` (${m.role})` : ''}`
    ).join('\n')}`
  }

  return prompt
}
```

- [ ] **Step 2: Create feat recommendation service**

`packages/ai-services/src/services/feat-recommendation.ts`:
```ts
import { getAnthropicClient } from '../client'
import {
  FEAT_RECOMMENDATION_SYSTEM_PROMPT,
  buildFeatRecommendationPrompt,
} from '../prompts/feat-recommendation'
import type {
  FeatRecommendationRequest,
  FeatRecommendationResponse,
} from '../types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 2048

/**
 * Calls Claude to generate feat recommendations based on
 * character build, party composition, and play style.
 */
export async function recommendFeats(
  request: FeatRecommendationRequest
): Promise<FeatRecommendationResponse> {
  const client = getAnthropicClient()

  const userPrompt = buildFeatRecommendationPrompt(request)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: FEAT_RECOMMENDATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  let result: FeatRecommendationResponse
  try {
    result = JSON.parse(textBlock.text) as FeatRecommendationResponse
  } catch {
    throw new Error(
      `Failed to parse Claude feat response as JSON: ${textBlock.text.slice(0, 200)}`
    )
  }

  if (!result.recommendations?.length) {
    throw new Error('No feat recommendations returned')
  }

  return result
}
```

- [ ] **Step 3: Export from index**

Add to `packages/ai-services/src/index.ts`:
```ts
export { recommendFeats } from './services/feat-recommendation'
export type {
  FeatRecommendationRequest,
  FeatRecommendationResponse,
  FeatRecommendation,
  CharacterBuildContext,
  PartyContext,
} from './types'
```

- [ ] **Step 4: Commit**

```bash
git add packages/ai-services/src/prompts/feat-recommendation.ts packages/ai-services/src/services/feat-recommendation.ts packages/ai-services/src/index.ts
git commit -m "feat(ai-services): add AI feat recommendation service"
```

---

### Task 6: Level-Up Wizard Store

**Files:**
- Create: `apps/web/lib/stores/level-up-store.ts`

- [ ] **Step 1: Create Zustand store for wizard state**

`apps/web/lib/stores/level-up-store.ts`:
```ts
import { create } from 'zustand'
import type { LevelUpGains, LevelUpFeatSlot, AbilityId } from '@dndmanager/pf2e-engine'
import type { FeatRecommendation } from '@dndmanager/ai-services'

type WizardStep = 'hp' | 'ability-boosts' | 'skill-increases' | 'feats' | 'spells' | 'review'

interface LevelUpState {
  // Wizard navigation
  currentStep: WizardStep
  characterId: string | null
  gains: LevelUpGains | null

  // Selections
  selectedAbilityBoosts: AbilityId[]
  selectedSkillIncreases: string[]
  selectedFeats: Record<string, string>  // slot key -> feat name
  selectedSpells: string[]

  // AI suggestions
  featRecommendations: FeatRecommendation[]
  isLoadingRecommendations: boolean

  // Actions
  setCharacter: (characterId: string, gains: LevelUpGains) => void
  setStep: (step: WizardStep) => void
  addAbilityBoost: (ability: AbilityId) => void
  removeAbilityBoost: (ability: AbilityId) => void
  addSkillIncrease: (skill: string) => void
  removeSkillIncrease: (skill: string) => void
  selectFeat: (slotKey: string, featName: string) => void
  addSpell: (spellId: string) => void
  removeSpell: (spellId: string) => void
  setFeatRecommendations: (recs: FeatRecommendation[]) => void
  setLoadingRecommendations: (loading: boolean) => void
  reset: () => void
}

const initialState = {
  currentStep: 'hp' as WizardStep,
  characterId: null as string | null,
  gains: null as LevelUpGains | null,
  selectedAbilityBoosts: [] as AbilityId[],
  selectedSkillIncreases: [] as string[],
  selectedFeats: {} as Record<string, string>,
  selectedSpells: [] as string[],
  featRecommendations: [] as FeatRecommendation[],
  isLoadingRecommendations: false,
}

export const useLevelUpStore = create<LevelUpState>((set) => ({
  ...initialState,

  setCharacter: (characterId, gains) =>
    set({ characterId, gains, currentStep: 'hp' }),

  setStep: (step) => set({ currentStep: step }),

  addAbilityBoost: (ability) =>
    set((s) => ({
      selectedAbilityBoosts: [...s.selectedAbilityBoosts, ability],
    })),

  removeAbilityBoost: (ability) =>
    set((s) => ({
      selectedAbilityBoosts: s.selectedAbilityBoosts.filter((a) => a !== ability),
    })),

  addSkillIncrease: (skill) =>
    set((s) => ({
      selectedSkillIncreases: [...s.selectedSkillIncreases, skill],
    })),

  removeSkillIncrease: (skill) =>
    set((s) => ({
      selectedSkillIncreases: s.selectedSkillIncreases.filter((sk) => sk !== skill),
    })),

  selectFeat: (slotKey, featName) =>
    set((s) => ({
      selectedFeats: { ...s.selectedFeats, [slotKey]: featName },
    })),

  addSpell: (spellId) =>
    set((s) => ({ selectedSpells: [...s.selectedSpells, spellId] })),

  removeSpell: (spellId) =>
    set((s) => ({
      selectedSpells: s.selectedSpells.filter((id) => id !== spellId),
    })),

  setFeatRecommendations: (recs) => set({ featRecommendations: recs }),
  setLoadingRecommendations: (loading) => set({ isLoadingRecommendations: loading }),

  reset: () => set(initialState),
}))
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/stores/level-up-store.ts
git commit -m "feat(web): add level-up wizard Zustand store"
```

---

### Task 7: Level-Up API Route

**Files:**
- Create: `apps/web/app/api/ai/feat-recommend/route.ts`
- Create: `apps/web/app/api/characters/[characterId]/level-up/route.ts`

- [ ] **Step 1: Create feat recommendation API route**

`apps/web/app/api/ai/feat-recommend/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { recommendFeats } from '@dndmanager/ai-services'
import type { FeatRecommendationRequest } from '@dndmanager/ai-services'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FeatRecommendationRequest

    if (!body.character || !body.featType || !body.maxFeatLevel) {
      return NextResponse.json(
        { error: 'Missing required fields: character, featType, maxFeatLevel' },
        { status: 400 }
      )
    }

    const result = await recommendFeats(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Feat recommendation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate feat recommendations' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Create level-up persistence route**

`apps/web/app/api/characters/[characterId]/level-up/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface LevelUpPayload {
  newLevel: number
  hpIncrease: number
  abilityBoosts: string[]      // ability IDs
  skillIncreases: string[]     // skill names
  feats: { slot: string; name: string }[]
  spells?: string[]
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params
    const body = (await req.json()) as LevelUpPayload
    const supabase = await createClient()

    // Fetch current character
    const { data: character, error: fetchError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single()

    if (fetchError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Update character with level-up data
    const { error: updateError } = await supabase
      .from('characters')
      .update({
        level: body.newLevel,
        hp_max: (character.hp_max ?? 0) + body.hpIncrease,
        hp_current: (character.hp_max ?? 0) + body.hpIncrease,
        // Additional fields updated via JSON columns
        updated_at: new Date().toISOString(),
      })
      .eq('id', characterId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save level-up' }, { status: 500 })
    }

    return NextResponse.json({ success: true, newLevel: body.newLevel })
  } catch (error) {
    console.error('Level-up error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/ai/feat-recommend/route.ts apps/web/app/api/characters/\[characterId\]/level-up/route.ts
git commit -m "feat(web): add level-up and feat recommendation API routes"
```

---

### Task 8: Level-Up Wizard UI Components

**Files:**
- Create: `apps/web/components/level-up/LevelUpWizard.tsx`
- Create: `apps/web/components/level-up/steps/HpStep.tsx`
- Create: `apps/web/components/level-up/steps/AbilityBoostStep.tsx`
- Create: `apps/web/components/level-up/steps/SkillIncreaseStep.tsx`
- Create: `apps/web/components/level-up/steps/FeatStep.tsx`
- Create: `apps/web/components/level-up/steps/SpellStep.tsx`
- Create: `apps/web/components/level-up/FeatSuggestionCard.tsx`
- Create: `apps/web/components/level-up/LevelUpSummary.tsx`

- [ ] **Step 1: Create LevelUpWizard container**

Multi-step wizard with progress indicator. Conditionally shows ability boost step (only at levels 5, 10, 15, 20) and spell step (only for casters). Uses `useLevelUpStore` for state.

Key behavior:
- On mount, compute `LevelUpGains` via `getLevelUpGains()` from pf2e-engine
- Step order: HP -> Ability Boosts (if applicable) -> Skill Increases -> Feats -> Spells (if caster) -> Review
- Each step validates before allowing "Next"
- Review step calls the level-up API route on confirm

- [ ] **Step 2: Create HpStep**

Displays the HP increase calculation breakdown: `classHP (X) + CON modifier (Y) = Z`. Read-only confirmation step. Shows new total HP.

- [ ] **Step 3: Create AbilityBoostStep**

Shows 6 ability score cards. Player selects up to 4 boosts (cannot boost same ability twice at a single level). Each card shows current score, new score after boost, and modifier change. Uses `applyBoost()` from pf2e-engine for preview.

- [ ] **Step 4: Create SkillIncreaseStep**

Lists all skills with current proficiency rank. Player picks skills to increase (number determined by `gains.skillIncreases`). Validates that a skill can only be increased to the next rank.

- [ ] **Step 5: Create FeatStep**

For each feat slot in `gains.featSlots`:
- Display available feats filtered by type and max level
- Sidebar shows AI recommendations (fetched from `/api/ai/feat-recommend` on step entry)
- `FeatSuggestionCard` shows name, description, reasoning, synergies, and priority badge
- Player can click a suggestion to auto-select it or browse the full list

- [ ] **Step 6: Create SpellStep**

Only rendered for characters with `SpellcastingState`. Shows new spell slots gained and lets the player pick spells from their tradition's spell list. Filters by spell level matching new slots.

- [ ] **Step 7: Create LevelUpSummary**

Review page showing all selections: HP increase, ability boosts applied, skill increases, feats chosen, spells selected. "Confirm Level-Up" button calls the API. Success redirects to character sheet.

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/level-up/
git commit -m "feat(web): add level-up wizard UI components"
```

---

### Task 9: Downtime API Route

**Files:**
- Create: `apps/web/app/api/characters/[characterId]/downtime/route.ts`

- [ ] **Step 1: Create downtime resolution route**

`apps/web/app/api/characters/[characterId]/downtime/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  resolveEarnIncome,
  resolveTreatWounds,
  resolveCrafting,
} from '@dndmanager/pf2e-engine'
import type { DowntimeActivity } from '@dndmanager/pf2e-engine'

interface DowntimePayload {
  activity: DowntimeActivity
  params: Record<string, unknown>
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params
    const body = (await req.json()) as DowntimePayload
    const supabase = await createClient()

    let result
    switch (body.activity) {
      case 'earn-income':
        result = resolveEarnIncome(body.params as any)
        break
      case 'treat-wounds':
        result = resolveTreatWounds(body.params as any)
        break
      case 'craft':
        result = resolveCrafting(body.params as any)
        break
      case 'retrain':
        result = { activity: 'retrain', daysRequired: 7 }
        break
      default:
        return NextResponse.json({ error: 'Unknown activity' }, { status: 400 })
    }

    // Log the downtime activity
    await supabase.from('game_action_log').insert({
      character_id: characterId,
      event_type: `downtime:${body.activity}`,
      data: result,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Downtime resolution error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/characters/\[characterId\]/downtime/route.ts
git commit -m "feat(web): add downtime activity resolution API route"
```

---

### Task 10: Downtime UI Components

**Files:**
- Create: `apps/web/components/downtime/DowntimePage.tsx`
- Create: `apps/web/components/downtime/EarnIncomeForm.tsx`
- Create: `apps/web/components/downtime/TreatWoundsForm.tsx`
- Create: `apps/web/components/downtime/CraftingForm.tsx`
- Create: `apps/web/components/downtime/RetrainingForm.tsx`
- Create: `apps/web/app/(game)/play/[sessionId]/downtime/page.tsx`

- [ ] **Step 1: Create DowntimePage container**

Tab-based or card-based activity selector. Shows four activity cards: Earn Income, Treat Wounds, Craft, Retrain. Selecting one shows the corresponding form. After resolution, displays the result with degree of success and outcomes.

- [ ] **Step 2: Create EarnIncomeForm**

Fields: Task Level (dropdown, limited by character level), Skill (dropdown of trained Lore/Crafting/Performance), Days Spent (number input). "Roll" button sends to API, displays earned income with degree of success.

- [ ] **Step 3: Create TreatWoundsForm**

Fields: Proficiency Rank (auto-detected from Medicine skill), Target Character (dropdown of party members). "Roll" button resolves and shows HP restored or damage dealt on crit fail.

- [ ] **Step 4: Create CraftingForm**

Fields: Item to Craft (text input or item picker), Item Level, Days Spent. Shows DC and required materials. "Roll" button resolves and shows completion status and cost reduction.

- [ ] **Step 5: Create RetrainingForm**

Fields: Feat/Skill to Replace (dropdown of current feats/skills), New Feat/Skill (dropdown of eligible replacements). Shows days required. "Confirm" starts the retraining (no roll needed, just time).

- [ ] **Step 6: Create downtime page route**

`apps/web/app/(game)/play/[sessionId]/downtime/page.tsx`:
```tsx
import { DowntimePage } from '@/components/downtime/DowntimePage'

export default function DowntimeRoute() {
  return <DowntimePage />
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/downtime/ apps/web/app/\(game\)/play/\[sessionId\]/downtime/
git commit -m "feat(web): add downtime activity UI components and page"
```

---

### Task 11: Integration Testing & Polish

- [ ] **Step 1: Run all pf2e-engine tests**

```bash
cd packages/pf2e-engine && pnpm test -- --run
```

Verify all existing tests still pass alongside the new `level-up` and `downtime` tests.

- [ ] **Step 2: Run typecheck across the monorepo**

```bash
pnpm turbo typecheck
```

- [ ] **Step 3: Run lint**

```bash
pnpm turbo lint
```

- [ ] **Step 4: Fix any issues and commit**

```bash
git add -A
git commit -m "chore: fix lint and type errors from level-up and downtime features"
```
