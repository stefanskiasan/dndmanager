import type {
  Scenario,
  MapDef,
  RoomDef,
  NpcDef,
  EncounterDef,
  TriggerDef,
  LootDef,
  LightingLevel,
  TerrainDef,
  ConnectionDef,
  MonsterPlacement,
  EncounterDifficulty,
  EncounterTrigger,
  EncounterPhase,
  TriggerCondition,
  TriggerEffect,
  LootMode,
} from './types.js'

// ─── Room ─────────────────────────────────────
interface RoomParams {
  position: [number, number]
  size: [number, number]
  lighting: LightingLevel
  terrain: TerrainDef[]
  features?: string[]
}

export function room(id: string, params: RoomParams): RoomDef {
  return { id, ...params }
}

// ─── Map ──────────────────────────────────────
interface MapParams {
  tiles: string
  size: [number, number]
  rooms: RoomDef[]
  connections: ConnectionDef[]
}

export function map(id: string, params: MapParams): MapDef {
  return { id, ...params }
}

// ─── NPC ──────────────────────────────────────
interface NpcParams {
  monster?: string
  personality: string
  knowledge: string[]
  dialogue_style: string
}

export function npc(id: string, params: NpcParams): NpcDef {
  return { id, ...params }
}

// ─── Encounter ────────────────────────────────
interface EncounterParams {
  room: string
  trigger: EncounterTrigger
  monsters: MonsterPlacement[]
  difficulty: EncounterDifficulty
  tactics?: string
  phases?: EncounterPhase[]
}

export function encounter(id: string, params: EncounterParams): EncounterDef {
  return { id, ...params }
}

// ─── Trigger ──────────────────────────────────
interface TriggerParams {
  when: TriggerCondition
  effects: TriggerEffect[]
}

export function trigger(id: string, params: TriggerParams): TriggerDef {
  return { id, ...params }
}

// ─── Loot ─────────────────────────────────────
interface LootParams {
  encounter?: string
  room?: string
  mode: LootMode
  guaranteed?: string[]
  context?: string
}

export function loot(id: string, params: LootParams): LootDef {
  return { id, ...params }
}

// ─── Scenario ─────────────────────────────────
interface ScenarioParams {
  name: string
  level: { min: number; max: number }
  description: string
  maps: MapDef[]
  npcs: NpcDef[]
  encounters: EncounterDef[]
  triggers: TriggerDef[]
  loot: LootDef[]
}

export function scenario(params: ScenarioParams): Scenario {
  return { ...params }
}
