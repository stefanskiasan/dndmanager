import type { ActiveCondition } from './types.js'
import { degreeOfSuccess } from './checks.js'
import { hasCondition } from './conditions.js'

export type ReactionTrigger =
  | 'enemy_leaves_reach'
  | 'enemy_uses_manipulate'
  | 'damage_taken'
  | 'ally_attacked'

export interface ReactionDef {
  id: string
  name: string
  trigger: ReactionTrigger
  description: string
}

export const REACTIONS: Record<string, ReactionDef> = {
  reactive_strike: {
    id: 'reactive_strike',
    name: 'Reactive Strike',
    trigger: 'enemy_leaves_reach',
    description: 'Make a melee Strike against the triggering creature.',
  },
  shield_block: {
    id: 'shield_block',
    name: 'Shield Block',
    trigger: 'damage_taken',
    description: 'Reduce damage by shield hardness.',
  },
}

interface ReactionContext {
  reactionAvailable: boolean
  trigger: string
  conditions: ActiveCondition[]
}

const PREVENTS_REACTIONS: string[] = ['stunned', 'paralyzed', 'unconscious', 'petrified']

export function canUseReaction(reactionId: string, ctx: ReactionContext): boolean {
  const reaction = REACTIONS[reactionId]
  if (!reaction) return false
  if (!ctx.reactionAvailable) return false
  if (reaction.trigger !== ctx.trigger) return false
  if (PREVENTS_REACTIONS.some((c) => hasCondition(ctx.conditions, c as any))) return false
  return true
}

interface ShieldBlockParams {
  damage: number
  shieldHardness: number
  shieldHP: number
}

interface ReactiveStrikeParams {
  naturalRoll: number
  attackBonus: number
  targetAC: number
}

export function resolveReaction(
  reactionId: string,
  params: ShieldBlockParams | ReactiveStrikeParams
): Record<string, unknown> {
  if (reactionId === 'shield_block') {
    const p = params as ShieldBlockParams
    const damageReduced = Math.min(p.damage, p.shieldHardness)
    const remainingDamage = p.damage - damageReduced
    const shieldDamage = remainingDamage
    const shieldBroken = shieldDamage > p.shieldHP

    return {
      damageReduced,
      remainingDamage,
      shieldDamage,
      shieldBroken,
    }
  }

  if (reactionId === 'reactive_strike') {
    const p = params as ReactiveStrikeParams
    const degree = degreeOfSuccess(p.naturalRoll, p.attackBonus, p.targetAC)
    return {
      hit: degree === 'success' || degree === 'critical-success',
      critical: degree === 'critical-success',
      degree,
    }
  }

  throw new Error(`Unknown reaction: ${reactionId}`)
}
