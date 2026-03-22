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
