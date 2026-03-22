import type { GameState, TurnState, ActionRecord, GameEvent } from './types.js'

export function useAction(state: GameState, action: ActionRecord): GameState {
  if (state.mode !== 'encounter' || !state.turn) {
    throw new Error('Not in encounter mode')
  }
  if (state.turn.actionsRemaining <= 0) {
    throw new Error('No actions remaining')
  }

  const event: GameEvent = {
    type: 'action_performed',
    timestamp: Date.now(),
    data: { tokenId: state.turn.currentTokenId, action },
  }

  return {
    ...state,
    turn: {
      ...state.turn,
      actionsRemaining: state.turn.actionsRemaining - 1,
      actionsUsed: [...state.turn.actionsUsed, action],
    },
    actionLog: [...state.actionLog, event],
  }
}

export function useReaction(state: GameState, action: ActionRecord): GameState {
  if (state.mode !== 'encounter' || !state.turn) {
    throw new Error('Not in encounter mode')
  }
  if (!state.turn.reactionAvailable) {
    throw new Error('Reaction already used this round')
  }

  const event: GameEvent = {
    type: 'action_performed',
    timestamp: Date.now(),
    data: { tokenId: state.turn.currentTokenId, action, isReaction: true },
  }

  return {
    ...state,
    turn: {
      ...state.turn,
      reactionAvailable: false,
      actionsUsed: [...state.turn.actionsUsed, action],
    },
    actionLog: [...state.actionLog, event],
  }
}

export function endTurn(state: GameState): GameState {
  return nextTurn(state)
}

export function nextTurn(state: GameState): GameState {
  if (state.mode !== 'encounter' || !state.turn) {
    throw new Error('Not in encounter mode')
  }

  const events: GameEvent[] = [
    {
      type: 'turn_end',
      timestamp: Date.now(),
      data: { tokenId: state.turn.currentTokenId },
    },
  ]

  let nextIndex = state.currentTurnIndex + 1
  let round = state.round

  if (nextIndex >= state.turnOrder.length) {
    nextIndex = 0
    round += 1
    events.push({
      type: 'round_start',
      timestamp: Date.now(),
      data: { round },
    })
  }

  const nextTokenId = state.turnOrder[nextIndex]

  const newTurn: TurnState = {
    currentTokenId: nextTokenId,
    actionsRemaining: 3,
    reactionAvailable: true,
    actionsUsed: [],
  }

  events.push({
    type: 'turn_start',
    timestamp: Date.now(),
    data: { tokenId: nextTokenId },
  })

  return {
    ...state,
    currentTurnIndex: nextIndex,
    turn: newTurn,
    round,
    actionLog: [...state.actionLog, ...events],
  }
}

export function getCurrentToken(state: GameState): string | null {
  if (state.mode !== 'encounter' || !state.turn) return null
  return state.turn.currentTokenId
}
