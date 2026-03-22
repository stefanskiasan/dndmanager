import { describe, it, expect, vi } from 'vitest'
import type { Token } from '@dndmanager/game-runtime'

/**
 * Unit tests for InstancedTokenGroup.
 * Since R3F components require a Canvas context, we test the grouping logic
 * and verify the component module exports correctly.
 */

function makeToken(overrides: Partial<Token> & { id: string; name: string }): Token {
  return {
    type: 'monster',
    ownerId: 'gm',
    position: { x: 0, y: 0 },
    speed: 30,
    conditions: [],
    hp: { current: 10, max: 10, temp: 0 },
    ac: 12,
    visible: true,
    ...overrides,
  }
}

describe('InstancedTokenGroup', () => {
  it('exports InstancedTokenGroup component', async () => {
    const mod = await import('../InstancedTokenGroup')
    expect(mod.InstancedTokenGroup).toBeDefined()
    expect(typeof mod.InstancedTokenGroup).toBe('function')
  })

  it('returns null for empty token array', async () => {
    const { InstancedTokenGroup } = await import('../InstancedTokenGroup')
    const result = InstancedTokenGroup({ tokens: [], color: '#ff0000' })
    expect(result).toBeNull()
  })
})

describe('Token grouping logic', () => {
  it('groups monster tokens without modelUrl by name', () => {
    const tokens: Token[] = [
      makeToken({ id: 'g1', name: 'Goblin', position: { x: 1, y: 2 } }),
      makeToken({ id: 'g2', name: 'Goblin', position: { x: 3, y: 4 } }),
      makeToken({ id: 'o1', name: 'Orc', position: { x: 5, y: 6 } }),
      makeToken({ id: 'p1', name: 'Thorin', type: 'player', position: { x: 7, y: 8 } }),
    ]

    const groups: Record<string, Token[]> = {}
    const individual: Token[] = []

    tokens.forEach((token) => {
      const modelUrl = (token as Token & { modelUrl?: string }).modelUrl
      if (token.type === 'monster' && !modelUrl) {
        const key = token.name
        ;(groups[key] ??= []).push(token)
      } else {
        individual.push(token)
      }
    })

    expect(Object.keys(groups)).toEqual(['Goblin', 'Orc'])
    expect(groups['Goblin']).toHaveLength(2)
    expect(groups['Orc']).toHaveLength(1)
    expect(individual).toHaveLength(1)
    expect(individual[0].name).toBe('Thorin')
  })

  it('puts tokens with modelUrl into individual rendering', () => {
    const tokens: Token[] = [
      { ...makeToken({ id: 'g1', name: 'Goblin' }), modelUrl: '/models/goblin.glb' } as Token & { modelUrl: string },
    ]

    const groups: Record<string, Token[]> = {}
    const individual: Token[] = []

    tokens.forEach((token) => {
      const modelUrl = (token as Token & { modelUrl?: string }).modelUrl
      if (token.type === 'monster' && !modelUrl) {
        const key = token.name
        ;(groups[key] ??= []).push(token)
      } else {
        individual.push(token)
      }
    })

    expect(Object.keys(groups)).toHaveLength(0)
    expect(individual).toHaveLength(1)
  })
})
