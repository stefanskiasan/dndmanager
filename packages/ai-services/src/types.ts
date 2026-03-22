import type { AbilityId } from '@dndmanager/pf2e-engine'

/** A single ancestry/class/background option suggested by the AI */
export interface CharacterOption {
  name: string
  description: string
  reasoning: string // Why this fits the player's concept
}

/** Ability score boost suggestion */
export interface AbilityBoostSuggestion {
  ability: AbilityId
  priority: 'key' | 'high' | 'medium' | 'low'
  reasoning: string
}

/** Full AI suggestion response for character creation */
export interface CharacterSuggestion {
  /** Summary of how the AI interpreted the concept */
  conceptSummary: string

  /** Top 3 ancestry suggestions */
  ancestries: CharacterOption[]

  /** Top 3 class suggestions */
  classes: CharacterOption[]

  /** Top 3 background suggestions */
  backgrounds: CharacterOption[]

  /** Suggested ability score priorities */
  abilityBoosts: AbilityBoostSuggestion[]

  /** Suggested skill trainings */
  skills: CharacterOption[]

  /** Optional character name suggestions if not provided */
  nameSuggestions?: string[]
}

/** Request payload for the character suggestion endpoint */
export interface CharacterSuggestionRequest {
  concept: string
  level?: number
  campaignSetting?: string // optional context about the campaign
}
