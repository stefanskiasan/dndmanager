import type { GridPosition } from '../types.js'

export type { GridPosition }

export type Visibility = 'visible' | 'dim' | 'hidden'
export type SenseType = 'normal' | 'low-light' | 'darkvision'
export type LightLevel = 'bright' | 'dim' | 'darkness'

export interface LightSource {
  position: GridPosition
  brightRadius: number   // in feet
  dimRadius: number      // in feet
}

export interface Wall {
  from: GridPosition
  to: GridPosition
}

export interface FogState {
  width: number
  height: number
  cells: Visibility[][]  // [y][x]
}

export interface TokenSenses {
  tokenId: string
  position: GridPosition
  senseType: SenseType
  perceptionRange: number  // in feet
}
