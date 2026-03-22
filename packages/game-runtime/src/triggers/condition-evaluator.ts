import type { TriggerCondition } from '@dndmanager/scene-framework'
import type { GameState, GameEvent } from '../types.js'
import type { TriggerEngineState } from './types.js'

/**
 * Evaluates whether a trigger condition matches a given game event.
 * All specified fields must match (AND semantics).
 * An empty condition matches any event.
 */
export function evaluateCondition(
  condition: TriggerCondition,
  event: GameEvent,
  _state: GameState,
  _engineState: TriggerEngineState,
): boolean {
  const checks: boolean[] = []

  if (condition.encounter !== undefined) {
    checks.push(matchEncounter(condition.encounter, event))
  }

  if (condition.phase !== undefined) {
    checks.push(matchPhase(condition.phase, event))
  }

  if (condition.room_entered !== undefined) {
    checks.push(matchRoomEntered(condition.room_entered, event))
  }

  if (condition.item_used !== undefined) {
    checks.push(matchItemUsed(condition.item_used, event))
  }

  // Empty condition = always true
  if (checks.length === 0) return true

  return checks.every(Boolean)
}

function matchEncounter(encounterId: string, event: GameEvent): boolean {
  return (
    (event.type === 'encounter_start' || event.type === 'encounter_end' || event.type === 'boss_phase_entered') &&
    event.data.encounterId === encounterId
  )
}

function matchPhase(phase: string, event: GameEvent): boolean {
  return event.type === 'boss_phase_entered' && event.data.phase === phase
}

function matchRoomEntered(roomId: string, event: GameEvent): boolean {
  return event.type === 'token_moved' && event.data.roomId === roomId
}

function matchItemUsed(itemId: string, event: GameEvent): boolean {
  return event.type === 'action_performed' && event.data.type === 'use_item' && event.data.itemId === itemId
}
