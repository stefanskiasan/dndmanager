import type { GridPosition, Wall } from './types.js'

/**
 * Bresenham's line algorithm — returns all grid cells along a line.
 */
export function castRay(from: GridPosition, to: GridPosition): GridPosition[] {
  const cells: GridPosition[] = []
  let x0 = from.x, y0 = from.y
  const x1 = to.x, y1 = to.y
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  while (true) {
    cells.push({ x: x0, y: y0 })
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; x0 += sx }
    if (e2 < dx) { err += dx; y0 += sy }
  }

  return cells
}

/**
 * Check if a line segment (ray) intersects a wall segment.
 * Uses simple segment-segment intersection.
 */
function segmentsIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number
): boolean {
  const denom = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx)
  if (Math.abs(denom) < 0.0001) return false // parallel

  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom

  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99
}

/**
 * Check line of sight between two grid positions.
 * Returns false if any wall blocks the line.
 */
export function hasLineOfSight(
  from: GridPosition,
  to: GridPosition,
  walls: Wall[]
): boolean {
  if (from.x === to.x && from.y === to.y) return true

  // Cast from center of cells
  const fx = from.x + 0.5, fy = from.y + 0.5
  const tx = to.x + 0.5, ty = to.y + 0.5

  for (const wall of walls) {
    if (segmentsIntersect(
      fx, fy, tx, ty,
      wall.from.x, wall.from.y, wall.to.x, wall.to.y
    )) {
      return false
    }
  }

  return true
}
