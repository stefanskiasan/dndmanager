'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface ModelGenerationPanelProps {
  characterId: string
  initialStatus: 'none' | 'pending' | 'processing' | 'succeeded' | 'failed'
  initialModelUrl?: string | null
  initialThumbnailUrl?: string | null
}

export function ModelGenerationPanel({
  characterId,
  initialStatus,
  initialModelUrl,
  initialThumbnailUrl,
}: ModelGenerationPanelProps) {
  const [status, setStatus] = useState(initialStatus)
  const [modelUrl, setModelUrl] = useState(initialModelUrl ?? null)
  const [thumbnailUrl, setThumbnailUrl] = useState(initialThumbnailUrl ?? null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Poll for status when processing
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai/model-status?characterId=${characterId}`)
      if (!res.ok) return

      const data = await res.json()
      setStatus(data.status)
      if (data.modelUrl) setModelUrl(data.modelUrl)
      if (data.thumbnailUrl) setThumbnailUrl(data.thumbnailUrl)
    } catch {
      // Silently ignore poll errors
    }
  }, [characterId])

  useEffect(() => {
    if (status !== 'pending' && status !== 'processing') return

    const interval = setInterval(pollStatus, 3000)
    return () => clearInterval(interval)
  }, [status, pollStatus])

  async function handleGenerate() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/model-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Generation failed')
      }

      setStatus('processing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">3D Modell</CardTitle>
        <CardDescription>
          Generiere ein 3D-Modell deines Charakters mit KI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview */}
        {thumbnailUrl && (
          <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-lg overflow-hidden border border-neutral-700">
            <img
              src={thumbnailUrl}
              alt="3D Model Vorschau"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Status indicator */}
        {(status === 'pending' || status === 'processing') && (
          <div className="space-y-2">
            <p className="text-sm text-neutral-400">
              {status === 'pending' ? 'Prompt wird optimiert...' : '3D Modell wird generiert...'}
            </p>
            <Progress value={status === 'pending' ? 15 : 60} className="h-2" />
          </div>
        )}

        {status === 'succeeded' && (
          <p className="text-sm text-green-400">Modell erfolgreich generiert!</p>
        )}

        {status === 'failed' && (
          <p className="text-sm text-red-400">{error ?? 'Generierung fehlgeschlagen'}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {(status === 'none' || status === 'failed' || status === 'succeeded') && (
            <Button
              onClick={handleGenerate}
              disabled={loading}
              variant={status === 'succeeded' ? 'outline' : 'default'}
              size="sm"
            >
              {loading
                ? 'Wird gestartet...'
                : status === 'succeeded'
                  ? 'Neu generieren'
                  : '3D Modell generieren'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
