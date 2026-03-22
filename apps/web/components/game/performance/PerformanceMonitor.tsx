'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { create } from 'zustand'

export interface PerfStats {
  fps: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  frameTime: number
}

const defaultStats: PerfStats = {
  fps: 0,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  frameTime: 0,
}

/** Shared store for perf stats so the HTML overlay can read them */
export const usePerfStore = create<{
  stats: PerfStats
  visible: boolean
  setStats: (stats: PerfStats) => void
  toggleVisible: () => void
}>((set) => ({
  stats: defaultStats,
  visible: false,
  setStats: (stats) => set({ stats }),
  toggleVisible: () => set((s) => ({ visible: !s.visible })),
}))

/**
 * In-scene performance monitor. Reads from gl.info each frame.
 * Updates the shared perf store every 500ms.
 *
 * Must be placed inside a <Canvas> component.
 */
export function PerformanceMonitor() {
  const { gl } = useThree()
  const setStats = usePerfStore((s) => s.setStats)
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())

  useFrame(() => {
    frameCount.current++
    const now = performance.now()
    const delta = now - lastTime.current

    // Update stats every 500ms to avoid layout thrashing
    if (delta >= 500) {
      const info = gl.info
      setStats({
        fps: Math.round((frameCount.current / delta) * 1000),
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        frameTime: Math.round((delta / frameCount.current) * 100) / 100,
      })
      frameCount.current = 0
      lastTime.current = now
    }
  })

  return null
}

/**
 * HTML overlay that displays performance stats.
 * Toggled with F3 key. Only shown in development by default.
 * Place this OUTSIDE the <Canvas> component as a sibling.
 */
export function PerfOverlay() {
  const stats = usePerfStore((s) => s.stats)
  const visible = usePerfStore((s) => s.visible)
  const toggleVisible = usePerfStore((s) => s.toggleVisible)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F3') {
        e.preventDefault()
        toggleVisible()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleVisible])

  if (!visible) return null

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-50 rounded bg-black/70 px-3 py-2 font-mono text-xs text-green-400">
      <div>FPS: {stats.fps}</div>
      <div>Draw calls: {stats.drawCalls}</div>
      <div>Triangles: {stats.triangles.toLocaleString()}</div>
      <div>Geometries: {stats.geometries}</div>
      <div>Textures: {stats.textures}</div>
      <div>Frame: {stats.frameTime}ms</div>
    </div>
  )
}
