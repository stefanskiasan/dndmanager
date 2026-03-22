import { describe, it, expect } from 'vitest'
import {
  createToken,
  addToken,
  removeToken,
  moveToken,
  getToken,
  getTokenAt,
  getTokensByType,
} from '../tokens.js'
import type { Token } from '../types.js'

describe('createToken', () => {
  it('creates a player token with defaults', () => {
    const token = createToken({
      id: 'thorin',
      name: 'Thorin',
      type: 'player',
      ownerId: 'user-1',
      position: { x: 3, y: 5 },
      speed: 25,
      ac: 18,
      hp: { current: 45, max: 45, temp: 0 },
    })
    expect(token.id).toBe('thorin')
    expect(token.visible).toBe(true)
    expect(token.conditions).toEqual([])
  })
})

describe('addToken', () => {
  it('adds token to list', () => {
    const tokens: Token[] = []
    const token = createToken({
      id: 'thorin', name: 'Thorin', type: 'player',
      ownerId: 'user-1', position: { x: 0, y: 0 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    const result = addToken(tokens, token)
    expect(result).toHaveLength(1)
  })

  it('rejects duplicate ID', () => {
    const token = createToken({
      id: 'thorin', name: 'Thorin', type: 'player',
      ownerId: 'user-1', position: { x: 0, y: 0 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    const tokens = [token]
    expect(() => addToken(tokens, token)).toThrow('duplicate')
  })
})

describe('removeToken', () => {
  it('removes token by ID', () => {
    const token = createToken({
      id: 'goblin-1', name: 'Goblin', type: 'monster',
      ownerId: 'gm', position: { x: 5, y: 5 },
      speed: 25, ac: 16, hp: { current: 20, max: 20, temp: 0 },
    })
    const result = removeToken([token], 'goblin-1')
    expect(result).toHaveLength(0)
  })
})

describe('moveToken', () => {
  it('updates token position', () => {
    const token = createToken({
      id: 'thorin', name: 'Thorin', type: 'player',
      ownerId: 'user-1', position: { x: 0, y: 0 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    const result = moveToken([token], 'thorin', { x: 3, y: 2 })
    expect(result[0].position).toEqual({ x: 3, y: 2 })
  })

  it('does not mutate original array', () => {
    const token = createToken({
      id: 'thorin', name: 'Thorin', type: 'player',
      ownerId: 'user-1', position: { x: 0, y: 0 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    const original = [token]
    moveToken(original, 'thorin', { x: 3, y: 2 })
    expect(original[0].position).toEqual({ x: 0, y: 0 })
  })
})

describe('getToken', () => {
  it('finds token by ID', () => {
    const token = createToken({
      id: 'thorin', name: 'Thorin', type: 'player',
      ownerId: 'user-1', position: { x: 0, y: 0 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    expect(getToken([token], 'thorin')).toBe(token)
  })

  it('returns undefined for missing ID', () => {
    expect(getToken([], 'nonexistent')).toBeUndefined()
  })
})

describe('getTokenAt', () => {
  it('finds token at position', () => {
    const token = createToken({
      id: 'thorin', name: 'Thorin', type: 'player',
      ownerId: 'user-1', position: { x: 3, y: 5 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    expect(getTokenAt([token], { x: 3, y: 5 })).toBe(token)
  })

  it('returns undefined for empty position', () => {
    expect(getTokenAt([], { x: 0, y: 0 })).toBeUndefined()
  })
})

describe('getTokensByType', () => {
  it('filters by type', () => {
    const player = createToken({
      id: 'p1', name: 'Player', type: 'player',
      ownerId: 'u1', position: { x: 0, y: 0 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    const monster = createToken({
      id: 'm1', name: 'Goblin', type: 'monster',
      ownerId: 'gm', position: { x: 5, y: 5 },
      speed: 25, ac: 16, hp: { current: 20, max: 20, temp: 0 },
    })
    expect(getTokensByType([player, monster], 'monster')).toEqual([monster])
  })
})
