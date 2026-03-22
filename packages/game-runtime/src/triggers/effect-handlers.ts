import type { TriggerEffect } from '@dndmanager/scene-framework'
import type { GameState, GameEvent, Token } from '../types.js'
import type { TriggerEngineState, EffectResult } from './types.js'
import { createEvent } from '../events.js'

type Handler = (effect: TriggerEffect, state: GameState, engineState: TriggerEngineState) => EffectResult

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function unchanged(state: GameState, engineState: TriggerEngineState): EffectResult {
  return { state, engineState, events: [] }
}

// ─── Spawn ───────────────────────────────────
function handleSpawn(effect: TriggerEffect, state: GameState, engineState: TriggerEngineState): EffectResult {
  const monsters = (effect.monsters as Array<{ type: string; count?: number }>) ?? []
  const positions = (effect.positions as Array<[number, number]>) ?? []
  const newTokens: Token[] = []
  let posIdx = 0

  for (const m of monsters) {
    const count = m.count ?? 1
    for (let i = 0; i < count; i++) {
      const pos = positions[posIdx] ?? [0, 0]
      posIdx++
      newTokens.push({
        id: generateId(),
        name: m.type.replace('pf2e:', ''),
        type: 'monster',
        ownerId: 'gm',
        position: { x: pos[0], y: pos[1] },
        speed: 25,
        conditions: [],
        hp: { current: 1, max: 1, temp: 0 },
        ac: 10,
        visible: true,
      })
    }
  }

  return {
    state: { ...state, tokens: [...state.tokens, ...newTokens] },
    engineState,
    events: [createEvent('spawn_executed', { room: effect.room, count: newTokens.length, monsters: monsters.map((m) => m.type) })],
  }
}

// ─── Lighting ────────────────────────────────
function handleLighting(effect: TriggerEffect, state: GameState, engineState: TriggerEngineState): EffectResult {
  return {
    state,
    engineState,
    events: [createEvent('lighting_changed', { room: effect.room, to: effect.to })],
  }
}

// ─── Narrative ───────────────────────────────
function handleNarrative(effect: TriggerEffect, state: GameState, engineState: TriggerEngineState): EffectResult {
  return {
    state,
    engineState,
    events: [createEvent('narrative_displayed', { text: effect.text })],
  }
}

// ─── Map Change ──────────────────────────────
function handleMapChange(effect: TriggerEffect, state: GameState, engineState: TriggerEngineState): EffectResult {
  return {
    state,
    engineState,
    events: [createEvent('map_changed', { mapId: effect.mapId })],
  }
}

// ─── Trigger Chain ───────────────────────────
function handleTriggerChain(effect: TriggerEffect, state: GameState, engineState: TriggerEngineState): EffectResult {
  const targetId = effect.target as string
  const target = engineState.triggers.find((t) => t.id === targetId)
  if (!target) return unchanged(state, engineState)

  return {
    state,
    engineState,
    events: [createEvent('trigger_fired', { triggerId: targetId, chainedFrom: true })],
  }
}

// ─── Registry ────────────────────────────────
export const effectHandlers: Record<string, Handler> = {
  spawn: handleSpawn,
  lighting: handleLighting,
  narrative: handleNarrative,
  map_change: handleMapChange,
  trigger: handleTriggerChain,
}

export function handleEffect(
  effect: TriggerEffect,
  state: GameState,
  engineState: TriggerEngineState,
): EffectResult {
  const handler = effectHandlers[effect.type]
  if (!handler) return unchanged(state, engineState)
  return handler(effect, state, engineState)
}
