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
    case 'critical-success': {
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
    }
    case 'success': {
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
    }
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
