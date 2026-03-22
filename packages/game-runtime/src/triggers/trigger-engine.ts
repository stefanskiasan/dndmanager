import type { TriggerDef } from '@dndmanager/scene-framework'
import type { GameState, GameEvent } from '../types.js'
import type { TriggerEngineState, TriggerState, EffectResult } from './types.js'
import { evaluateCondition } from './condition-evaluator.js'
import { handleEffect } from './effect-handlers.js'
import { createEvent } from '../events.js'

export interface TriggerEngineResult {
  state: GameState
  events: GameEvent[]
}

export interface TriggerEngine {
  getState(): TriggerEngineState
  processEvent(event: GameEvent, gameState: GameState): TriggerEngineResult
  disableTrigger(id: string): void
  rearmTrigger(id: string): void
}

export function createTriggerEngine(defs: TriggerDef[], options?: { maxChainDepth?: number }): TriggerEngine {
  const maxChainDepth = options?.maxChainDepth ?? 10

  let engineState: TriggerEngineState = {
    triggers: defs.map((def): TriggerState => ({
      id: def.id,
      def,
      status: 'armed',
      fireCount: 0,
      maxFires: 1,
    })),
    bossPhases: [],
    roomEventLinks: [],
  }

  function processEvent(event: GameEvent, gameState: GameState): TriggerEngineResult {
    const allEvents: GameEvent[] = []
    let currentState = gameState
    const eventsToProcess: GameEvent[] = [event]
    let depth = 0

    while (eventsToProcess.length > 0 && depth < maxChainDepth) {
      const currentEvent = eventsToProcess.shift()!
      depth++

      for (const triggerState of engineState.triggers) {
        if (triggerState.status !== 'armed') continue

        if (!evaluateCondition(triggerState.def.when, currentEvent, currentState, engineState)) continue

        // Fire trigger
        triggerState.fireCount++
        if (triggerState.maxFires > 0 && triggerState.fireCount >= triggerState.maxFires) {
          triggerState.status = 'fired'
        }
        triggerState.firedAt = Date.now()

        allEvents.push(createEvent('trigger_fired', { triggerId: triggerState.id }))

        // Execute effects
        for (const effect of triggerState.def.effects) {
          const result: EffectResult = handleEffect(effect, currentState, engineState)
          currentState = result.state
          engineState = result.engineState
          allEvents.push(...result.events)

          // Chain triggers: if the effect produced trigger_fired events, queue them
          for (const evt of result.events) {
            if (evt.type === 'trigger_fired' && evt.data.chainedFrom) {
              eventsToProcess.push(evt)
            }
          }
        }
      }
    }

    return { state: currentState, events: allEvents }
  }

  function disableTrigger(id: string): void {
    const t = engineState.triggers.find((t) => t.id === id)
    if (t) t.status = 'disabled'
  }

  function rearmTrigger(id: string): void {
    const t = engineState.triggers.find((t) => t.id === id)
    if (t) {
      t.status = 'armed'
      t.fireCount = 0
    }
  }

  return {
    getState: () => engineState,
    processEvent,
    disableTrigger,
    rearmTrigger,
  }
}
