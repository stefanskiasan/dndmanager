import { describe, it, expect } from 'vitest'
import { gridDistance, isAdjacent, getAdjacentPositions, positionsInRange, positionEquals } from '../grid.js'
import type { GridPosition } from '../types.js'

describe('gridDistance', () => {
  it('returns 0 for same position', () => {
    expect(gridDistance({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(0)
  })

  it('returns 5 for adjacent horizontal', () => {
    expect(gridDistance({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(5)
  })

  it('returns 5 for adjacent vertical', () => {
    expect(gridDistance({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(5)
  })

  it('returns 5 for diagonal (PF2e: first diagonal = 5ft)', () => {
    expect(gridDistance({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(5)
  })

  it('returns 15 for 2 diagonal + 1 straight (Chebyshev * 5)', () => {
    expect(gridDistance({ x: 0, y: 0 }, { x: 3, y: 2 })).toBe(15)
  })

  it('returns 25 for 5 squares straight', () => {
    expect(gridDistance({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(25)
  })
})

describe('isAdjacent', () => {
  it('returns true for horizontal neighbor', () => {
    expect(isAdjacent({ x: 3, y: 3 }, { x: 4, y: 3 })).toBe(true)
  })

  it('returns true for diagonal neighbor', () => {
    expect(isAdjacent({ x: 3, y: 3 }, { x: 4, y: 4 })).toBe(true)
  })

  it('returns false for same position', () => {
    expect(isAdjacent({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(false)
  })

  it('returns false for 2 squares away', () => {
    expect(isAdjacent({ x: 3, y: 3 }, { x: 5, y: 3 })).toBe(false)
  })
})

describe('getAdjacentPositions', () => {
  it('returns 8 positions for open field', () => {
    const adj = getAdjacentPositions({ x: 5, y: 5 })
    expect(adj).toHaveLength(8)
  })

  it('includes all cardinal and diagonal neighbors', () => {
    const adj = getAdjacentPositions({ x: 1, y: 1 })
    expect(adj).toContainEqual({ x: 0, y: 0 })
    expect(adj).toContainEqual({ x: 1, y: 0 })
    expect(adj).toContainEqual({ x: 2, y: 0 })
    expect(adj).toContainEqual({ x: 0, y: 1 })
    expect(adj).toContainEqual({ x: 2, y: 1 })
    expect(adj).toContainEqual({ x: 0, y: 2 })
    expect(adj).toContainEqual({ x: 1, y: 2 })
    expect(adj).toContainEqual({ x: 2, y: 2 })
  })
})

describe('positionsInRange', () => {
  it('returns positions within movement range', () => {
    const positions = positionsInRange({ x: 5, y: 5 }, 10) // 2 squares
    // Should include all positions within Chebyshev distance 2
    expect(positions).toContainEqual({ x: 5, y: 5 })
    expect(positions).toContainEqual({ x: 6, y: 5 })
    expect(positions).toContainEqual({ x: 7, y: 5 })
    expect(positions).toContainEqual({ x: 7, y: 7 })
  })

  it('does not include positions outside range', () => {
    const positions = positionsInRange({ x: 5, y: 5 }, 10)
    expect(positions).not.toContainEqual({ x: 8, y: 5 }) // 3 squares = 15ft
  })

  it('returns only origin for 0 range', () => {
    const positions = positionsInRange({ x: 5, y: 5 }, 0)
    expect(positions).toEqual([{ x: 5, y: 5 }])
  })
})

describe('positionEquals', () => {
  it('returns true for same coordinates', () => {
    expect(positionEquals({ x: 3, y: 5 }, { x: 3, y: 5 })).toBe(true)
  })

  it('returns false for different coordinates', () => {
    expect(positionEquals({ x: 3, y: 5 }, { x: 3, y: 6 })).toBe(false)
  })
})
