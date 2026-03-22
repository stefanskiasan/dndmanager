'use client'

import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/lib/stores/game-store'

type TransitionType = 'fade' | 'crossfade' | 'slide'

interface MapTransitionProps {
  type?: TransitionType
  duration?: number // seconds
  children: React.ReactNode
}

/**
 * Wraps the map scene content and applies a transition effect when the
 * current room/map changes. Detects room changes by watching the game
 * store's currentRoom field.
 *
 * - fade: opacity 1 -> 0, swap content, opacity 0 -> 1
 * - crossfade: old scene fades out while new scene fades in simultaneously
 * - slide: old scene slides out, new scene slides in from the direction of travel
 */
export function MapTransition({
  type = 'fade',
  duration = 0.6,
  children,
}: MapTransitionProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [transitioning, setTransitioning] = useState(false)
  const progress = useRef(0)
  const phase = useRef<'out' | 'in'>('out')

  // Watch for room changes
  const currentRoom = useGameStore((s) => s.currentRoom)
  const prevRoom = useRef(currentRoom)

  useEffect(() => {
    if (currentRoom !== prevRoom.current) {
      prevRoom.current = currentRoom
      setTransitioning(true)
      progress.current = 0
      phase.current = 'out'
    }
  }, [currentRoom])

  useFrame((_, delta) => {
    if (!transitioning || !groupRef.current) return

    progress.current += delta / (duration / 2)

    if (type === 'fade') {
      if (phase.current === 'out') {
        // Fade out: traverse all materials and reduce opacity
        setGroupOpacity(groupRef.current, Math.max(0, 1 - progress.current))
        if (progress.current >= 1) {
          phase.current = 'in'
          progress.current = 0
        }
      } else {
        // Fade in
        setGroupOpacity(groupRef.current, Math.min(1, progress.current))
        if (progress.current >= 1) {
          setGroupOpacity(groupRef.current, 1)
          setTransitioning(false)
        }
      }
    } else if (type === 'slide') {
      const halfDuration = duration / 2
      if (phase.current === 'out') {
        groupRef.current.position.x = -progress.current * 5
        if (progress.current >= 1) {
          phase.current = 'in'
          progress.current = 0
          groupRef.current.position.x = 5
        }
      } else {
        groupRef.current.position.x = 5 * (1 - progress.current)
        if (progress.current >= 1) {
          groupRef.current.position.x = 0
          setTransitioning(false)
        }
      }
    } else {
      // crossfade: simply use opacity
      if (phase.current === 'out') {
        setGroupOpacity(groupRef.current, Math.max(0, 1 - progress.current))
        if (progress.current >= 1) {
          phase.current = 'in'
          progress.current = 0
        }
      } else {
        setGroupOpacity(groupRef.current, Math.min(1, progress.current))
        if (progress.current >= 1) {
          setGroupOpacity(groupRef.current, 1)
          setTransitioning(false)
        }
      }
    }
  })

  return <group ref={groupRef}>{children}</group>
}

/**
 * Recursively sets opacity on all materials in a group.
 */
function setGroupOpacity(group: THREE.Group, opacity: number) {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
      child.material.transparent = opacity < 1
      child.material.opacity = opacity
    }
  })
}
