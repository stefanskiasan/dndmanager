import type { DegreeOfSuccess } from './types.js'

const SECRET_ACTIONS = new Set([
  'recall_knowledge',
  'sense_motive',
  'perception_trap',
  'perception_secret_door',
])

export function isSecretRoll(actionId: string): boolean {
  return SECRET_ACTIONS.has(actionId)
}

interface SecretRollParams {
  actionId: string
  naturalRoll: number
  modifier: number
  dc: number
  degree: DegreeOfSuccess
  effects: string[]
}

interface SecretRollResult {
  gmView: {
    actionId: string
    naturalRoll: number
    modifier: number
    total: number
    dc: number
    degree: DegreeOfSuccess
    effects: string[]
  }
  playerView: {
    actionId: string
    message: string
  }
}

const PLAYER_MESSAGES: Record<string, string> = {
  recall_knowledge: 'Du versuchst dich zu erinnern...',
  sense_motive: 'Du beobachtest dein Gegenueber genau...',
  perception_trap: 'Du untersuchst die Umgebung...',
  perception_secret_door: 'Du suchst nach verborgenen Durchgaengen...',
}

export function createSecretRollResult(params: SecretRollParams): SecretRollResult {
  return {
    gmView: {
      actionId: params.actionId,
      naturalRoll: params.naturalRoll,
      modifier: params.modifier,
      total: params.naturalRoll + params.modifier,
      dc: params.dc,
      degree: params.degree,
      effects: params.effects,
    },
    playerView: createPlayerView(params.actionId),
  }
}

export function createPlayerView(actionId: string): { actionId: string; message: string } {
  return {
    actionId,
    message: PLAYER_MESSAGES[actionId] ?? 'Du fuehrst eine Aktion aus...',
  }
}
