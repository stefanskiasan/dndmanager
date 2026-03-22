import type { Scenario, MapDef, RoomDef, ConnectionDef, LightingLevel } from '../types.js'
import type { DungeonConfig, BspNode, GeneratedRoom, GeneratedCorridor, DungeonTheme } from './types.js'
import { createRng, type Rng } from './rng.js'
import { generateCorridors } from './corridor-generator.js'
import { scenario, map, room } from '../builders.js'

export interface DungeonResult {
  rooms: GeneratedRoom[]
  corridors: GeneratedCorridor[]
  mapWidth: number
  mapHeight: number
  config: DungeonConfig
  toScenario(): Scenario
}

const THEME_TILES: Record<DungeonTheme, string> = {
  stone: 'stone-floor', cave: 'cave-stone', crypt: 'crypt-tiles',
  sewer: 'sewer-brick', temple: 'marble-tiles', mine: 'dirt-stone',
}

const LIGHTING_OPTIONS: LightingLevel[] = ['bright', 'dim', 'dim', 'darkness']

export function generateDungeon(config: DungeonConfig): DungeonResult {
  const rng = createRng(config.seed)
  const minSize = config.minRoomSize ?? 4
  const maxSize = config.maxRoomSize ?? 10
  const targetRooms = config.rooms
  const theme = config.theme ?? 'stone'

  // Calculate map dimensions based on room count
  const avgRoom = (minSize + maxSize) / 2
  const gridFactor = Math.ceil(Math.sqrt(targetRooms)) + 1
  const mapWidth = config.mapWidth ?? Math.ceil(gridFactor * avgRoom * 1.8)
  const mapHeight = config.mapHeight ?? Math.ceil(gridFactor * avgRoom * 1.5)

  // BSP subdivision
  const root: BspNode = { x: 0, y: 0, width: mapWidth, height: mapHeight }
  subdivide(root, targetRooms, minSize + 2, rng)

  // Collect leaf nodes and place rooms
  const leaves: BspNode[] = []
  collectLeaves(root, leaves)

  const rooms: GeneratedRoom[] = leaves.map((leaf, i) => {
    const rw = rng.intRange(minSize, Math.min(maxSize, leaf.width - 2))
    const rh = rng.intRange(minSize, Math.min(maxSize, leaf.height - 2))
    const rx = leaf.x + rng.intRange(1, Math.max(1, leaf.width - rw - 1))
    const ry = leaf.y + rng.intRange(1, Math.max(1, leaf.height - rh - 1))

    return {
      id: `room-${i}`,
      x: rx,
      y: ry,
      width: rw,
      height: rh,
      lighting: rng.pick(LIGHTING_OPTIONS),
    }
  })

  // Designate entrance and boss room
  if (rooms.length > 0) {
    rooms[0].isEntrance = true
    rooms[0].lighting = 'bright'
  }
  const hasBoss = config.bossRoom ?? rooms.length >= 4
  if (hasBoss && rooms.length >= 2) {
    // Boss is the room farthest from entrance
    let maxDist = 0
    let bossIdx = rooms.length - 1
    const entrance = rooms[0]
    for (let i = 1; i < rooms.length; i++) {
      const dx = rooms[i].x - entrance.x
      const dy = rooms[i].y - entrance.y
      const dist = dx * dx + dy * dy
      if (dist > maxDist) {
        maxDist = dist
        bossIdx = i
      }
    }
    rooms[bossIdx].isBoss = true
  }

  // Generate corridors
  const corridors = generateCorridors(rooms, createRng(config.seed + 1))

  return {
    rooms,
    corridors,
    mapWidth,
    mapHeight,
    config,
    toScenario(): Scenario {
      const roomDefs: RoomDef[] = rooms.map((r) => {
        const features: string[] = [
          ...(r.isEntrance ? ['entrance'] : []),
          ...(r.isBoss ? ['boss-area'] : []),
        ]
        return room(r.id, {
          position: [r.x, r.y],
          size: [r.width, r.height],
          lighting: r.lighting,
          terrain: [],
          features: features.length > 0 ? features : undefined,
        })
      })

      const connections: ConnectionDef[] = corridors.map((c) => ({
        from: c.from,
        to: c.to,
        type: c.type,
      }))

      return scenario({
        name: `Generated ${theme} dungeon (seed: ${config.seed})`,
        level: { min: config.level, max: config.level + 1 },
        description: `Procedurally generated ${theme} dungeon with ${rooms.length} rooms for level ${config.level} party.`,
        maps: [
          map('main', {
            tiles: THEME_TILES[theme],
            size: [mapWidth, mapHeight],
            rooms: roomDefs,
            connections,
          }),
        ],
        npcs: [],
        encounters: [],
        triggers: [],
        loot: [],
      })
    },
  }
}

// ─── BSP Helpers ─────────────────────────────

function subdivide(node: BspNode, targetLeaves: number, minLeafSize: number, rng: Rng): void {
  const leaves: BspNode[] = []
  collectLeaves(node, leaves)
  if (leaves.length >= targetLeaves) return

  // Find the largest leaf to split
  const sortedLeaves = [...leaves].sort((a, b) => (b.width * b.height) - (a.width * a.height))

  for (const leaf of sortedLeaves) {
    if (leaves.length >= targetLeaves) break

    const canSplitH = leaf.width >= minLeafSize * 2
    const canSplitV = leaf.height >= minLeafSize * 2

    if (!canSplitH && !canSplitV) continue

    const splitHorizontally = canSplitH && canSplitV
      ? rng.next() < 0.5
      : canSplitH

    if (splitHorizontally) {
      const split = rng.intRange(minLeafSize, leaf.width - minLeafSize)
      leaf.left = { x: leaf.x, y: leaf.y, width: split, height: leaf.height }
      leaf.right = { x: leaf.x + split, y: leaf.y, width: leaf.width - split, height: leaf.height }
    } else {
      const split = rng.intRange(minLeafSize, leaf.height - minLeafSize)
      leaf.left = { x: leaf.x, y: leaf.y, width: leaf.width, height: split }
      leaf.right = { x: leaf.x, y: leaf.y + split, width: leaf.width, height: leaf.height - split }
    }

    // Recurse
    const newLeaves: BspNode[] = []
    collectLeaves(node, newLeaves)
    if (newLeaves.length >= targetLeaves) return
    subdivide(node, targetLeaves, minLeafSize, rng)
    return
  }
}

function collectLeaves(node: BspNode, leaves: BspNode[]): void {
  if (!node.left && !node.right) {
    leaves.push(node)
    return
  }
  if (node.left) collectLeaves(node.left, leaves)
  if (node.right) collectLeaves(node.right, leaves)
}
