import type { TriggerDef, TriggerEffect } from '@dndmanager/scene-framework'
import type { GameState, GameEvent } from '../types.js'
import type { TriggerEngineState, RoomEventLink } from './types.js'
import { handleEffect } from './effect-handlers.js'
import { createEvent } from '../events.js'

/**
 * Analyze trigger definitions and extract cross-room event links.
 * A link exists when a trigger's when.room_entered points to room A
 * but an effect targets room B (via effect.room field).
 */
export function createRoomEventLinks(defs: TriggerDef[]): RoomEventLink[] {
  const links: RoomEventLink[] = []

  for (const def of defs) {
    const sourceRoom = def.when.room_entered
    if (!sourceRoom) continue

    for (const effect of def.effects) {
      const targetRoom = effect.room as string | undefined
      if (targetRoom && targetRoom !== sourceRoom) {
        links.push({
          id: `${def.id}-to-${targetRoom}`,
          sourceRoom,
          sourceTriggerId: def.id,
          targetRoom,
          targetEffects: [effect],
        })
      }
    }
  }

  return links
}

export interface RoomEventResult {
  state: GameState
  engineState: TriggerEngineState
  events: GameEvent[]
}

/**
 * When a trigger fires in a source room, propagate effects to linked target rooms.
 */
export function propagateRoomEvent(
  triggerId: string,
  sourceRoom: string,
  state: GameState,
  engineState: TriggerEngineState,
): RoomEventResult {
  const events: GameEvent[] = []
  let currentState = state
  let currentEngineState = engineState

  const matchingLinks = engineState.roomEventLinks.filter(
    (link) => link.sourceTriggerId === triggerId && link.sourceRoom === sourceRoom
  )

  for (const link of matchingLinks) {
    events.push(createEvent('room_event_propagated', {
      sourceRoom: link.sourceRoom,
      targetRoom: link.targetRoom,
      triggerId,
    }))

    for (const effect of link.targetEffects) {
      const result = handleEffect(effect, currentState, currentEngineState)
      currentState = result.state
      currentEngineState = result.engineState
      events.push(...result.events)
    }
  }

  return { state: currentState, engineState: currentEngineState, events }
}
