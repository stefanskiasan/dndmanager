'use client'

import { useEffect, useRef } from 'react'
import { useGameStore } from '@/lib/stores/game-store'
import { useAudioStore } from '@/lib/stores/audio-store'
import { audioManager } from '@/lib/audio/audio-manager'
import { selectAudioForState } from '@/lib/audio/audio-scene-map'
import { triggerSfxForEvent } from '@/lib/audio/sfx-triggers'
import type { GameMode } from '@dndmanager/game-runtime'

/**
 * AudioProvider — invisible component that wires the audio system
 * to the game runtime. Mount once inside the game view.
 *
 * Responsibilities:
 * 1. On mode change -> switch music (exploration <-> combat)
 * 2. On map change -> switch ambience
 * 3. On volume/mute change -> sync Howl volumes
 * 4. On tab visibility -> pause/resume
 * 5. Cleanup on unmount
 */
export function AudioProvider() {
  const prevModeRef = useRef<GameMode | null>(null)
  const prevMapRef = useRef<string | null>(null)

  // ─── Subscribe to game state for auto-switching ───

  useEffect(() => {
    const unsubGame = useGameStore.subscribe((state) => {
      const { mode, mapTiles } = state
      const prevMode = prevModeRef.current
      const prevMap = prevMapRef.current

      const modeChanged = prevMode !== null && prevMode !== mode
      const mapChanged = prevMap !== null && prevMap !== mapTiles

      // On mode change: switch music, play transition SFX
      if (modeChanged) {
        if (mode === 'encounter') {
          triggerSfxForEvent('encounter_start')
        } else if (prevMode === 'encounter') {
          triggerSfxForEvent('encounter_end')
        }

        const selection = selectAudioForState(mode, mapTiles)
        if (selection.musicTrackId) {
          audioManager.play('music', selection.musicTrackId)
        }
      }

      // On map change (or first load): switch ambience
      if (mapChanged || prevMap === null) {
        const selection = selectAudioForState(mode, mapTiles)
        if (selection.ambienceTrackId) {
          audioManager.play('ambience', selection.ambienceTrackId)
        }
      }

      // First load: start both layers
      if (prevMode === null) {
        const selection = selectAudioForState(mode, mapTiles)
        if (selection.ambienceTrackId) {
          audioManager.play('ambience', selection.ambienceTrackId)
        }
        if (selection.musicTrackId) {
          audioManager.play('music', selection.musicTrackId)
        }
      }

      prevModeRef.current = mode
      prevMapRef.current = mapTiles
    })

    return () => unsubGame()
  }, [])

  // ─── Subscribe to audio store for volume sync ───

  useEffect(() => {
    const unsubAudio = useAudioStore.subscribe(() => {
      audioManager.syncVolumes()
    })

    return () => unsubAudio()
  }, [])

  // ─── Tab visibility: pause when hidden ───

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        audioManager.pauseAll()
      } else {
        audioManager.resumeAll()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // ─── Cleanup on unmount ───

  useEffect(() => {
    return () => {
      audioManager.destroy()
    }
  }, [])

  // Renders nothing — pure side-effect component
  return null
}
