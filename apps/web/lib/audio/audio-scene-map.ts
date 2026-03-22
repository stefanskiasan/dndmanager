import type { GameMode } from '@dndmanager/game-runtime'
import type { AmbienceCategory, MusicCategory } from './audio-assets'
import { getRandomTrack } from './audio-assets'

// ─── Room / Scene Types ──────────────────────
// These map to the mapTiles string in game-store
// or can be set explicitly by the GM.

export type SceneType =
  | 'dungeon'
  | 'cave'
  | 'forest'
  | 'tavern'
  | 'town'
  | 'ocean'
  | 'temple'
  | 'generic'

// ─── Mapping Tables ─────────────────────────

/** Map a scene type to its ambience category */
const SCENE_TO_AMBIENCE: Record<SceneType, AmbienceCategory> = {
  dungeon: 'dungeon',
  cave: 'cave',
  forest: 'forest',
  tavern: 'tavern',
  town: 'town',
  ocean: 'ocean',
  temple: 'temple',
  generic: 'dungeon',
}

/** Map game mode to music category */
const MODE_TO_MUSIC: Record<GameMode, MusicCategory> = {
  exploration: 'exploration',
  encounter: 'combat',
  downtime: 'rest',
}

// ─── Map Tile String to Scene Type ──────────

/** Best-effort parse of mapTiles string to a scene type */
export function parseSceneType(mapTiles: string): SceneType {
  const lower = mapTiles.toLowerCase()

  if (lower.includes('cave') || lower.includes('stone')) return 'cave'
  if (lower.includes('dungeon') || lower.includes('crypt')) return 'dungeon'
  if (lower.includes('forest') || lower.includes('grass') || lower.includes('tree')) return 'forest'
  if (lower.includes('tavern') || lower.includes('inn') || lower.includes('wood')) return 'tavern'
  if (lower.includes('town') || lower.includes('city') || lower.includes('cobble')) return 'town'
  if (lower.includes('ocean') || lower.includes('water') || lower.includes('ship')) return 'ocean'
  if (lower.includes('temple') || lower.includes('church') || lower.includes('shrine')) return 'temple'

  return 'generic'
}

// ─── Selection Functions ─────────────────────

export interface AudioSelection {
  ambienceTrackId: string | null
  musicTrackId: string | null
}

/**
 * Given the current game mode and scene/map info, pick appropriate tracks.
 */
export function selectAudioForState(
  mode: GameMode,
  mapTiles: string,
  options?: {
    isBoss?: boolean
  }
): AudioSelection {
  const scene = parseSceneType(mapTiles)

  // Ambience: based on scene, stays the same during combat
  const ambienceCategory = SCENE_TO_AMBIENCE[scene]
  const ambienceTrack = getRandomTrack('ambience', ambienceCategory)

  // Music: based on mode (with boss override)
  let musicCategory = MODE_TO_MUSIC[mode]
  if (mode === 'encounter' && options?.isBoss) {
    musicCategory = 'boss'
  }
  const musicTrack = getRandomTrack('music', musicCategory)

  return {
    ambienceTrackId: ambienceTrack?.id ?? null,
    musicTrackId: musicTrack?.id ?? null,
  }
}

/**
 * Get the music category override for a specific scene type + mode combo.
 * E.g. tavern in exploration mode should play tavern music, not generic exploration.
 */
export function selectMusicForScene(mode: GameMode, scene: SceneType): MusicCategory {
  // Scene-specific music overrides during exploration
  if (mode === 'exploration' || mode === 'downtime') {
    if (scene === 'tavern') return 'tavern'
    if (scene === 'temple') return 'mystery'
  }

  return MODE_TO_MUSIC[mode]
}
