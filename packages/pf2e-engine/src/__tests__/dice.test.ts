import { describe, it, expect, vi } from 'vitest'
import { rollDice, rollD20, parseDiceNotation } from '../dice.js'

describe('rollDice', () => {
  it('rolls correct number of dice', () => {
    const result = rollDice({ count: 3, sides: 6 })
    expect(result.rolls).toHaveLength(3)
    expect(result.formula).toBe('3d6')
  })

  it('each die is within range', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollDice({ count: 1, sides: 20 })
      expect(result.rolls[0]).toBeGreaterThanOrEqual(1)
      expect(result.rolls[0]).toBeLessThanOrEqual(20)
    }
  })

  it('total equals sum of rolls', () => {
    const result = rollDice({ count: 4, sides: 6 })
    expect(result.total).toBe(result.rolls.reduce((a, b) => a + b, 0))
  })

  it('uses provided random function for deterministic testing', () => {
    const mockRandom = vi.fn()
      .mockReturnValueOnce(0.0)   // → 1
      .mockReturnValueOnce(0.999) // → 6
    const result = rollDice({ count: 2, sides: 6 }, mockRandom)
    expect(result.rolls).toEqual([1, 6])
    expect(result.total).toBe(7)
  })
})

describe('rollD20', () => {
  it('returns a number between 1 and 20', () => {
    for (let i = 0; i < 100; i++) {
      const roll = rollD20()
      expect(roll).toBeGreaterThanOrEqual(1)
      expect(roll).toBeLessThanOrEqual(20)
    }
  })

  it('uses provided random function', () => {
    const mockRandom = vi.fn().mockReturnValue(0.5) // → 11
    expect(rollD20(mockRandom)).toBe(11)
  })
})

describe('parseDiceNotation', () => {
  it('parses "1d8"', () => {
    expect(parseDiceNotation('1d8')).toEqual({ count: 1, sides: 8 })
  })

  it('parses "2d6"', () => {
    expect(parseDiceNotation('2d6')).toEqual({ count: 2, sides: 6 })
  })

  it('parses "6d6"', () => {
    expect(parseDiceNotation('6d6')).toEqual({ count: 6, sides: 6 })
  })

  it('parses "1d20"', () => {
    expect(parseDiceNotation('1d20')).toEqual({ count: 1, sides: 20 })
  })

  it('returns null for invalid notation', () => {
    expect(parseDiceNotation('abc')).toBeNull()
    expect(parseDiceNotation('d6')).toBeNull()
    expect(parseDiceNotation('')).toBeNull()
  })
})
