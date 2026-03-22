import type { DegreeOfSuccess, ActionCost } from './types.js'
import { degreeOfSuccess } from './checks.js'

export interface SkillActionDef {
  id: string
  name: string
  skill: string
  actions: ActionCost
  traits: string[]
  secret: boolean
  successEffects: Record<DegreeOfSuccess, string[]>
}

export interface SkillActionResult {
  actionId: string
  degree: DegreeOfSuccess
  effects: string[]
  secret: boolean
}

export const SKILL_ACTIONS: Record<string, SkillActionDef> = {
  trip: {
    id: 'trip',
    name: 'Trip',
    skill: 'athletics',
    actions: 1,
    traits: ['attack'],
    secret: false,
    successEffects: {
      'critical-success': ['target falls prone', 'target takes 1d6 bludgeoning damage'],
      'success': ['target falls prone'],
      'failure': [],
      'critical-failure': ['you fall prone'],
    },
  },
  grapple: {
    id: 'grapple',
    name: 'Grapple',
    skill: 'athletics',
    actions: 1,
    traits: ['attack'],
    secret: false,
    successEffects: {
      'critical-success': ['target is restrained'],
      'success': ['target is grabbed'],
      'failure': [],
      'critical-failure': ['target can grab you or push you away'],
    },
  },
  shove: {
    id: 'shove',
    name: 'Shove',
    skill: 'athletics',
    actions: 1,
    traits: ['attack'],
    secret: false,
    successEffects: {
      'critical-success': ['push target 10 feet', 'you can follow'],
      'success': ['push target 5 feet', 'you can follow'],
      'failure': [],
      'critical-failure': ['you fall prone'],
    },
  },
  demoralize: {
    id: 'demoralize',
    name: 'Demoralize',
    skill: 'intimidation',
    actions: 1,
    traits: ['auditory', 'emotion', 'mental'],
    secret: false,
    successEffects: {
      'critical-success': ['target is frightened 2'],
      'success': ['target is frightened 1'],
      'failure': [],
      'critical-failure': ['target is temporarily immune for 10 minutes'],
    },
  },
  recall_knowledge: {
    id: 'recall_knowledge',
    name: 'Recall Knowledge',
    skill: 'varies',
    actions: 1,
    traits: ['concentrate', 'secret'],
    secret: true,
    successEffects: {
      'critical-success': ['learn two pieces of information about the target'],
      'success': ['learn one piece of information about the target'],
      'failure': ['no information learned'],
      'critical-failure': ['receive incorrect information'],
    },
  },
  sense_motive: {
    id: 'sense_motive',
    name: 'Sense Motive',
    skill: 'perception',
    actions: 1,
    traits: ['concentrate', 'secret'],
    secret: true,
    successEffects: {
      'critical-success': ['know if target is lying or honest'],
      'success': ['gain a sense of whether target is being honest'],
      'failure': ['no useful information'],
      'critical-failure': ['get a false impression'],
    },
  },
}

export function getSkillActionInfo(actionId: string): SkillActionDef | null {
  return SKILL_ACTIONS[actionId] ?? null
}

export interface ResolveSkillActionParams {
  naturalRoll: number
  skillBonus: number
  dc: number
}

export function resolveSkillAction(
  actionId: string,
  params: ResolveSkillActionParams
): SkillActionResult {
  const action = SKILL_ACTIONS[actionId]
  if (!action) throw new Error(`Unknown skill action: ${actionId}`)

  const degree = degreeOfSuccess(params.naturalRoll, params.skillBonus, params.dc)

  return {
    actionId,
    degree,
    effects: action.successEffects[degree],
    secret: action.secret,
  }
}
