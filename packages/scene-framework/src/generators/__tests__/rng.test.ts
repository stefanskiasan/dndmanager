import { describe, it, expect } from 'vitest'
import { createRng, type Rng } from '../rng.js'

describe('createRng', () => {
  it('produces deterministic sequence from same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences from different seeds', () => {
    const a = createRng(42)
    const b = createRng(99)
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).not.toEqual(seqB)
  })

  it('next() returns values in [0, 1)', () => {
    const rng = createRng(123)
    for (let i = 0; i < 1000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('intRange returns integers within [min, max]', () => {
    const rng = createRng(7)
    for (let i = 0; i < 200; i++) {
      const v = rng.intRange(3, 8)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(8)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('pick selects an element from an array', () => {
    const rng = createRng(55)
    const items = ['a', 'b', 'c', 'd']
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(rng.pick(items))
    }
  })

  it('shuffle returns a permutation with all elements', () => {
    const rng = createRng(10)
    const original = [1, 2, 3, 4, 5, 6, 7, 8]
    const shuffled = rng.shuffle([...original])
    expect(shuffled.sort()).toEqual(original.sort())
  })
})
