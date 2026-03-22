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

// ─── Items ───────────────────────────────────
export type ItemCategory = 'weapon' | 'armor' | 'consumable' | 'wondrous'

export type WeaponGroup =
  | 'sword' | 'axe' | 'club' | 'flail' | 'hammer'
  | 'knife' | 'polearm' | 'spear' | 'bow' | 'crossbow'
  | 'sling' | 'dart' | 'brawling' | 'shield'

export type ArmorCategory = 'unarmored' | 'light' | 'medium' | 'heavy'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'unique'

export interface Price {
  pp?: number
  gp?: number
  sp?: number
  cp?: number
}

/**
 * Bulk in PF2e: whole numbers (1, 2, 3...) or L (light = 0.1 by convention).
 * We store as a number: 1 = 1 bulk, 0.1 = L, 0 = negligible.
 */
export type BulkValue = number

export interface BaseItem {
  id: string
  name: string
  level: number
  category: ItemCategory
  rarity: Rarity
  price: Price
  bulk: BulkValue
  description: string
  traits: string[]
  quantity: number
  invested?: boolean
}

export interface WeaponItem extends BaseItem {
  category: 'weapon'
  weaponGroup: WeaponGroup
  damage: { dice: number; sides: number; type: DamageType }
  range?: number           // ranged/thrown range in feet
  reload?: number          // 0, 1, 2
  hands: 1 | 2 | '1+'     // 1+: versatile grip
  weaponTraits: string[]   // agile, finesse, reach, etc.
  potencyRune: 0 | 1 | 2 | 3
  strikingRune: 0 | 1 | 2 | 3
  propertyRunes: string[]
}

export interface ArmorItem extends BaseItem {
  category: 'armor'
  armorCategory: ArmorCategory
  acBonus: number
  dexCap: number | null    // null = no cap (unarmored)
  checkPenalty: number
  speedPenalty: number
  strength: number | null  // STR required to ignore speed penalty
  potencyRune: 0 | 1 | 2 | 3
  resiliencyRune: 0 | 1 | 2 | 3
  propertyRunes: string[]
}

export interface ConsumableItem extends BaseItem {
  category: 'consumable'
  consumableType: 'potion' | 'elixir' | 'scroll' | 'talisman' | 'bomb' | 'poison' | 'ammunition' | 'oil' | 'snare' | 'other'
  activationActions?: ActionCost
  effect?: string
}

export interface WondrousItem extends BaseItem {
  category: 'wondrous'
  slot?: 'worn' | 'held' | 'affixed' | 'etched' | null
  activationActions?: ActionCost
  usesPerDay?: number
  usesRemaining?: number
}

export type Item = WeaponItem | ArmorItem | ConsumableItem | WondrousItem

// ─── Currency ────────────────────────────────
export interface Currency {
  pp: number  // platinum
  gp: number  // gold
  sp: number  // silver
  cp: number  // copper
}

// ─── Inventory ───────────────────────────────
export interface Inventory {
  items: Item[]
  currency: Currency
}

// ─── Level-Up ───────────────────────────────

/** XP required to reach the next level (PF2e standard: 1000 XP per level) */
export const XP_PER_LEVEL = 1000

/** Levels at which characters receive ability boosts */
export const ABILITY_BOOST_LEVELS = [5, 10, 15, 20] as const

/** Class HP per level (hit die + CON modifier added each level) */
export interface ClassHPConfig {
  classHitPoints: number  // 6, 8, 10, or 12 depending on class
}

/** Describes what a character gains at a specific level */
export interface LevelUpGains {
  level: number
  hpIncrease: number                      // classHP + CON modifier
  abilityBoosts: number                   // 4 if boost level, else 0
  skillIncreases: number                  // varies by class and level
  featSlots: LevelUpFeatSlot[]            // which feat types are gained
  spellSlotGains?: SpellSlotGain[]        // for casters
}

export interface LevelUpFeatSlot {
  type: 'class' | 'skill' | 'general' | 'ancestry'
  level: number   // max feat level the character can pick
}

export interface SpellSlotGain {
  spellLevel: number
  count: number
}

// ─── Downtime ───────────────────────────────

export type DowntimeActivity = 'earn-income' | 'treat-wounds' | 'craft' | 'retrain'

export interface EarnIncomeResult {
  activity: 'earn-income'
  taskLevel: number
  degree: DegreeOfSuccess
  earned: Price
  daysSpent: number
}

export interface TreatWoundsResult {
  activity: 'treat-wounds'
  dc: number
  degree: DegreeOfSuccess
  hpRestored: number
}

export interface CraftingResult {
  activity: 'craft'
  itemName: string
  itemLevel: number
  dc: number
  degree: DegreeOfSuccess
  daysSpent: number
  costReduction: Price
  completed: boolean
}

export interface RetrainingResult {
  activity: 'retrain'
  replacedFeat: string
  newFeat: string
  daysRequired: number
}

export type DowntimeResult =
  | EarnIncomeResult
  | TreatWoundsResult
  | CraftingResult
  | RetrainingResult
