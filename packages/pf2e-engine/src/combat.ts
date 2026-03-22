import type { Modifier, AttackResult } from './types.js'
import { resolveCheck } from './checks.js'
import { netModifier } from './modifiers.js'

export function multipleAttackPenalty(attackNumber: 1 | 2 | 3, agile: boolean): number {
  if (attackNumber === 1) return 0
  if (agile) {
    return attackNumber === 2 ? -4 : -8
  }
  return attackNumber === 2 ? -5 : -10
}

export interface ResolveAttackParams {
  naturalRoll: number
  attackBonus: number
  targetAC: number
  attackNumber: 1 | 2 | 3
  agile: boolean
  modifiers?: Modifier[]
}

export function resolveAttack(params: ResolveAttackParams): AttackResult {
  const { naturalRoll, attackBonus, targetAC, attackNumber, agile, modifiers = [] } = params

  const map = multipleAttackPenalty(attackNumber, agile)
  const additionalMod = netModifier(modifiers)
  const totalMod = attackBonus + map + additionalMod

  const check = resolveCheck({
    naturalRoll,
    modifier: totalMod,
    dc: targetAC,
  })

  return {
    check,
    hit: check.degree === 'success' || check.degree === 'critical-success',
    critical: check.degree === 'critical-success',
  }
}
