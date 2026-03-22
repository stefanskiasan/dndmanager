import { describe, it, expect } from 'vitest'

describe('TileAtlasLayer', () => {
  it('exports TileAtlasLayer component', async () => {
    const mod = await import('../TileAtlasLayer')
    expect(mod.TileAtlasLayer).toBeDefined()
    expect(typeof mod.TileAtlasLayer).toBe('function')
  })
})
