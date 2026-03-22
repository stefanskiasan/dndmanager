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
