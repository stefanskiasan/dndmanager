// ─── Ability Scores ───────────────────────────
export type AbilityId = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface AbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

// ─── Proficiency ──────────────────────────────
export type ProficiencyRank = 'untrained' | 'trained' | 'expert' | 'master' | 'legendary'

// ─── Modifiers ────────────────────────────────
export type ModifierType =
  | 'ability'
  | 'proficiency'
  | 'circumstance'
  | 'status'
  | 'item'
  | 'untyped'

export interface Modifier {
  type: ModifierType
  value: number
  source: string
  enabled?: boolean
}

// ─── Dice ─────────────────────────────────────
export interface DiceRoll {
  count: number
  sides: number
}

export interface RollResult {
  rolls: number[]
  total: number
  formula: string
}

// ─── Checks ───────────────────────────────────
export type DegreeOfSuccess = 'critical-success' | 'success' | 'failure' | 'critical-failure'

export interface CheckResult {
  naturalRoll: number
  totalModifier: number
  total: number
  dc: number
  degree: DegreeOfSuccess
}

// ─── Damage ───────────────────────────────────
export type DamageType =
  | 'bludgeoning' | 'piercing' | 'slashing'
  | 'fire' | 'cold' | 'electricity' | 'acid' | 'sonic'
  | 'positive' | 'negative' | 'force'
  | 'mental' | 'poison'
  | 'bleed' | 'precision'

export interface DamageRoll {
  dice: DiceRoll
  bonus: number
  type: DamageType
}

export interface DamageResult {
  rolls: number[]
  bonus: number
  total: number
  type: DamageType
}

// ─── HP ───────────────────────────────────────
export interface HitPoints {
  current: number
  max: number
  temp: number
}

export interface DyingState {
  dying: number      // 0-4, 4 = dead
  wounded: number    // increases dying threshold
  doomed: number     // reduces max dying
}

// ─── Conditions ───────────────────────────────
export type ConditionId =
  | 'blinded' | 'clumsy' | 'concealed' | 'confused'
  | 'dazzled' | 'deafened' | 'drained' | 'enfeebled'
  | 'fascinated' | 'fatigued' | 'flat-footed' | 'fleeing'
  | 'frightened' | 'grabbed' | 'hidden' | 'immobilized'
  | 'invisible' | 'observed' | 'paralyzed' | 'persistent-damage'
  | 'petrified' | 'prone' | 'quickened' | 'restrained'
  | 'sickened' | 'slowed' | 'stunned' | 'stupefied'
  | 'unconscious' | 'undetected' | 'wounded'

export interface ActiveCondition {
  id: ConditionId
  value: number       // 0 for valueless conditions, 1+ for valued
  source: string
}

// ─── Combat ───────────────────────────────────
export interface AttackParams {
  attackBonus: number
  targetAC: number
  attackNumber: 1 | 2 | 3
  agile: boolean
  modifiers?: Modifier[]
}

export interface AttackResult {
  check: CheckResult
  hit: boolean
  critical: boolean
}

// ─── Actions ──────────────────────────────────
export type ActionCost = 1 | 2 | 3 | 'free' | 'reaction'

export interface ActionContext {
  actionsRemaining: number
  reactionAvailable: boolean
  conditions: ActiveCondition[]
  speed: number         // in feet
  position: [number, number]
}

// ─── Spells ───────────────────────────────────
export type SpellTradition = 'arcane' | 'divine' | 'occult' | 'primal'
export type SpellComponent = 'somatic' | 'verbal' | 'material' | 'focus'

export interface SpellSlot {
  level: number        // 1-10
  max: number
  used: number
}

export interface SpellDefinition {
  id: string
  name: string
  level: number
  traditions: SpellTradition[]
  components: SpellComponent[]
  castActions: ActionCost
  range?: number       // in feet
  area?: { type: 'burst' | 'cone' | 'line' | 'emanation'; size: number }
  save?: { type: 'fortitude' | 'reflex' | 'will'; basic: boolean }
  damage?: {
    formula: string    // e.g. "6d6"
    type: DamageType
    heightenedPerLevel?: string  // e.g. "2d6" per level above base
  }
  description: string
}

export interface SpellcastingState {
  tradition: SpellTradition
  abilityId: AbilityId
  slots: SpellSlot[]
  knownSpells: string[]        // spell IDs
  preparedSpells?: string[]    // for prepared casters
}
