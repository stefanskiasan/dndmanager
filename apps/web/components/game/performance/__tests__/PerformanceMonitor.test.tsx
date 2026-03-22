import { describe, it, expect, beforeEach } from 'vitest'
import { usePerfStore } from '../PerformanceMonitor'

describe('PerformanceMonitor', () => {
  it('exports PerformanceMonitor and PerfOverlay components', async () => {
    const mod = await import('../PerformanceMonitor')
    expect(mod.PerformanceMonitor).toBeDefined()
    expect(mod.PerfOverlay).toBeDefined()
    expect(typeof mod.PerformanceMonitor).toBe('function')
    expect(typeof mod.PerfOverlay).toBe('function')
  })

  describe('usePerfStore', () => {
    beforeEach(() => {
      // Reset store to defaults
      usePerfStore.setState({
        stats: { fps: 0, drawCalls: 0, triangles: 0, geometries: 0, textures: 0, frameTime: 0 },
        visible: false,
      })
    })

    it('initializes with zero stats', () => {
      const { stats } = usePerfStore.getState()
      expect(stats.fps).toBe(0)
      expect(stats.drawCalls).toBe(0)
      expect(stats.triangles).toBe(0)
    })

    it('starts hidden', () => {
      expect(usePerfStore.getState().visible).toBe(false)
    })

    it('toggles visibility', () => {
      usePerfStore.getState().toggleVisible()
      expect(usePerfStore.getState().visible).toBe(true)
      usePerfStore.getState().toggleVisible()
      expect(usePerfStore.getState().visible).toBe(false)
    })

    it('updates stats', () => {
      usePerfStore.getState().setStats({
        fps: 60,
        drawCalls: 42,
        triangles: 12000,
        geometries: 15,
        textures: 8,
        frameTime: 16.67,
      })
      const { stats } = usePerfStore.getState()
      expect(stats.fps).toBe(60)
      expect(stats.drawCalls).toBe(42)
      expect(stats.triangles).toBe(12000)
      expect(stats.frameTime).toBe(16.67)
    })
  })
})
