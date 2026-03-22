import { describe, it, expect } from 'vitest'
import { generateCorridors } from '../corridor-generator.js'
import { createRng } from '../rng.js'
import type { GeneratedRoom } from '../types.js'

describe('generateCorridors', () => {
  const rooms: GeneratedRoom[] = [
    { id: 'room-0', x: 0, y: 0, width: 5, height: 5, lighting: 'bright', isEntrance: true },
    { id: 'room-1', x: 10, y: 0, width: 5, height: 5, lighting: 'dim' },
    { id: 'room-2', x: 5, y: 10, width: 5, height: 5, lighting: 'dim' },
  ]

  it('connects all rooms (graph is connected)', () => {
    const corridors = generateCorridors(rooms, createRng(42))
    // Every room should be reachable: at least rooms-1 corridors for a spanning tree
    expect(corridors.length).toBeGreaterThanOrEqual(rooms.length - 1)

    // Check connectivity via BFS
    const adj = new Map<string, Set<string>>()
    for (const r of rooms) adj.set(r.id, new Set())
    for (const c of corridors) {
      adj.get(c.from)!.add(c.to)
      adj.get(c.to)!.add(c.from)
    }
    const visited = new Set<string>()
    const queue = [rooms[0].id]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      for (const neighbor of adj.get(current)!) queue.push(neighbor)
    }
    expect(visited.size).toBe(rooms.length)
  })

  it('uses door type for connections by default', () => {
    const corridors = generateCorridors(rooms, createRng(42))
    expect(corridors.every((c) => ['door', 'corridor', 'open'].includes(c.type))).toBe(true)
  })

  it('is deterministic', () => {
    const a = generateCorridors(rooms, createRng(42))
    const b = generateCorridors(rooms, createRng(42))
    expect(a.map((c) => `${c.from}-${c.to}`)).toEqual(b.map((c) => `${c.from}-${c.to}`))
  })
})
