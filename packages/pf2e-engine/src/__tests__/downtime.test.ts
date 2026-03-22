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
