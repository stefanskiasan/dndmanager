import type { Modifier, ModifierType } from './types.js'

interface CollectedModifiers {
  bonuses: Modifier[]
  penalties: Modifier[]
}

export function collectModifiers(modifiers: Modifier[]): CollectedModifiers {
  const active = modifiers.filter((m) => m.enabled !== false)
  return {
    bonuses: active.filter((m) => m.value > 0),
    penalties: active.filter((m) => m.value < 0),
  }
}

/**
 * PF2e stacking: same bonus type → highest only.
 * Exception: untyped, ability, proficiency always stack.
 */
export function totalBonus(modifiers: Modifier[]): number {
  const { bonuses } = collectModifiers(modifiers)
  const alwaysStack: ModifierType[] = ['untyped', 'ability', 'proficiency']
  const byType = new Map<ModifierType, number>()
  let total = 0

  for (const mod of bonuses) {
    if (alwaysStack.includes(mod.type)) {
      total += mod.value
    } else {
      const current = byType.get(mod.type) ?? 0
      byType.set(mod.type, Math.max(current, mod.value))
    }
  }

  for (const value of byType.values()) {
    total += value
  }

  return total
}

/**
 * PF2e stacking: same penalty type → worst only.
 * Exception: untyped penalties always stack.
 */
export function totalPenalty(modifiers: Modifier[]): number {
  const { penalties } = collectModifiers(modifiers)
  const byType = new Map<ModifierType, number>()
  let total = 0

  for (const mod of penalties) {
    if (mod.type === 'untyped') {
      total += mod.value
    } else {
      const current = byType.get(mod.type) ?? 0
      byType.set(mod.type, Math.min(current, mod.value))
    }
  }

  for (const value of byType.values()) {
    total += value
  }

  return total
}

export function netModifier(modifiers: Modifier[]): number {
  return totalBonus(modifiers) + totalPenalty(modifiers)
}
