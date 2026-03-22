'use client'

import { useRef, useCallback, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { CharacterModel } from './CharacterModel'

interface ThumbnailCaptureProps {
  onCapture: (dataUrl: string) => void
  delay?: number
}

/**
 * Inner component that captures the canvas after the model loads.
 */
function ThumbnailCapture({ onCapture, delay = 500 }: ThumbnailCaptureProps) {
  const { gl } = useThree()
  const captured = useRef(false)

  useEffect(() => {
    if (captured.current) return
    const timer = setTimeout(() => {
      captured.current = true
      const dataUrl = gl.domElement.toDataURL('image/png')
      onCapture(dataUrl)
    }, delay)
    return () => clearTimeout(timer)
  }, [gl, onCapture, delay])

  return null
}

interface ModelThumbnailRendererProps {
  modelUrl: string
  width?: number
  height?: number
  onThumbnailReady: (dataUrl: string) => void
}

/**
 * Renders a 3D model in a hidden canvas and captures a PNG thumbnail.
 * Mount this temporarily, capture, then unmount.
 */
export function ModelThumbnailRenderer({
  modelUrl,
  width = 256,
  height = 256,
  onThumbnailReady,
}: ModelThumbnailRendererProps) {
  const handleCapture = useCallback(
    (dataUrl: string) => {
      onThumbnailReady(dataUrl)
    },
    [onThumbnailReady]
  )

  return (
    <div
      style={{
        width,
        height,
        position: 'absolute',
        left: -9999,
        top: -9999,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: [0, 0.5, 2], fov: 40 }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 3, 2]} intensity={1} />
        <CharacterModel url={modelUrl} fallbackColor="#666" />
        <ThumbnailCapture onCapture={handleCapture} delay={1000} />
      </Canvas>
    </div>
  )
}
