import type { ActiveCondition, ConditionId, Modifier } from './types.js'

/**
 * Returns modifiers applied by a condition.
 * PF2e conditions that apply numeric penalties/bonuses.
 */
export function getConditionModifiers(condition: ActiveCondition): Modifier[] {
  const { id, value } = condition

  switch (id) {
    case 'frightened':
      return [{ type: 'status', value: -value, source: 'frightened' }]

    case 'sickened':
      return [{ type: 'status', value: -value, source: 'sickened' }]

    case 'clumsy':
      return [{ type: 'status', value: -value, source: 'clumsy' }]

    case 'enfeebled':
      return [{ type: 'status', value: -value, source: 'enfeebled' }]

    case 'drained':
      return [{ type: 'status', value: -value, source: 'drained' }]

    case 'stupefied':
      return [{ type: 'status', value: -value, source: 'stupefied' }]

    case 'flat-footed':
      return [{ type: 'circumstance', value: -2, source: 'flat-footed' }]

    case 'prone':
      return [{ type: 'circumstance', value: -2, source: 'prone' }]

    default:
      return []
  }
}

export function addCondition(
  conditions: ActiveCondition[],
  condition: ActiveCondition
): ActiveCondition[] {
  const existing = conditions.find((c) => c.id === condition.id)
  if (existing) {
    if (condition.value > existing.value) {
      return conditions.map((c) => (c.id === condition.id ? condition : c))
    }
    return conditions
  }
  return [...conditions, condition]
}

export function removeCondition(
  conditions: ActiveCondition[],
  id: ConditionId
): ActiveCondition[] {
  return conditions.filter((c) => c.id !== id)
}

export function reduceCondition(
  conditions: ActiveCondition[],
  id: ConditionId
): ActiveCondition[] {
  return conditions
    .map((c) => (c.id === id ? { ...c, value: c.value - 1 } : c))
    .filter((c) => c.value > 0 || (c.id !== id))
}

export function hasCondition(conditions: ActiveCondition[], id: ConditionId): boolean {
  return conditions.some((c) => c.id === id)
}
