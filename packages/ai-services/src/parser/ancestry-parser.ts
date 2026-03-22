import { AncestrySchema, type Ancestry } from '../schemas/ancestry'
import { stripHtml, toSlug } from './foundry-parser'

/**
 * Parses a Foundry VTT ancestry JSON object into our Ancestry schema.
 *
 * Foundry ancestry structure (simplified):
 * {
 *   name: "Human",
 *   type: "ancestry",
 *   system: {
 *     hp: 8,
 *     size: "med",
 *     speed: 25,
 *     boosts: { "0": { value: ["str"] }, "1": { value: [] } },
 *     flaws: { ... },
 *     languages: { value: ["common"] },
 *     traits: { value: ["human", "humanoid"] },
 *     description: { value: "<p>...</p>" },
 *     source: { value: "Pathfinder Core Rulebook" }
 *   }
 * }
 */

const SIZE_MAP: Record<string, string> = {
  tiny: 'tiny',
  sm: 'small',
  med: 'medium',
  lg: 'large',
}

export function parseAncestry(raw: Record<string, unknown>): Ancestry | null {
  try {
    const system = raw.system as Record<string, unknown>
    if (!system) return null

    const boosts = system.boosts as Record<string, { value: string[] }> | undefined
    const flaws = system.flaws as Record<string, { value: string[] }> | undefined
    const languages = system.languages as { value: string[] } | undefined
    const traits = system.traits as { value: string[] } | undefined
    const description = system.description as { value: string } | undefined
    const source = system.source as { value: string } | undefined

    const abilityBoosts = boosts
      ? Object.values(boosts).map((b) => {
          if (b.value.length === 0) return { type: 'free' as const }
          return { type: 'fixed' as const, ability: b.value[0] as Ancestry['abilityBoosts'][0]['ability'] }
        })
      : [{ type: 'free' as const }]

    const abilityFlaws = flaws
      ? Object.values(flaws)
          .filter((f) => f.value.length > 0)
          .map((f) => ({ type: 'fixed' as const, ability: f.value[0] as Ancestry['abilityBoosts'][0]['ability'] }))
      : []

    const data = {
      id: toSlug(String(raw.name)),
      name: String(raw.name),
      sourceId: String(raw._id ?? toSlug(String(raw.name))),
      hp: Number(system.hp),
      size: SIZE_MAP[String(system.size)] ?? 'medium',
      speed: Number(system.speed),
      abilityBoosts,
      abilityFlaws,
      languages: languages?.value ?? ['Common'],
      traits: traits?.value ?? [],
      features: [],
      description: description?.value ? stripHtml(description.value) : '',
      source: source?.value ?? 'Pathfinder Core Rulebook',
    }

    return AncestrySchema.parse(data)
  } catch (err) {
    console.warn(`Failed to parse ancestry "${raw.name}":`, err instanceof Error ? err.message : err)
    return null
  }
}
