// ─── Track Categories ────────────────────────

export type AmbienceCategory =
  | 'dungeon'
  | 'forest'
  | 'tavern'
  | 'cave'
  | 'town'
  | 'ocean'
  | 'temple'
  | 'silence'

export type MusicCategory =
  | 'exploration'
  | 'combat'
  | 'boss'
  | 'victory'
  | 'defeat'
  | 'mystery'
  | 'tavern'
  | 'rest'

export type SfxCategory =
  | 'dice_roll'
  | 'hit_normal'
  | 'hit_critical'
  | 'miss'
  | 'spell_cast'
  | 'spell_fire'
  | 'spell_ice'
  | 'spell_heal'
  | 'door_open'
  | 'door_close'
  | 'chest_open'
  | 'coin_drop'
  | 'level_up'
  | 'encounter_start'
  | 'encounter_end'
  | 'death'
  | 'ui_click'
  | 'ui_hover'

export type AudioCategory = AmbienceCategory | MusicCategory | SfxCategory

// ─── Track Definition ────────────────────────

export type AudioLayer = 'ambience' | 'music' | 'sfx'

export interface AudioTrack {
  id: string
  name: string
  layer: AudioLayer
  category: string
  url: string
  loop: boolean
  volume: number        // default volume 0-1
  fadeDuration: number  // crossfade ms
}

// ─── Asset Library ───────────────────────────
// Placeholder URLs — replace with actual hosted assets.
// Using free RPG audio from OpenGameArt / freesound conventions.
// Format: /audio/{layer}/{filename}.webm
// In production these will be served from a CDN or public/ folder.

const AUDIO_BASE = '/audio'

export const AMBIENCE_TRACKS: AudioTrack[] = [
  {
    id: 'amb-dungeon-01',
    name: 'Dark Dungeon',
    layer: 'ambience',
    category: 'dungeon',
    url: `${AUDIO_BASE}/ambience/dungeon-01.webm`,
    loop: true,
    volume: 0.4,
    fadeDuration: 3000,
  },
  {
    id: 'amb-forest-01',
    name: 'Forest Ambience',
    layer: 'ambience',
    category: 'forest',
    url: `${AUDIO_BASE}/ambience/forest-01.webm`,
    loop: true,
    volume: 0.35,
    fadeDuration: 3000,
  },
  {
    id: 'amb-tavern-01',
    name: 'Bustling Tavern',
    layer: 'ambience',
    category: 'tavern',
    url: `${AUDIO_BASE}/ambience/tavern-01.webm`,
    loop: true,
    volume: 0.3,
    fadeDuration: 2000,
  },
  {
    id: 'amb-cave-01',
    name: 'Dripping Cave',
    layer: 'ambience',
    category: 'cave',
    url: `${AUDIO_BASE}/ambience/cave-01.webm`,
    loop: true,
    volume: 0.35,
    fadeDuration: 3000,
  },
  {
    id: 'amb-town-01',
    name: 'Busy Town',
    layer: 'ambience',
    category: 'town',
    url: `${AUDIO_BASE}/ambience/town-01.webm`,
    loop: true,
    volume: 0.3,
    fadeDuration: 2500,
  },
  {
    id: 'amb-ocean-01',
    name: 'Ocean Waves',
    layer: 'ambience',
    category: 'ocean',
    url: `${AUDIO_BASE}/ambience/ocean-01.webm`,
    loop: true,
    volume: 0.3,
    fadeDuration: 3000,
  },
  {
    id: 'amb-temple-01',
    name: 'Sacred Temple',
    layer: 'ambience',
    category: 'temple',
    url: `${AUDIO_BASE}/ambience/temple-01.webm`,
    loop: true,
    volume: 0.3,
    fadeDuration: 3000,
  },
]

