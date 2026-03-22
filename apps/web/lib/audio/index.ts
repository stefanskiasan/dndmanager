export { audioManager } from './audio-manager'
export {
  type AudioLayer,
  type AudioTrack,
  type AmbienceCategory,
  type MusicCategory,
  type SfxCategory,
  ALL_TRACKS,
  AMBIENCE_TRACKS,
  MUSIC_TRACKS,
  SFX_TRACKS,
  getTrackById,
  getTracksByLayer,
  getTracksByCategory,
  getRandomTrack,
} from './audio-assets'
export {
  type SceneType,
  type AudioSelection,
  parseSceneType,
  selectAudioForState,
  selectMusicForScene,
} from './audio-scene-map'
export {
  triggerSfxForEvent,
  playDiceRoll,
  playDoorOpen,
  playDoorClose,
  playChestOpen,
  playCoinDrop,
  playLevelUp,
  playMiss,
  playDeath,
} from './sfx-triggers'
