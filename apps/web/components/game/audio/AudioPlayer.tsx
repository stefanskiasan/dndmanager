'use client'

import { useState } from 'react'
import { Volume2, VolumeX, Music, TreePine, Swords, ChevronUp, ChevronDown } from 'lucide-react'
import { useAudioStore } from '@/lib/stores/audio-store'
import type { AudioLayer } from '@/lib/audio/audio-assets'
import { getTrackById } from '@/lib/audio/audio-assets'

// ─── Layer Config ────────────────────────────

const LAYER_CONFIG: {
  layer: AudioLayer
  label: string
  icon: typeof Volume2
}[] = [
  { layer: 'music', label: 'Musik', icon: Music },
  { layer: 'ambience', label: 'Ambiente', icon: TreePine },
  { layer: 'sfx', label: 'Effekte', icon: Swords },
]

// ─── Volume Slider ───────────────────────────

function VolumeSlider({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={Math.round(value * 100)}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      className="h-1 w-full cursor-pointer appearance-none rounded-full bg-neutral-700 accent-amber-400"
      aria-label={label}
    />
  )
}

// ─── Layer Row ───────────────────────────────

function LayerRow({
  layer,
  label,
  icon: Icon,
}: {
  layer: AudioLayer
  label: string
  icon: typeof Volume2
}) {
  const volume = useAudioStore((s) => s.volumes[layer])
  const muted = useAudioStore((s) => s.muted[layer])
  const trackId = useAudioStore((s) => s.layers[layer].trackId)
  const setVolume = useAudioStore((s) => s.setVolume)
  const toggleMute = useAudioStore((s) => s.toggleMute)

  const track = trackId ? getTrackById(trackId) : null

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => toggleMute(layer)}
        className="flex h-6 w-6 items-center justify-center text-neutral-400 hover:text-white"
        title={muted ? `${label} unmuten` : `${label} muten`}
      >
        {muted ? <VolumeX size={14} /> : <Icon size={14} />}
      </button>
      <div className="flex-1">
        <div className="mb-0.5 flex items-center justify-between">
          <span className="text-[10px] text-neutral-500">{label}</span>
          {track && (
            <span className="truncate text-[10px] text-neutral-600">{track.name}</span>
          )}
        </div>
        <VolumeSlider
          value={muted ? 0 : volume}
          onChange={(v) => setVolume(layer, v)}
          label={`${label} Lautstaerke`}
        />
      </div>
      <span className="w-7 text-right text-[10px] text-neutral-600">
        {muted ? '0' : Math.round(volume * 100)}
      </span>
    </div>
  )
}

// ─── Main Component ──────────────────────────

export function AudioPlayer() {
  const [expanded, setExpanded] = useState(false)
  const masterVolume = useAudioStore((s) => s.masterVolume)
  const masterMuted = useAudioStore((s) => s.masterMuted)
  const setMasterVolume = useAudioStore((s) => s.setMasterVolume)
  const toggleMasterMute = useAudioStore((s) => s.toggleMasterMute)

  return (
    <div className="absolute right-4 top-14 z-20 w-56">
      {/* Toggle Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-t-lg bg-neutral-900/90 px-3 py-1.5 text-xs text-neutral-300 backdrop-blur-sm hover:bg-neutral-800/90"
      >
        <div className="flex items-center gap-2">
          {masterMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          <span>Audio</span>
        </div>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* Panel */}
      {expanded && (
        <div className="rounded-b-lg bg-neutral-900/90 px-3 pb-3 pt-1 backdrop-blur-sm">
          {/* Master Volume */}
          <div className="mb-3 flex items-center gap-2">
            <button
              onClick={toggleMasterMute}
              className="flex h-6 w-6 items-center justify-center text-neutral-400 hover:text-white"
              title={masterMuted ? 'Ton an' : 'Ton aus'}
            >
              {masterMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <div className="flex-1">
              <span className="mb-0.5 block text-[10px] text-neutral-500">Master</span>
              <VolumeSlider
                value={masterMuted ? 0 : masterVolume}
                onChange={setMasterVolume}
                label="Master Lautstaerke"
              />
            </div>
            <span className="w-7 text-right text-[10px] text-neutral-600">
              {masterMuted ? '0' : Math.round(masterVolume * 100)}
            </span>
          </div>

          {/* Divider */}
          <div className="mb-2 border-t border-neutral-800" />

          {/* Per-Layer Controls */}
          <div className="space-y-2">
            {LAYER_CONFIG.map(({ layer, label, icon }) => (
              <LayerRow key={layer} layer={layer} label={label} icon={icon} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
