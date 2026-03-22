import type { GridPosition } from './types.js'

/**
 * PF2e grid distance using Chebyshev distance (diagonal = 1 square).
 * Each square = 5 feet.
 */
export function gridDistance(a: GridPosition, b: GridPosition): number {
  const dx = Math.abs(a.x - b.x)
  const dy = Math.abs(a.y - b.y)
  return Math.max(dx, dy) * 5
}

export function isAdjacent(a: GridPosition, b: GridPosition): boolean {
  if (a.x === b.x && a.y === b.y) return false
  return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1
}

export function getAdjacentPositions(pos: GridPosition): GridPosition[] {
  const positions: GridPosition[] = []
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue
      positions.push({ x: pos.x + dx, y: pos.y + dy })
    }
  }
  return positions
}

/**
 * All grid positions within a given range (in feet) from origin.
 */
export function positionsInRange(origin: GridPosition, rangeFeet: number): GridPosition[] {
  const rangeSquares = Math.floor(rangeFeet / 5)
  const positions: GridPosition[] = []

  for (let dx = -rangeSquares; dx <= rangeSquares; dx++) {
    for (let dy = -rangeSquares; dy <= rangeSquares; dy++) {
      const pos = { x: origin.x + dx, y: origin.y + dy }
      if (gridDistance(origin, pos) <= rangeFeet) {
        positions.push(pos)
      }
    }
  }

  return positions
}

export function positionEquals(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y
}
