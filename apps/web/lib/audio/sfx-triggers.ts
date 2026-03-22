import type { GameEventType } from '@dndmanager/game-runtime'
import { audioManager } from './audio-manager'

// ─── Event → SFX Mapping ────────────────────

/**
 * Maps game event types to SFX track IDs.
 * Some events need additional data inspection to pick the right SFX.
 */
const EVENT_SFX_MAP: Partial<Record<GameEventType, string>> = {
  encounter_start: 'sfx-encounter-start',
  encounter_end: 'sfx-encounter-end',
  damage_dealt: 'sfx-hit-normal', // overridden for crits below
  healing_applied: 'sfx-spell-heal',
  condition_added: 'sfx-spell-cast',
}

// ─── Trigger Functions ──────────────────────

/**
 * Play the appropriate SFX for a game event.
 * Call this from the game event subscription.
 */
export function triggerSfxForEvent(
  eventType: GameEventType,
  data: Record<string, unknown> = {}
): void {
  // Special cases with data inspection
  switch (eventType) {
    case 'damage_dealt': {
      if (data.critical === true) {
        audioManager.playSfx('sfx-hit-critical')
      } else {
        audioManager.playSfx('sfx-hit-normal')
      }
      return
    }

    case 'action_performed': {
      const actionType = data.actionType as string | undefined
      if (actionType === 'cast') {
        // Determine spell element if available
        const element = data.element as string | undefined
        if (element === 'fire') {
          audioManager.playSfx('sfx-spell-fire')
        } else if (element === 'ice' || element === 'cold') {
          audioManager.playSfx('sfx-spell-ice')
        } else {
          audioManager.playSfx('sfx-spell-cast')
        }
        return
      }
      // No SFX for other action types by default
      return
    }

    default:
      break
  }

  // Default mapping
  const sfxId = EVENT_SFX_MAP[eventType]
  if (sfxId) {
    audioManager.playSfx(sfxId)
  }
}

// ─── Direct SFX Triggers ────────────────────
// Convenience functions for UI-driven SFX not tied to game events.

export function playDiceRoll(): void {
  audioManager.playSfx('sfx-dice-roll')
}

export function playDoorOpen(): void {
  audioManager.playSfx('sfx-door-open')
}

export function playDoorClose(): void {
  audioManager.playSfx('sfx-door-close')
}

export function playChestOpen(): void {
  audioManager.playSfx('sfx-chest-open')
}

export function playCoinDrop(): void {
  audioManager.playSfx('sfx-coin-drop')
}

export function playLevelUp(): void {
  audioManager.playSfx('sfx-level-up')
}

export function playMiss(): void {
  audioManager.playSfx('sfx-miss')
}

export function playDeath(): void {
  audioManager.playSfx('sfx-death')
}
