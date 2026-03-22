import { describe, it, expect, vi, beforeAll } from 'vitest'

// Mock document.createElement for canvas in test environment
const mockFillRect = vi.fn()
const mockGetContext = vi.fn(() => ({
  fillStyle: '',
  fillRect: mockFillRect,
}))

beforeAll(() => {
  // Mock HTMLCanvasElement for environments without DOM
  if (typeof document !== 'undefined') {
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: mockGetContext,
          toDataURL: () => '',
        } as unknown as HTMLCanvasElement
      }
      return origCreateElement(tag)
    })
  }
})

describe('texture-atlas', () => {
  it('exports buildColorAtlas', async () => {
    const mod = await import('../texture-atlas')
    expect(mod.buildColorAtlas).toBeDefined()
    expect(typeof mod.buildColorAtlas).toBe('function')
  })

  it('creates entries for all tile types', async () => {
    const { buildColorAtlas } = await import('../texture-atlas')
    const tileTypes = {
      stone: '#6b7280',
      grass: '#4ade80',
      water: '#3b82f6',
      sand: '#fbbf24',
    }

    const atlas = buildColorAtlas(tileTypes, 32)

    expect(atlas.entries.size).toBe(4)
    expect(atlas.entries.has('stone')).toBe(true)
    expect(atlas.entries.has('grass')).toBe(true)
    expect(atlas.entries.has('water')).toBe(true)
    expect(atlas.entries.has('sand')).toBe(true)
  })

  it('computes correct UV coordinates', async () => {
    const { buildColorAtlas } = await import('../texture-atlas')
    const tileTypes = {
      a: '#ff0000',
      b: '#00ff00',
      c: '#0000ff',
      d: '#ffff00',
    }

    const atlas = buildColorAtlas(tileTypes, 64)
    // 4 tiles -> gridSize = 2

    const entryA = atlas.entries.get('a')!
    expect(entryA.uOffset).toBe(0)
    expect(entryA.uScale).toBe(0.5)
    expect(entryA.vScale).toBe(0.5)

    const entryB = atlas.entries.get('b')!
    expect(entryB.uOffset).toBe(0.5)
    expect(entryB.uScale).toBe(0.5)
  })

  it('creates atlas texture with nearest filtering', async () => {
    const { buildColorAtlas } = await import('../texture-atlas')
    const THREE = await import('three')
    const atlas = buildColorAtlas({ stone: '#6b7280' }, 64)

    expect(atlas.texture.magFilter).toBe(THREE.NearestFilter)
    expect(atlas.texture.minFilter).toBe(THREE.NearestFilter)
  })
})
