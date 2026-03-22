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
