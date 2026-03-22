import { describe, it, expect } from 'vitest'
import { generateDungeon } from '../dungeon-generator.js'
import type { DungeonConfig } from '../types.js'

describe('generateDungeon', () => {
  const baseConfig: DungeonConfig = { seed: 42, rooms: 5, level: 3 }

  it('generates the requested number of rooms', () => {
    const result = generateDungeon(baseConfig)
    expect(result.rooms.length).toBeGreaterThanOrEqual(baseConfig.rooms)
  })

  it('is deterministic (same seed = same layout)', () => {
    const a = generateDungeon({ seed: 42, rooms: 5, level: 3 })
    const b = generateDungeon({ seed: 42, rooms: 5, level: 3 })
    expect(a.rooms.map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })))
      .toEqual(b.rooms.map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })))
  })

  it('different seeds produce different layouts', () => {
    const a = generateDungeon({ seed: 42, rooms: 5, level: 3 })
    const b = generateDungeon({ seed: 99, rooms: 5, level: 3 })
    const posA = a.rooms.map((r) => `${r.x},${r.y}`).join('|')
    const posB = b.rooms.map((r) => `${r.x},${r.y}`).join('|')
    expect(posA).not.toEqual(posB)
  })

  it('rooms do not overlap', () => {
    const result = generateDungeon({ seed: 7, rooms: 8, level: 5 })
    for (let i = 0; i < result.rooms.length; i++) {
      for (let j = i + 1; j < result.rooms.length; j++) {
        const a = result.rooms[i]
        const b = result.rooms[j]
        const overlap = !(a.x + a.width <= b.x || b.x + b.width <= a.x ||
                          a.y + a.height <= b.y || b.y + b.height <= a.y)
        expect(overlap, `Rooms ${a.id} and ${b.id} overlap`).toBe(false)
      }
    }
  })

  it('marks exactly one room as entrance', () => {
    const result = generateDungeon(baseConfig)
    const entrances = result.rooms.filter((r) => r.isEntrance)
    expect(entrances).toHaveLength(1)
  })

  it('marks a boss room when rooms >= 4', () => {
    const result = generateDungeon({ seed: 42, rooms: 5, level: 3 })
    const bossRooms = result.rooms.filter((r) => r.isBoss)
    expect(bossRooms).toHaveLength(1)
  })

  it('respects minRoomSize and maxRoomSize', () => {
    const result = generateDungeon({ seed: 42, rooms: 5, level: 3, minRoomSize: 4, maxRoomSize: 8 })
    for (const room of result.rooms) {
      expect(room.width).toBeGreaterThanOrEqual(4)
      expect(room.width).toBeLessThanOrEqual(8)
      expect(room.height).toBeGreaterThanOrEqual(4)
      expect(room.height).toBeLessThanOrEqual(8)
    }
  })

  it('returns a valid Scenario through toScenario()', () => {
    const result = generateDungeon(baseConfig)
    const scenario = result.toScenario()
    expect(scenario.name).toBeTruthy()
    expect(scenario.maps).toHaveLength(1)
    expect(scenario.maps[0].rooms.length).toBeGreaterThanOrEqual(baseConfig.rooms)
  })
})
