import type { GeneratedRoom, GeneratedCorridor } from './types.js'
import type { Rng } from './rng.js'

/**
 * Generate corridors connecting all rooms using a minimum spanning tree
 * approach (Prim's algorithm on room center distances), with random
 * extra connections for loops.
 */
export function generateCorridors(rooms: GeneratedRoom[], rng: Rng): GeneratedCorridor[] {
  if (rooms.length <= 1) return []

  const connectionTypes = ['door', 'corridor', 'open'] as const

  // Room centers
  const centers = rooms.map((r) => ({
    id: r.id,
    cx: r.x + Math.floor(r.width / 2),
    cy: r.y + Math.floor(r.height / 2),
  }))

  // Build MST using Prim's algorithm
  const inTree = new Set<number>([0])
  const corridors: GeneratedCorridor[] = []

  while (inTree.size < rooms.length) {
    let bestDist = Infinity
    let bestFrom = 0
    let bestTo = 0

    for (const i of inTree) {
      for (let j = 0; j < rooms.length; j++) {
        if (inTree.has(j)) continue
        const dx = centers[i].cx - centers[j].cx
        const dy = centers[i].cy - centers[j].cy
        const dist = dx * dx + dy * dy
        if (dist < bestDist) {
          bestDist = dist
          bestFrom = i
          bestTo = j
        }
      }
    }

    inTree.add(bestTo)
    corridors.push({
      from: centers[bestFrom].id,
      to: centers[bestTo].id,
      type: rng.pick(connectionTypes),
      waypoints: [[centers[bestFrom].cx, centers[bestFrom].cy], [centers[bestTo].cx, centers[bestTo].cy]],
    })
  }

  // Add random extra connections (roughly 20% chance per possible pair)
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const exists = corridors.some(
        (c) => (c.from === centers[i].id && c.to === centers[j].id) ||
               (c.from === centers[j].id && c.to === centers[i].id)
      )
      if (!exists && rng.next() < 0.2) {
        corridors.push({
          from: centers[i].id,
          to: centers[j].id,
          type: rng.pick(connectionTypes),
          waypoints: [[centers[i].cx, centers[i].cy], [centers[j].cx, centers[j].cy]],
        })
      }
    }
  }

  return corridors
}
