import type { ActiveCondition, DegreeOfSuccess } from '@dndmanager/pf2e-engine'

// ─── Game Mode ────────────────────────────────
export type GameMode = 'exploration' | 'encounter' | 'downtime'

// ─── Tokens ───────────────────────────────────
export type TokenType = 'player' | 'monster' | 'npc'

export interface Token {
  id: string
  name: string
  type: TokenType
  ownerId: string         // user_id for players, gm for monsters/npcs
  position: GridPosition
  speed: number           // in feet
  conditions: ActiveCondition[]
  hp: { current: number; max: number; temp: number }
  ac: number
  visible: boolean        // GM can hide tokens
}

export interface GridPosition {
  x: number
  y: number
}

// ─── Initiative ───────────────────────────────
export interface InitiativeEntry {
  tokenId: string
  roll: number
  modifier: number
  total: number
}

// ─── Turn Tracking ────────────────────────────
export interface TurnState {
  currentTokenId: string
  actionsRemaining: number   // PF2e: 3 per turn
  reactionAvailable: boolean
  actionsUsed: ActionRecord[]
}

export interface ActionRecord {
  type: string          // 'strike', 'move', 'step', 'cast', 'skill', etc.
  details: string
  result?: string
}

// ─── Game State ───────────────────────────────
export interface GameState {
  id: string
  sessionId: string
  mode: GameMode
  tokens: Token[]
  initiative: InitiativeEntry[]
  turnOrder: string[]          // token IDs in initiative order
  currentTurnIndex: number
  turn: TurnState | null       // null when not in encounter
  round: number
  actionLog: GameEvent[]
}

// ─── Events ───────────────────────────────────
export type GameEventType =
  | 'mode_change'
  | 'encounter_start'
  | 'encounter_end'
  | 'initiative_rolled'
  | 'turn_start'
  | 'turn_end'
  | 'action_performed'
  | 'token_moved'
  | 'token_added'
  | 'token_removed'
  | 'damage_dealt'
  | 'healing_applied'
  | 'condition_added'
  | 'condition_removed'
  | 'round_start'

export interface GameEvent {
  type: GameEventType
  timestamp: number
  data: Record<string, unknown>
}
