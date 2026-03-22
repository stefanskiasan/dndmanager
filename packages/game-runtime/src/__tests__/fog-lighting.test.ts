import { describe, it, expect } from 'vitest'
import { getLightLevelAt, COMMON_LIGHT_SOURCES } from '../fog/lighting.js'
import type { LightSource, LightLevel } from '../fog/types.js'

describe('COMMON_LIGHT_SOURCES', () => {
  it('torch has 20ft bright and 40ft dim', () => {
    expect(COMMON_LIGHT_SOURCES.torch.brightRadius).toBe(20)
    expect(COMMON_LIGHT_SOURCES.torch.dimRadius).toBe(40)
  })

  it('lantern has 30ft bright and 60ft dim', () => {
    expect(COMMON_LIGHT_SOURCES.lantern.brightRadius).toBe(30)
    expect(COMMON_LIGHT_SOURCES.lantern.dimRadius).toBe(60)
  })
})

describe('getLightLevelAt', () => {
  it('returns bright within bright radius', () => {
    const sources: LightSource[] = [
      { position: { x: 5, y: 5 }, brightRadius: 20, dimRadius: 40 },
    ]
    expect(getLightLevelAt({ x: 6, y: 5 }, sources, 'darkness')).toBe('bright')
  })

  it('returns dim between bright and dim radius', () => {
    const sources: LightSource[] = [
      { position: { x: 5, y: 5 }, brightRadius: 20, dimRadius: 40 },
    ]
    // 5 squares away = 25ft, outside bright (20ft) but inside dim (40ft)
    expect(getLightLevelAt({ x: 10, y: 5 }, sources, 'darkness')).toBe('dim')
  })

  it('returns base light outside all sources', () => {
    const sources: LightSource[] = [
      { position: { x: 5, y: 5 }, brightRadius: 20, dimRadius: 40 },
    ]
    // 10 squares = 50ft, outside dim (40ft)
    expect(getLightLevelAt({ x: 15, y: 5 }, sources, 'darkness')).toBe('darkness')
  })

  it('multiple sources: best light wins', () => {
    const sources: LightSource[] = [
      { position: { x: 3, y: 5 }, brightRadius: 10, dimRadius: 20 },
      { position: { x: 7, y: 5 }, brightRadius: 20, dimRadius: 40 },
    ]
    // Position 5,5: 10ft from source 1 (dim), 10ft from source 2 (bright)
    expect(getLightLevelAt({ x: 5, y: 5 }, sources, 'darkness')).toBe('bright')
  })

  it('no sources: returns base light', () => {
    expect(getLightLevelAt({ x: 5, y: 5 }, [], 'dim')).toBe('dim')
  })
})
