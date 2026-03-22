// ─── Scenario ─────────────────────────────────
export interface Scenario {
  name: string
  level: { min: number; max: number }
  description: string
  maps: MapDef[]
  npcs: NpcDef[]
  encounters: EncounterDef[]
  triggers: TriggerDef[]
  loot: LootDef[]
}

// ─── Map ──────────────────────────────────────
export interface MapDef {
  id: string
  tiles: string
  size: [number, number]
  rooms: RoomDef[]
  connections: ConnectionDef[]
}

export interface RoomDef {
  id: string
  position: [number, number]
  size: [number, number]
  lighting: LightingLevel
  terrain: TerrainDef[]
  features?: string[]
}

export type LightingLevel = 'bright' | 'dim' | 'darkness' | 'magical-darkness'

export interface TerrainDef {
  type: 'normal' | 'difficult' | 'greater-difficult' | 'hazardous'
  area: [[number, number], [number, number]]
  reason?: string
}

export interface ConnectionDef {
  from: string
  to: string
  type: 'corridor' | 'door' | 'secret-door' | 'stairs' | 'open'
  length?: number
  trap?: string
}

// ─── NPC ──────────────────────────────────────
export interface NpcDef {
  id: string
  monster?: string          // pf2e: reference
  personality: string
  knowledge: string[]
  dialogue_style: string
}

// ─── Encounter ────────────────────────────────
export type EncounterDifficulty = 'trivial' | 'low' | 'moderate' | 'severe' | 'extreme'
export type EncounterTrigger = 'on_enter' | 'on_interact' | 'manual' | 'timed'
export type PositionStrategy = string  // "spread", "clustered", "flanking-<id>", or [x,y] as string

export interface MonsterPlacement {
  type: string
  count?: number
  position?: [number, number]
  positions?: PositionStrategy
}

export interface EncounterPhase {
  hp_threshold: number
  action: string
  description: string
}

export interface EncounterDef {
  id: string
  room: string
  trigger: EncounterTrigger
  monsters: MonsterPlacement[]
  difficulty: EncounterDifficulty
  tactics?: string
  phases?: EncounterPhase[]
}

// ─── Trigger ──────────────────────────────────
export interface TriggerCondition {
  encounter?: string
  phase?: string
  room_entered?: string
  item_used?: string
}

export type TriggerEffectType = 'spawn' | 'map_change' | 'lighting' | 'audio' | 'trigger' | 'narrative'

export interface TriggerEffect {
  type: TriggerEffectType
  [key: string]: unknown
}

export interface TriggerDef {
  id: string
  when: TriggerCondition
  effects: TriggerEffect[]
}

// ─── Loot ─────────────────────────────────────
export type LootMode = 'fixed' | 'random' | 'ai-generated'

export interface LootDef {
  id: string
  encounter?: string
  room?: string
  mode: LootMode
  guaranteed?: string[]
  context?: string
}

// ─── Validation ───────────────────────────────
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
