import type { Token, TokenType, GridPosition } from './types.js'
import { positionEquals } from './grid.js'

export interface CreateTokenParams {
  id: string
  name: string
  type: TokenType
  ownerId: string
  position: GridPosition
  speed: number
  ac: number
  hp: { current: number; max: number; temp: number }
  visible?: boolean
}

export function createToken(params: CreateTokenParams): Token {
  return {
    conditions: [],
    visible: true,
    ...params,
  }
}

export function addToken(tokens: Token[], token: Token): Token[] {
  if (tokens.some((t) => t.id === token.id)) {
    throw new Error(`Token with duplicate id: ${token.id}`)
  }
  return [...tokens, token]
}

export function removeToken(tokens: Token[], tokenId: string): Token[] {
  return tokens.filter((t) => t.id !== tokenId)
}

export function moveToken(tokens: Token[], tokenId: string, position: GridPosition): Token[] {
  return tokens.map((t) =>
    t.id === tokenId ? { ...t, position } : t
  )
}

export function getToken(tokens: Token[], tokenId: string): Token | undefined {
  return tokens.find((t) => t.id === tokenId)
}

export function getTokenAt(tokens: Token[], position: GridPosition): Token | undefined {
  return tokens.find((t) => positionEquals(t.position, position))
}

export function getTokensByType(tokens: Token[], type: TokenType): Token[] {
  return tokens.filter((t) => t.type === type)
}
