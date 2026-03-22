'use client'

import { useState, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { getCameraFrustum, isTileVisible } from '@/lib/three-utils/frustum-helpers'

interface LazyModelProps {
  url: string
  gridX: number
  gridY: number
  /** How many tiles outside the viewport to start preloading */
  preloadMargin?: number
  children: (loaded: boolean) => React.ReactNode
}

/**
 * Defers GLB loading until the token's grid position is near the camera viewport.
 * Uses a render-callback pattern: children receive `loaded` boolean.
 *
 * Preloads via useGLTF.preload() when the token is within `preloadMargin`
 * tiles of the viewport edge.
 */
export function LazyModel({ url, gridX, gridY, preloadMargin = 3, children }: LazyModelProps) {
  const [shouldLoad, setShouldLoad] = useState(false)
  const preloaded = useRef(false)
  const { camera } = useThree()

  useFrame(() => {
    if (shouldLoad) return // already triggered, no need to check
    const frustum = getCameraFrustum(camera)

    // Check if tile is visible (within frustum)
    if (isTileVisible(frustum, gridX, gridY)) {
      setShouldLoad(true)
      if (url && !preloaded.current) {
        preloaded.current = true
        useGLTF.preload(url)
      }
    }
  })

  return <>{children(shouldLoad)}</>
}
