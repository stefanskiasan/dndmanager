import { describe, it, expect, beforeEach } from 'vitest'
import { useLoadingStore } from '@/lib/stores/loading-store'

describe('LoadingScreen', () => {
  it('exports LoadingScreen component', async () => {
    const mod = await import('../LoadingScreen')
    expect(mod.LoadingScreen).toBeDefined()
    expect(typeof mod.LoadingScreen).toBe('function')
  })
})

describe('useLoadingStore', () => {
  beforeEach(() => {
    useLoadingStore.getState().reset()
  })

  it('initializes with zero progress', () => {
    const state = useLoadingStore.getState()
    expect(state.progress).toBe(0)
    expect(state.stage).toBe('Connecting...')
    expect(state.isComplete).toBe(false)
  })

  it('updates progress and stage', () => {
    useLoadingStore.getState().setProgress(40, 'Loading tokens...')
    const state = useLoadingStore.getState()
    expect(state.progress).toBe(40)
    expect(state.stage).toBe('Loading tokens...')
    expect(state.isComplete).toBe(false)
  })

  it('completes loading', () => {
    useLoadingStore.getState().complete()
    const state = useLoadingStore.getState()
    expect(state.progress).toBe(100)
    expect(state.stage).toBe('Ready')
    expect(state.isComplete).toBe(true)
  })

  it('resets to initial state', () => {
    useLoadingStore.getState().complete()
    useLoadingStore.getState().reset()
    const state = useLoadingStore.getState()
    expect(state.progress).toBe(0)
    expect(state.stage).toBe('Connecting...')
    expect(state.isComplete).toBe(false)
  })
})
