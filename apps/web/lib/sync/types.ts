export interface GameStateRow {
  id: string
  session_id: string
  mode: 'exploration' | 'encounter' | 'downtime'
  round: number
  current_turn_index: number
  current_token_id: string | null
  actions_remaining: number
  reaction_available: boolean
  created_at: string
  updated_at: string
}

export interface GameTokenRow {
  id: string
  game_state_id: string
  name: string
  token_type: 'player' | 'monster' | 'npc'
  owner_id: string | null
  position_x: number
  position_y: number
  speed: number
  hp_current: number
  hp_max: number
  hp_temp: number
  ac: number
  conditions: unknown[]
  visible: boolean
  created_at: string
  updated_at: string
}

export interface GameInitiativeRow {
  id: string
  game_state_id: string
  token_id: string
  roll: number
  modifier: number
  total: number
  sort_order: number
}

export interface GameActionLogRow {
  id: string
  game_state_id: string
  event_type: string
  data: Record<string, unknown>
  created_at: string
}
