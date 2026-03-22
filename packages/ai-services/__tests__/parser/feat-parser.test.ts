import { describe, it, expect } from 'vitest'
import { parseFeat } from '../../src/parser/feat-parser'

describe('parseFeat', () => {
  const foundryPowerAttack = {
    _id: 'pa-123',
    name: 'Power Attack',
    type: 'feat',
    system: {
      level: { value: 1 },
      actionType: { value: 'action' },
      actions: { value: 2 },
      traits: { value: ['fighter', 'flourish'] },
      prerequisites: { value: [{ value: 'trained in martial weapons' }] },
      description: { value: '<p>Make a devastating attack.</p>' },
      source: { value: 'Pathfinder Core Rulebook' },
    },
  }

  it('parses a Foundry feat into our schema', () => {
    const result = parseFeat(foundryPowerAttack)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Power Attack')
    expect(result!.level).toBe(1)
    expect(result!.actionCost).toBe('2')
    expect(result!.featType).toBe('class')
  })

  it('parses prerequisites', () => {
    const result = parseFeat(foundryPowerAttack)
    expect(result!.prerequisites).toHaveLength(1)
    expect(result!.prerequisites[0].value).toContain('martial weapons')
  })
})
