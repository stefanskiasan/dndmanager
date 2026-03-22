import { describe, it, expect } from 'vitest'
import { computeVisibility, createFogState, mergeVisibility } from '../fog/visibility.js'
import type { TokenSenses, LightSource, Wall, FogState, Visibility } from '../fog/types.js'

describe('createFogState', () => {
  it('creates grid filled with hidden', () => {
    const fog = createFogState(5, 5)
    expect(fog.width).toBe(5)
    expect(fog.height).toBe(5)
    expect(fog.cells[0][0]).toBe('hidden')
    expect(fog.cells[4][4]).toBe('hidden')
  })
})

describe('computeVisibility', () => {
  it('marks cells within vision range as visible', () => {
    const token: TokenSenses = {
      tokenId: 'thorin',
      position: { x: 5, y: 5 },
      senseType: 'normal',
      perceptionRange: 60,
    }
    const fog = computeVisibility(token, [], [], 'bright', 10, 10)
    expect(fog.cells[5][5]).toBe('visible') // own position
    expect(fog.cells[5][6]).toBe('visible') // adjacent
  })

  it('walls block visibility', () => {
    const token: TokenSenses = {
      tokenId: 'thorin',
      position: { x: 2, y: 5 },
      senseType: 'normal',
      perceptionRange: 60,
    }
    const walls: Wall[] = [
      { from: { x: 4, y: 0 }, to: { x: 4, y: 10 } },
    ]
    const fog = computeVisibility(token, [], walls, 'bright', 10, 10)
    expect(fog.cells[5][2]).toBe('visible')
    expect(fog.cells[5][6]).toBe('hidden') // behind wall
  })

  it('darkvision sees in darkness', () => {
    const token: TokenSenses = {
      tokenId: 'elf',
      position: { x: 5, y: 5 },
      senseType: 'darkvision',
      perceptionRange: 60,
    }
    const fog = computeVisibility(token, [], [], 'darkness', 10, 10)
    expect(fog.cells[5][6]).toBe('dim') // darkvision in darkness = dim
  })

  it('normal vision cannot see in darkness', () => {
    const token: TokenSenses = {
      tokenId: 'human',
      position: { x: 5, y: 5 },
      senseType: 'normal',
      perceptionRange: 60,
    }
    const fog = computeVisibility(token, [], [], 'darkness', 10, 10)
    expect(fog.cells[5][6]).toBe('hidden')
  })

  it('light source illuminates area in darkness', () => {
    const token: TokenSenses = {
      tokenId: 'human',
      position: { x: 5, y: 5 },
      senseType: 'normal',
      perceptionRange: 60,
    }
    const lights: LightSource[] = [
      { position: { x: 5, y: 5 }, brightRadius: 20, dimRadius: 40 },
    ]
    const fog = computeVisibility(token, lights, [], 'darkness', 10, 10)
    expect(fog.cells[5][6]).toBe('visible') // within torch bright
  })
})

describe('mergeVisibility', () => {
  it('takes best visibility from multiple fog states', () => {
    const fog1 = createFogState(3, 3)
    fog1.cells[0][0] = 'visible'
    fog1.cells[1][1] = 'dim'

    const fog2 = createFogState(3, 3)
    fog2.cells[0][0] = 'dim'
    fog2.cells[1][1] = 'visible'
    fog2.cells[2][2] = 'dim'

    const merged = mergeVisibility([fog1, fog2])
    expect(merged.cells[0][0]).toBe('visible') // best of visible, dim
    expect(merged.cells[1][1]).toBe('visible') // best of dim, visible
    expect(merged.cells[2][2]).toBe('dim')     // best of hidden, dim
  })
})
