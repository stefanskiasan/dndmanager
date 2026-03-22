import type { Scenario, LightingLevel } from '../types.js'
import type { WildernessConfig, WildernessTemplate, GeneratedRoom, GeneratedCorridor } from './types.js'
import { createRng, type Rng } from './rng.js'
import { generateCorridors } from './corridor-generator.js'
import { populateEncounters } from './encounter-populator.js'
import { scenario, map, room, encounter } from '../builders.js'

export interface WildernessResult {
  rooms: GeneratedRoom[]
  corridors: GeneratedCorridor[]
  mapWidth: number
  mapHeight: number
  config: WildernessConfig
  toScenario(): Scenario
}

interface TemplateConfig {
  tiles: string
  lighting: LightingLevel[]
  features: string[][]
  poiNames: string[]
}

const TEMPLATES: Record<WildernessTemplate, TemplateConfig> = {
  forest: {
    tiles: 'forest-floor',
    lighting: ['bright', 'bright', 'dim'],
    features: [['ancient-tree', 'stream'], ['clearing', 'mushroom-ring'], ['fallen-log', 'berry-bush']],
    poiNames: ['Clearing', 'Stream Crossing', 'Ancient Oak', 'Hidden Grove', 'Wolf Den', 'Fairy Circle'],
  },
  cave: {
    tiles: 'cave-stone',
    lighting: ['dim', 'darkness', 'darkness'],
    features: [['stalactites', 'pool'], ['narrow-passage', 'crystals'], ['underground-river', 'fungi']],
    poiNames: ['Entrance', 'Crystal Chamber', 'Underground Lake', 'Narrow Squeeze', 'Bat Colony', 'Deep Pit'],
  },
  ruin: {
    tiles: 'crumbled-stone',
    lighting: ['bright', 'dim', 'dim'],
    features: [['broken-columns', 'overgrown-altar'], ['collapsed-wall', 'statue'], ['mosaic-floor', 'fountain']],
    poiNames: ['Gate', 'Courtyard', 'Collapsed Tower', 'Throne Hall', 'Library Ruins', 'Crypt Entrance'],
  },
  swamp: {
    tiles: 'mud-water',
    lighting: ['dim', 'dim', 'darkness'],
    features: [['bog', 'dead-tree'], ['hut-stilts', 'will-o-wisp'], ['quicksand', 'lily-pads']],
    poiNames: ['Marsh Edge', 'Sunken Bridge', 'Witch Hut', 'Deep Bog', 'Ancient Bones', 'Foggy Hollow'],
  },
  mountain: {
    tiles: 'rocky-terrain',
    lighting: ['bright', 'bright', 'dim'],
    features: [['cliff-edge', 'eagle-nest'], ['narrow-ledge', 'cave-mouth'], ['rock-slide', 'overlook']],
    poiNames: ['Trail Head', 'Mountain Pass', 'Eagle Peak', 'Rock Slide', 'Hidden Cave', 'Summit'],
  },
  desert: {
    tiles: 'sand-stone',
    lighting: ['bright', 'bright', 'bright'],
    features: [['oasis', 'sand-dune'], ['ancient-pillar', 'scorpion-nest'], ['buried-ruin', 'mirage']],
    poiNames: ['Oasis', 'Sand Dune Ridge', 'Buried Temple', 'Scorpion Pit', 'Nomad Camp', 'Stone Circle'],
  },
}

export function generateWilderness(config: WildernessConfig): WildernessResult {
  const rng = createRng(config.seed)
  const template = TEMPLATES[config.template]
  const poiCount = config.pointsOfInterest ?? 3
  const partySize = config.partySize ?? 4
  const difficulty = config.difficulty ?? 'moderate'

  const mapWidth = config.mapWidth ?? 30
  const mapHeight = config.mapHeight ?? 25

  // Place POIs using Poisson-like distribution
  const rooms: GeneratedRoom[] = []
  const minDist = Math.min(mapWidth, mapHeight) / (poiCount + 1)

  for (let i = 0; i < poiCount; i++) {
    let placed = false
    for (let attempt = 0; attempt < 50; attempt++) {
      const x = rng.intRange(1, mapWidth - 8)
      const y = rng.intRange(1, mapHeight - 8)
      const w = rng.intRange(4, 7)
      const h = rng.intRange(4, 7)

      // Check minimum distance from existing rooms
      const tooClose = rooms.some((r) => {
        const dx = (r.x + r.width / 2) - (x + w / 2)
        const dy = (r.y + r.height / 2) - (y + h / 2)
        return Math.sqrt(dx * dx + dy * dy) < minDist
      })

      if (!tooClose) {
        const name = i < template.poiNames.length ? template.poiNames[i] : `POI-${i}`
        rooms.push({
          id: `poi-${i}`,
          x, y,
          width: w,
          height: h,
          lighting: rng.pick(template.lighting),
          isEntrance: i === 0,
        })
        placed = true
        break
      }
    }

    // Fallback: place anyway if we could not find a good spot
    if (!placed) {
      const x = rng.intRange(1, mapWidth - 6)
      const y = rng.intRange(1, mapHeight - 6)
      rooms.push({
        id: `poi-${i}`,
        x, y,
        width: 5, height: 5,
        lighting: rng.pick(template.lighting),
        isEntrance: i === 0,
      })
    }
  }

  if (rooms.length >= 3) {
    rooms[rooms.length - 1].isBoss = true
  }

  const corridors = generateCorridors(rooms, createRng(config.seed + 1))

  return {
    rooms,
    corridors,
    mapWidth,
    mapHeight,
    config,
    toScenario(): Scenario {
      const encounters = populateEncounters(rooms, config.level, partySize, difficulty, createRng(config.seed + 2))

      return scenario({
        name: `Generated ${config.template} wilderness (seed: ${config.seed})`,
        level: { min: config.level, max: config.level + 1 },
        description: `Procedurally generated ${config.template} wilderness with ${rooms.length} points of interest for level ${config.level} party.`,
        maps: [
          map('main', {
            tiles: template.tiles,
            size: [mapWidth, mapHeight],
            rooms: rooms.map((r, i) => room(r.id, {
              position: [r.x, r.y],
              size: [r.width, r.height],
              lighting: r.lighting,
              terrain: [],
              features: template.features[i % template.features.length],
            })),
            connections: corridors.map((c) => ({
              from: c.from,
              to: c.to,
              type: c.type,
            })),
          }),
        ],
        npcs: [],
        encounters: encounters.map((e) => encounter(e.id, {
          room: e.room,
          trigger: e.trigger,
          monsters: e.monsters,
          difficulty: e.difficulty,
          tactics: e.tactics,
          phases: e.phases,
        })),
        triggers: [],
        loot: [],
      })
    },
  }
}
