import type { CharacterData } from './mapper.js'
import type { AbilityId, ProficiencyRank } from '../types.js'

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

const MAX_ABILITY_SCORE = 30
const MIN_ABILITY_SCORE = 1
const MAX_LEVEL = 20
const PROFICIENCY_RANKS: ProficiencyRank[] = ['untrained', 'trained', 'expert', 'master', 'legendary']

function validateAbilities(data: CharacterData): ValidationError[] {
  const errors: ValidationError[] = []
  const abilities: AbilityId[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

  for (const ability of abilities) {
    const val = data.abilities[ability]
    if (val < MIN_ABILITY_SCORE || val > MAX_ABILITY_SCORE) {
      errors.push({
        field: `abilities.${ability}`,
        message: `${ability} score ${val} is outside valid range (${MIN_ABILITY_SCORE}-${MAX_ABILITY_SCORE})`,
        severity: 'error',
      })
    }
  }

  return errors
}

function validateLevel(data: CharacterData): ValidationError[] {
  if (data.level < 1 || data.level > MAX_LEVEL) {
    return [{
      field: 'level',
      message: `Level ${data.level} is outside valid range (1-${MAX_LEVEL})`,
      severity: 'error',
    }]
  }
  return []
}

function validateProficiencies(data: CharacterData): ValidationError[] {
  const errors: ValidationError[] = []

  // At level 1, master/legendary should not normally appear for saves
  if (data.level <= 2) {
    for (const [save, rank] of Object.entries(data.saves)) {
      if (rank === 'master' || rank === 'legendary') {
        errors.push({
          field: `saves.${save}`,
          message: `${save} proficiency ${rank} is unusual at level ${data.level}`,
          severity: 'warning',
        })
      }
    }
  }

  return errors
}

function validateHitpoints(data: CharacterData): ValidationError[] {
  if (data.hitpoints <= 0) {
    return [{
      field: 'hitpoints',
      message: `HP ${data.hitpoints} must be positive`,
      severity: 'error',
    }]
  }
  return []
}

function validateRequiredStrings(data: CharacterData): ValidationError[] {
  const errors: ValidationError[] = []
  if (!data.class.trim()) errors.push({ field: 'class', message: 'Class is required', severity: 'error' })
  if (!data.ancestry.trim()) errors.push({ field: 'ancestry', message: 'Ancestry is required', severity: 'error' })
  return errors
}

export function validateCharacterData(data: CharacterData): ValidationResult {
  const allIssues = [
    ...validateAbilities(data),
    ...validateLevel(data),
    ...validateProficiencies(data),
    ...validateHitpoints(data),
    ...validateRequiredStrings(data),
  ]

  const errors = allIssues.filter((e) => e.severity === 'error')
  const warnings = allIssues.filter((e) => e.severity === 'warning')

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
