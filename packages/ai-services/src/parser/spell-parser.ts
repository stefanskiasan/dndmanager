import { SpellSchema, type Spell } from '../schemas/spell'
import { stripHtml, toSlug } from './foundry-parser'

export function parseSpell(raw: Record<string, unknown>): Spell | null {
  try {
    const system = raw.system as Record<string, unknown>
    if (!system) return null

    const traits = system.traits as { value: string[]; traditions?: string[] } | undefined
    const traditions = (traits?.traditions ?? system.traditions as { value: string[] } | undefined)
    const description = system.description as { value: string } | undefined
    const source = system.source as { value: string } | undefined
    const time = system.time as { value: string } | undefined
    const components = system.components as Record<string, boolean> | undefined
    const range = system.range as { value: string } | undefined
    const area = system.area as { type: string; value: number } | undefined
    const save = system.save as { value: string; basic: boolean } | undefined
    const damage = system.damage as Record<string, { formula: string; type: string }> | undefined
    const duration = system.duration as { value: string; sustained: boolean } | undefined
    const level = system.level as { value: number } | undefined

    // Parse cast actions
    let castActions: Spell['castActions'] = 2
    const timeValue = time?.value
    if (timeValue === 'free') castActions = 'free'
    else if (timeValue === 'reaction') castActions = 'reaction'
    else if (timeValue) {
      const num = parseInt(timeValue, 10)
      if (num >= 1 && num <= 3) castActions = num as 1 | 2 | 3
    }

    // Parse components
    const spellComponents: Spell['components'] = []
    if (components?.focus) spellComponents.push('focus')
    if (components?.material) spellComponents.push('material')
    if (components?.somatic) spellComponents.push('somatic')
    if (components?.verbal) spellComponents.push('verbal')

    // Parse range to number
    let rangeNum: number | undefined
    if (range?.value) {
      const parsed = parseInt(range.value, 10)
      if (!isNaN(parsed)) rangeNum = parsed
    }

    // Parse damage (take first entry)
    let damageObj: { formula: string; type: string } | undefined
    if (damage) {
      const firstEntry = Object.values(damage)[0]
      if (firstEntry?.formula) {
        damageObj = { formula: firstEntry.formula, type: firstEntry.type ?? 'untyped' }
      }
    }

    // Parse traditions
    const traditionValues = Array.isArray(traditions)
      ? traditions
      : (traditions as { value?: string[] })?.value ?? []
    const validTraditions = traditionValues.filter(
      (t: string) => ['arcane', 'divine', 'occult', 'primal'].includes(t)
    )

    if (validTraditions.length === 0) return null // Skip spells with no tradition (focus spells etc.)

    const data: Record<string, unknown> = {
      id: toSlug(String(raw.name)),
      name: String(raw.name),
      sourceId: String(raw._id ?? toSlug(String(raw.name))),
      level: Number(level?.value ?? 0),
      traditions: validTraditions,
      components: spellComponents,
      castActions,
      traits: traits?.value ?? [],
      description: description?.value ? stripHtml(description.value) : '',
      source: source?.value ?? 'Pathfinder Core Rulebook',
    }

    if (rangeNum !== undefined) data.range = rangeNum
    if (area) data.area = { type: area.type, size: area.value }
    if (save?.value) data.save = { type: save.value, basic: save.basic ?? false }
    if (damageObj) data.damage = damageObj
    if (duration?.value) data.duration = duration.value
    if (duration?.sustained) data.sustained = true

    return SpellSchema.parse(data)
  } catch (err) {
    console.warn(`Failed to parse spell "${raw.name}":`, err instanceof Error ? err.message : err)
    return null
  }
}
