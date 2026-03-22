import type { TriggerDef, TriggerCondition, TriggerEffect } from '@dndmanager/scene-framework'
import type { GameState, GameEvent } from '../types.js'

// ─── Trigger State ───────────────────────────
export type TriggerStatus = 'armed' | 'fired' | 'disabled'

export interface TriggerState {
  id: string
  def: TriggerDef
  status: TriggerStatus
  firedAt?: number            // timestamp when fired
  fireCount: number           // how many times this trigger has fired
  maxFires: number            // -1 = unlimited, 1 = one-shot (default)
}

export interface TriggerEngineState {
  triggers: TriggerState[]
  bossPhases: BossPhaseState[]
  roomEventLinks: RoomEventLink[]
}

// ─── Boss Phases ─────────────────────────────
export interface BossPhaseState {
  encounterId: string
  tokenId: string
  phases: BossPhaseEntry[]
  currentPhaseIndex: number    // -1 = no phase active yet
}

export interface BossPhaseEntry {
  id: string
  hpThreshold: number          // 0.0–1.0 ratio
  action: string
  description: string
  triggered: boolean
}

// ─── Multi-Room Events ───────────────────────
export interface RoomEventLink {
  id: string
  sourceRoom: string
  sourceTriggerId: string
  targetRoom: string
  targetEffects: TriggerEffect[]
  delay?: number               // milliseconds delay before target effects fire
}

// ─── Effect Handler ──────────────────────────
export type EffectHandler = (
  effect: TriggerEffect,
  state: GameState,
  engineState: TriggerEngineState,
) => EffectResult

export interface EffectResult {
  state: GameState
  engineState: TriggerEngineState
  events: GameEvent[]
}

// ─── Condition Evaluator ─────────────────────
export type ConditionEvaluator = (
  condition: TriggerCondition,
  event: GameEvent,
  state: GameState,
  engineState: TriggerEngineState,
) => boolean
