import type { ActionContext, ActionCost, ConditionId } from './types.js'
import { hasCondition } from './conditions.js'

interface ActionValidation {
  valid: boolean
  reason?: string
  cost: ActionCost
}

interface StepValidation extends ActionValidation {
  maxDistance: number
}

const PREVENTS_ACTING: ConditionId[] = ['paralyzed', 'petrified', 'unconscious']
const PREVENTS_MOVING: ConditionId[] = ['immobilized', 'grabbed', 'restrained', 'paralyzed', 'petrified', 'unconscious']

export function canAct(ctx: ActionContext): boolean {
  if (ctx.actionsRemaining <= 0) return false
  return !PREVENTS_ACTING.some((id) => hasCondition(ctx.conditions, id))
}

export function canMove(ctx: ActionContext): boolean {
  return !PREVENTS_MOVING.some((id) => hasCondition(ctx.conditions, id))
}

export function movementCost(squares: number, difficultTerrain: boolean): number {
  return squares * (difficultTerrain ? 10 : 5)
}

export function validateStrike(ctx: ActionContext): ActionValidation {
  if (!canAct(ctx)) {
    return { valid: false, reason: 'Cannot act', cost: 1 }
  }
  return { valid: true, cost: 1 }
}

export function validateMove(ctx: ActionContext, distanceFeet: number): ActionValidation {
  if (!canAct(ctx)) {
    return { valid: false, reason: 'Cannot act', cost: 1 }
  }
  if (!canMove(ctx)) {
    return { valid: false, reason: 'Cannot move', cost: 1 }
  }
  if (distanceFeet > ctx.speed) {
    return { valid: false, reason: 'Exceeds speed', cost: 1 }
  }
  return { valid: true, cost: 1 }
}

export function validateStep(ctx: ActionContext): StepValidation {
  if (!canAct(ctx)) {
    return { valid: false, reason: 'Cannot act', cost: 1, maxDistance: 5 }
  }
  if (!canMove(ctx)) {
    return { valid: false, reason: 'Cannot move', cost: 1, maxDistance: 5 }
  }
  return { valid: true, cost: 1, maxDistance: 5 }
}
