import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('LazyModel', () => {
  it('exports LazyModel component', async () => {
    const mod = await import('../LazyModel')
    expect(mod.LazyModel).toBeDefined()
    expect(typeof mod.LazyModel).toBe('function')
  })
})

describe('model-cache', () => {
  beforeEach(async () => {
    const cache = await import('@/lib/three-utils/model-cache')
    cache.clearCache()
  })

  it('tracks visible models', async () => {
    const { markModelVisible, getTrackedModelCount } = await import(
      '@/lib/three-utils/model-cache'
    )
    expect(getTrackedModelCount()).toBe(0)
    markModelVisible('/models/goblin.glb')
    expect(getTrackedModelCount()).toBe(1)
    markModelVisible('/models/orc.glb')
    expect(getTrackedModelCount()).toBe(2)
  })

  it('does not evict recently visible models', async () => {
    const { markModelVisible, evictStaleModels } = await import(
      '@/lib/three-utils/model-cache'
    )
    markModelVisible('/models/goblin.glb')
    const stale = evictStaleModels()
    expect(stale).toHaveLength(0)
  })

  it('evicts models after timeout', async () => {
    const { markModelVisible, getStaleModels, clearCache } = await import(
      '@/lib/three-utils/model-cache'
    )

    // Mock Date.now to simulate time passing
    const originalNow = Date.now
    let mockTime = 1000000

    vi.spyOn(Date, 'now').mockImplementation(() => mockTime)

    clearCache()
    markModelVisible('/models/goblin.glb')

    // Advance time by 61 seconds
    mockTime += 61_000

    const stale = getStaleModels()
    expect(stale).toContain('/models/goblin.glb')

    // Restore
    vi.restoreAllMocks()
  })

  it('clearCache removes all entries', async () => {
    const { markModelVisible, getTrackedModelCount, clearCache } = await import(
      '@/lib/three-utils/model-cache'
    )
    markModelVisible('/models/a.glb')
    markModelVisible('/models/b.glb')
    expect(getTrackedModelCount()).toBe(2)
    clearCache()
    expect(getTrackedModelCount()).toBe(0)
  })
})
