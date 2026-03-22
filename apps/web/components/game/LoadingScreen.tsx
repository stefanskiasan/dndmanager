'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'

interface LoadingScreenProps {
  /** 0-100 progress percentage */
  progress: number
  /** Current loading stage description */
  stage: string
  /** Whether loading is complete */
  isComplete: boolean
}

/**
 * Full-screen overlay shown while the game scene initialises.
 * Fades out over 500ms when loading completes.
 *
 * Stages: "Connecting..." -> "Loading map..." -> "Loading tokens..." -> "Ready"
 */
export function LoadingScreen({ progress, stage, isComplete }: LoadingScreenProps) {
  const [visible, setVisible] = useState(true)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    if (isComplete) {
      // Fade out
      setOpacity(0)
      const timer = setTimeout(() => setVisible(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isComplete])

  if (!visible) return null

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-900 transition-opacity duration-500"
      style={{ opacity }}
      data-testid="loading-screen"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Title */}
        <h1 className="text-2xl font-bold text-zinc-100">Loading Adventure...</h1>

        {/* Progress bar */}
        <div className="w-64">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stage label */}
        <p className="text-sm text-zinc-400" data-testid="loading-stage">
          {stage}
        </p>
      </div>
    </div>
  )
}
