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

  it('nat 20 upgrades degree by one step', () => {
    const result = resolveAttack({
      naturalRoll: 20,
      attackBonus: 0,
      targetAC: 30,
      attackNumber: 1,
      agile: false,
    })
    // total 20 vs AC 30 → 20 <= 30-10 → critical-failure, nat 20 upgrades to failure
    expect(result.hit).toBe(false)
    expect(result.critical).toBe(false)
  })

  it('nat 20 with success becomes critical hit', () => {
    const result = resolveAttack({
      naturalRoll: 20,
      attackBonus: 10,
      targetAC: 25,
      attackNumber: 1,
      agile: false,
    })
    // total 30 vs AC 25 = success, nat 20 upgrades to critical success
    expect(result.hit).toBe(true)
    expect(result.critical).toBe(true)
  })
})
