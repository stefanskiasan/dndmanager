import type { SenseType, LightLevel, Visibility } from './types.js'

export function getVisionRange(sense: SenseType, light: LightLevel, baseRange: number): number {
  switch (sense) {
    case 'darkvision':
      return baseRange
    case 'low-light':
      return light === 'darkness' ? 0 : baseRange
    case 'normal':
      if (light === 'bright') return baseRange
      if (light === 'dim') return Math.floor(baseRange / 2)
      return 0
  }
}

export function canSeeInLight(sense: SenseType, light: LightLevel): Visibility {
  switch (sense) {
    case 'darkvision':
      return light === 'darkness' ? 'dim' : 'visible'
    case 'low-light':
      if (light === 'bright') return 'visible'
      if (light === 'dim') return 'visible'
      return 'hidden'
    case 'normal':
      if (light === 'bright') return 'visible'
      if (light === 'dim') return 'dim'
      return 'hidden'
  }
}
