import { FeatSchema, type Feat } from '../schemas/feat'
import { stripHtml, toSlug } from './foundry-parser'

const ACTION_MAP: Record<string, string> = {
  free: 'free',
  reaction: 'reaction',
  1: '1',
  2: '2',
  3: '3',
}

const CLASS_NAMES = [
  'alchemist', 'barbarian', 'bard', 'champion', 'cleric', 'druid',
  'fighter', 'gunslinger', 'inventor', 'investigator', 'kineticist',
  'magus', 'monk', 'oracle', 'psychic', 'ranger', 'rogue', 'sorcerer',
  'summoner', 'swashbuckler', 'thaumaturge', 'witch', 'wizard',
]

function parseFeatType(traits: string[]): Feat['featType'] {
  if (traits.includes('ancestry')) return 'ancestry'
  if (traits.includes('class')) return 'class'
  if (traits.some((t) => CLASS_NAMES.includes(t))) return 'class'
  if (traits.includes('skill')) return 'skill'
  if (traits.includes('archetype')) return 'archetype'
  return 'general'
}

export function parseFeat(raw: Record<string, unknown>): Feat | null {
  try {
    const system = raw.system as Record<string, unknown>
    if (!system) return null

    const traits = system.traits as { value: string[] } | undefined
    const description = system.description as { value: string } | undefined
    const source = system.source as { value: string } | undefined
    const actions = system.actionType as { value: string } | undefined
    const actionCount = system.actions as { value: number | string | null } | undefined
    const level = system.level as { value: number } | undefined
    const prereqs = system.prerequisites as { value: Array<{ value: string }> } | undefined

    const traitValues = traits?.value ?? []
    let actionCost: string = 'passive'
    const actionType = actions?.value

    if (actionType === 'free') {
      actionCost = 'free'
    } else if (actionType === 'reaction') {
      actionCost = 'reaction'
    } else if (actionType === 'action' && actionCount?.value) {
      actionCost = ACTION_MAP[String(actionCount.value)] ?? '1'
    }

    const data = {
      id: toSlug(String(raw.name)),
      name: String(raw.name),
      sourceId: String(raw._id ?? toSlug(String(raw.name))),
      level: Number(level?.value ?? 0),
      featType: parseFeatType(traitValues),
      actionCost,
      traits: traitValues,
      prerequisites: prereqs?.value?.map((p) => ({
        type: 'other' as const,
        value: p.value,
      })) ?? [],
      description: description?.value ? stripHtml(description.value) : '',
      source: source?.value ?? 'Pathfinder Core Rulebook',
    }

    return FeatSchema.parse(data)
  } catch (err) {
    console.warn(`Failed to parse feat "${raw.name}":`, err instanceof Error ? err.message : err)
    return null
  }
}
