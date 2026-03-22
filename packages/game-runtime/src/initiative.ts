import type { GameState, InitiativeEntry, TurnState, GameEvent } from './types.js'
import { transitionMode } from './state-machine.js'

export function rollInitiative(tokenId: string, modifier: number, roll: number): InitiativeEntry {
  return {
    tokenId,
    roll,
    modifier,
    total: roll + modifier,
  }
}

export function sortInitiative(entries: InitiativeEntry[]): InitiativeEntry[] {
  return [...entries].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return b.modifier - a.modifier // tiebreaker: higher modifier
  })
}

export function startEncounter(state: GameState, initiatives: InitiativeEntry[]): GameState {
  // Transition to encounter mode
  let next = transitionMode(state, 'encounter')

  const sorted = sortInitiative(initiatives)
  const turnOrder = sorted.map((e) => e.tokenId)
  const firstTokenId = turnOrder[0]

  const turn: TurnState = {
    currentTokenId: firstTokenId,
    actionsRemaining: 3,
    reactionAvailable: true,
    actionsUsed: [],
  }

  const events: GameEvent[] = [
    { type: 'encounter_start', timestamp: Date.now(), data: { initiatives: sorted } },
    { type: 'round_start', timestamp: Date.now(), data: { round: 1 } },
    { type: 'turn_start', timestamp: Date.now(), data: { tokenId: firstTokenId } },
  ]

  return {
    ...next,
    initiative: sorted,
    turnOrder,
    currentTurnIndex: 0,
    turn,
    round: 1,
    actionLog: [...next.actionLog, ...events],
  }
}
