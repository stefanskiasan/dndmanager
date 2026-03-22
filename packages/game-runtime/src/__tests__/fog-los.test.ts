import { describe, it, expect } from 'vitest'
import { hasLineOfSight, castRay } from '../fog/line-of-sight.js'
import type { Wall } from '../fog/types.js'

describe('hasLineOfSight', () => {
  it('returns true with no walls', () => {
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 5, y: 5 }, [])).toBe(true)
  })

  it('returns true when wall is not in the way', () => {
    const walls: Wall[] = [
      { from: { x: 10, y: 0 }, to: { x: 10, y: 10 } },
    ]
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 5, y: 5 }, walls)).toBe(true)
  })

  it('returns false when wall blocks sight', () => {
    const walls: Wall[] = [
      { from: { x: 3, y: 0 }, to: { x: 3, y: 10 } },
    ]
    expect(hasLineOfSight({ x: 0, y: 5 }, { x: 5, y: 5 }, walls)).toBe(false)
  })

  it('returns false when horizontal wall blocks', () => {
    const walls: Wall[] = [
      { from: { x: 0, y: 3 }, to: { x: 10, y: 3 } },
    ]
    expect(hasLineOfSight({ x: 5, y: 0 }, { x: 5, y: 5 }, walls)).toBe(false)
  })

  it('returns true for same position', () => {
    expect(hasLineOfSight({ x: 3, y: 3 }, { x: 3, y: 3 }, [])).toBe(true)
  })
})

describe('castRay', () => {
  it('returns all cells along a line', () => {
    const cells = castRay({ x: 0, y: 0 }, { x: 3, y: 0 })
    expect(cells.length).toBeGreaterThanOrEqual(3)
    expect(cells).toContainEqual({ x: 1, y: 0 })
    expect(cells).toContainEqual({ x: 2, y: 0 })
    expect(cells).toContainEqual({ x: 3, y: 0 })
  })

  it('handles diagonal rays', () => {
    const cells = castRay({ x: 0, y: 0 }, { x: 3, y: 3 })
    expect(cells.length).toBeGreaterThanOrEqual(3)
  })

  it('returns just target for same position', () => {
    const cells = castRay({ x: 3, y: 3 }, { x: 3, y: 3 })
    expect(cells).toContainEqual({ x: 3, y: 3 })
  })
})
