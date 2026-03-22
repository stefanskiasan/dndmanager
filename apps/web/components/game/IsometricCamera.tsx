'use client'

import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'

interface IsometricCameraProps {
  zoom?: number
  target?: [number, number, number]
}

export function IsometricCamera({ zoom = 50, target = [0, 0, 0] }: IsometricCameraProps) {
  const cameraRef = useRef<THREE.OrthographicCamera>(null)
  const { size } = useThree()

  useEffect(() => {
    if (!cameraRef.current) return

    const cam = cameraRef.current
    // Isometric angle: 45deg rotation, ~35.264deg elevation (atan(1/sqrt(2)))
    const distance = 100
    const angle = Math.PI / 4   // 45 degrees
    const elevation = Math.atan(1 / Math.sqrt(2)) // ~35.264 degrees

    cam.position.set(
      target[0] + distance * Math.cos(elevation) * Math.cos(angle),
      target[1] + distance * Math.sin(elevation),
      target[2] + distance * Math.cos(elevation) * Math.sin(angle)
    )
    cam.lookAt(target[0], target[1], target[2])
    cam.zoom = zoom
    cam.updateProjectionMatrix()
  }, [zoom, target])

  return (
    <OrthographicCamera
      ref={cameraRef}
      makeDefault
      near={0.1}
      far={1000}
      zoom={zoom}
    />
  )
}
