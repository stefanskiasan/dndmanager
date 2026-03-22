import { describe, it, expect } from 'vitest'

describe('FrustumCulledGroup', () => {
  it('exports FrustumCulledGroup component', async () => {
    const mod = await import('../FrustumCulledGroup')
    expect(mod.FrustumCulledGroup).toBeDefined()
    expect(typeof mod.FrustumCulledGroup).toBe('function')
  })
})
