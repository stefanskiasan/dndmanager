import { describe, it, expect, vi } from 'vitest'
import { rollDamage, applyCriticalDamage, applyResistance, applyWeakness } from '../damage.js'
import type { DamageRoll } from '../types.js'

describe('rollDamage', () => {
  it('rolls dice and adds bonus', () => {
    const mockRandom = vi.fn()
      .mockReturnValueOnce(0.5) // → 5 on d8
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