export const MUSIC_TRACKS: AudioTrack[] = [
  {
    id: 'mus-exploration-01',
    name: 'Wandering Theme',
    layer: 'music',
    category: 'exploration',
    url: `${AUDIO_BASE}/music/exploration-01.webm`,
    loop: true,
    volume: 0.3,
    fadeDuration: 2000,
  },
  {
    id: 'mus-exploration-02',
    name: 'Quiet Journey',
    layer: 'music',
    category: 'exploration',
    url: `${AUDIO_BASE}/music/exploration-02.webm`,
    loop: true,
    volume: 0.3,
    fadeDuration: 2000,
  },
  {
    id: 'mus-combat-01',
    name: 'Battle Drums',
    layer: 'music',
    category: 'combat',
    url: `${AUDIO_BASE}/music/combat-01.webm`,
    loop: true,
    volume: 0.4,
    fadeDuration: 1000,
  },
  {
    id: 'mus-combat-02',
    name: 'Clash of Steel',
    layer: 'music',
    category: 'combat',
    url: `${AUDIO_BASE}/music/combat-02.webm`,
    loop: true,
    volume: 0.4,
    fadeDuration: 1000,
  },
  {
    id: 'mus-boss-01',
    name: 'Boss Encounter',
    layer: 'music',
    category: 'boss',
    url: `${AUDIO_BASE}/music/boss-01.webm`,
    loop: true,
    volume: 0.45,
    fadeDuration: 1500,
  },
  {
    id: 'mus-victory-01',
    name: 'Victory Fanfare',
    layer: 'music',
    category: 'victory',
    url: `${AUDIO_BASE}/music/victory-01.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 500,
  },
  {
    id: 'mus-tavern-01',
    name: 'Tavern Jig',
    layer: 'music',
    category: 'tavern',
    url: `${AUDIO_BASE}/music/tavern-01.webm`,
    loop: true,
    volume: 0.25,
    fadeDuration: 2000,
  },
  {
    id: 'mus-rest-01',
    name: 'Campfire Rest',
    layer: 'music',
    category: 'rest',
    url: `${AUDIO_BASE}/music/rest-01.webm`,
    loop: true,
    volume: 0.2,
    fadeDuration: 3000,
  },
  {
    id: 'mus-mystery-01',
    name: 'Dark Mystery',
    layer: 'music',
    category: 'mystery',
    url: `${AUDIO_BASE}/music/mystery-01.webm`,
    loop: true,
    volume: 0.3,
    fadeDuration: 2000,
  },
]

export const SFX_TRACKS: AudioTrack[] = [
  {
    id: 'sfx-dice-roll',
    name: 'Dice Roll',
    layer: 'sfx',
    category: 'dice_roll',
    url: `${AUDIO_BASE}/sfx/dice-roll.webm`,
    loop: false,
    volume: 0.6,
    fadeDuration: 0,
  },
  {
    id: 'sfx-hit-normal',
    name: 'Hit',
    layer: 'sfx',
    category: 'hit_normal',
    url: `${AUDIO_BASE}/sfx/hit-normal.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
  {
    id: 'sfx-hit-critical',
    name: 'Critical Hit',
    layer: 'sfx',
    category: 'hit_critical',
    url: `${AUDIO_BASE}/sfx/hit-critical.webm`,
    loop: false,
    volume: 0.7,
    fadeDuration: 0,
  },
  {
    id: 'sfx-miss',
    name: 'Miss',
    layer: 'sfx',
    category: 'miss',
    url: `${AUDIO_BASE}/sfx/miss.webm`,
    loop: false,
    volume: 0.4,
    fadeDuration: 0,
  },
  {
    id: 'sfx-spell-cast',
    name: 'Spell Cast',
    layer: 'sfx',
    category: 'spell_cast',
    url: `${AUDIO_BASE}/sfx/spell-cast.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
  {
    id: 'sfx-spell-fire',
    name: 'Fire Spell',
    layer: 'sfx',
    category: 'spell_fire',
    url: `${AUDIO_BASE}/sfx/spell-fire.webm`,
    loop: false,
    volume: 0.55,
    fadeDuration: 0,
  },
  {
    id: 'sfx-spell-ice',
    name: 'Ice Spell',
    layer: 'sfx',
    category: 'spell_ice',
    url: `${AUDIO_BASE}/sfx/spell-ice.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
  {
    id: 'sfx-spell-heal',
    name: 'Healing',
    layer: 'sfx',
    category: 'spell_heal',
    url: `${AUDIO_BASE}/sfx/spell-heal.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
  {
    id: 'sfx-door-open',
    name: 'Door Open',
    layer: 'sfx',
    category: 'door_open',
    url: `${AUDIO_BASE}/sfx/door-open.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
  {
    id: 'sfx-door-close',
    name: 'Door Close',
    layer: 'sfx',
    category: 'door_close',
    url: `${AUDIO_BASE}/sfx/door-close.webm`,
    loop: false,
    volume: 0.45,
    fadeDuration: 0,
  },
  {
    id: 'sfx-chest-open',
    name: 'Chest Open',
    layer: 'sfx',
    category: 'chest_open',
    url: `${AUDIO_BASE}/sfx/chest-open.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
  {
    id: 'sfx-coin-drop',
    name: 'Coin Drop',
    layer: 'sfx',
    category: 'coin_drop',
    url: `${AUDIO_BASE}/sfx/coin-drop.webm`,
    loop: false,
    volume: 0.4,
    fadeDuration: 0,
  },
  {
    id: 'sfx-level-up',
    name: 'Level Up',
    layer: 'sfx',
    category: 'level_up',
    url: `${AUDIO_BASE}/sfx/level-up.webm`,
    loop: false,
    volume: 0.6,
    fadeDuration: 0,
  },
  {
    id: 'sfx-encounter-start',
    name: 'Encounter Start',
    layer: 'sfx',
    category: 'encounter_start',
    url: `${AUDIO_BASE}/sfx/encounter-start.webm`,
    loop: false,
    volume: 0.6,
    fadeDuration: 0,
  },
  {
    id: 'sfx-encounter-end',
    name: 'Encounter End',
    layer: 'sfx',
    category: 'encounter_end',
    url: `${AUDIO_BASE}/sfx/encounter-end.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
  {
    id: 'sfx-death',
    name: 'Death',
    layer: 'sfx',
    category: 'death',
    url: `${AUDIO_BASE}/sfx/death.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
]

// ─── Lookup Helpers ──────────────────────────

export const ALL_TRACKS: AudioTrack[] = [
  ...AMBIENCE_TRACKS,
  ...MUSIC_TRACKS,
  ...SFX_TRACKS,
]

export function getTrackById(id: string): AudioTrack | undefined {
  return ALL_TRACKS.find((t) => t.id === id)
}

export function getTracksByLayer(layer: AudioLayer): AudioTrack[] {
  return ALL_TRACKS.filter((t) => t.layer === layer)
}

export function getTracksByCategory(category: string): AudioTrack[] {
  return ALL_TRACKS.filter((t) => t.category === category)
}

export function getRandomTrack(layer: AudioLayer, category: string): AudioTrack | undefined {
  const tracks = ALL_TRACKS.filter((t) => t.layer === layer && t.category === category)
  if (tracks.length === 0) return undefined
  return tracks[Math.floor(Math.random() * tracks.length)]
}
