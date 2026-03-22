import type { GameState, GameMode, GameEvent } from './types.js'

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

const VALID_TRANSITIONS: Record<GameMode, GameMode[]> = {
  exploration: ['encounter', 'downtime'],
  encounter: ['exploration'],
  downtime: ['exploration'],
}

export function createGameState(sessionId: string): GameState {
  return {
    id: generateId(),
    sessionId,
    mode: 'exploration',
    tokens: [],
    initiative: [],
    turnOrder: [],
    currentTurnIndex: -1,
    turn: null,
    round: 0,
    actionLog: [],
  }
}

export function canTransition(from: GameMode, to: GameMode): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

export function transitionMode(state: GameState, to: GameMode): GameState {
  if (!canTransition(state.mode, to)) {
    throw new Error(`Invalid transition: ${state.mode} → ${to}`)
  }

  const event: GameEvent = {
    type: 'mode_change',
    timestamp: Date.now(),
    data: { from: state.mode, to },
  }

  const base = {
    ...state,
    mode: to,
    actionLog: [...state.actionLog, event],
  }

  // Reset encounter state when leaving encounter
  if (state.mode === 'encounter') {
    return {
      ...base,
      initiative: [],
      turnOrder: [],
      currentTurnIndex: -1,
      turn: null,
      round: 0,
    }
  }

  return base
}
