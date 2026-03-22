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
