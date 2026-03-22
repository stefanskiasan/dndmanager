import type { LightingLevel, EncounterDifficulty, ConnectionDef } from '../types.js'

export interface DungeonConfig {
  seed: number
  rooms: number                     // target room count
  level: number                     // party level (for encounter budgets)
  partySize?: number                // default: 4
  mapWidth?: number                 // default: auto-calculated
  mapHeight?: number                // default: auto-calculated
  minRoomSize?: number              // in grid squares, default: 4
  maxRoomSize?: number              // default: 10
  theme?: DungeonTheme
  difficulty?: EncounterDifficulty  // default: 'moderate'
  bossRoom?: boolean                // default: true for rooms >= 4
}

export type DungeonTheme = 'stone' | 'cave' | 'crypt' | 'sewer' | 'temple' | 'mine'

export interface WildernessConfig {
  seed: number
  template: WildernessTemplate
  level: number
  partySize?: number
  mapWidth?: number
  mapHeight?: number
  pointsOfInterest?: number         // default: 3
  difficulty?: EncounterDifficulty
}

export type WildernessTemplate = 'forest' | 'cave' | 'ruin' | 'swamp' | 'mountain' | 'desert'

// ─── BSP Tree ────────────────────────────────
export interface BspNode {
  x: number
  y: number
  width: number
  height: number
  left?: BspNode
  right?: BspNode
  roomX?: number
  roomY?: number
  roomW?: number
  roomH?: number
}

export interface GeneratedRoom {
  id: string
  x: number
  y: number
  width: number
  height: number
  lighting: LightingLevel
  isEntrance?: boolean
  isBoss?: boolean
}

export interface GeneratedCorridor {
  from: string
  to: string
  type: ConnectionDef['type']
  waypoints: Array<[number, number]>
}
