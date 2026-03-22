import type { GameEvent, GameEventType } from './types.js'

export function createEvent(type: GameEventType, data: Record<string, unknown>): GameEvent {
  return {
    type,
    timestamp: Date.now(),
    data,
  }
}

export function filterEvents(events: GameEvent[], type: GameEventType): GameEvent[] {
  return events.filter((e) => e.type === type)
}

export function getEventsSince(events: GameEvent[], timestamp: number): GameEvent[] {
  return events.filter((e) => e.timestamp > timestamp)
}

export function formatEventAsText(event: GameEvent): string {
  switch (event.type) {
    case 'damage_dealt':
      return `${event.data.source} dealt ${event.data.damage} ${event.data.type ?? ''} damage to ${event.data.target}`

    case 'healing_applied':
      return `${event.data.source} healed ${event.data.target} for ${event.data.healing} HP`

    case 'turn_start':
      return `Turn started: ${event.data.tokenId}`

    case 'turn_end':
      return `Turn ended: ${event.data.tokenId}`

    case 'round_start':
      return `Round ${event.data.round} started`

    case 'mode_change':
      return `Mode changed: ${event.data.from} → ${event.data.to}`

    case 'encounter_start':
      return 'Encounter started'

    case 'encounter_end':
      return 'Encounter ended'

    case 'token_moved':
      return `${event.data.tokenId} moved to (${event.data.x}, ${event.data.y})`

    case 'condition_added':
      return `${event.data.tokenId} gained ${event.data.condition}`

    case 'condition_removed':
      return `${event.data.tokenId} lost ${event.data.condition}`

    default:
      return `${event.type}: ${JSON.stringify(event.data)}`
  }
}
