import { ClassSchema, type PF2eClass } from '../schemas/class'
import { stripHtml, toSlug } from './foundry-parser'

const PROF_MAP: Record<number, string> = {
  0: 'untrained',
  1: 'trained',
  2: 'expert',
  3: 'master',
  4: 'legendary',
}

export function parseClass(raw: Record<string, unknown>): PF2eClass | null {
  try {
    const system = raw.system as Record<string, unknown>
    if (!system) return null

    const keyAbility = system.keyAbility as { value: string[] } | undefined
    const description = system.description as { value: string } | undefined
    const source = system.source as { value: string } | undefined
    const defenses = system.defenses as Record<string, unknown> | undefined
    const perception = system.perception as unknown

    const savesRaw = defenses as Record<string, { rank?: number }> | undefined
    const attacksRaw = system.attacks as Record<string, { rank?: number }> | undefined

    const data = {
      id: toSlug(String(raw.name)),
      name: String(raw.name),
      sourceId: String(raw._id ?? toSlug(String(raw.name))),
      hp: Number(system.hp),
      keyAbility: (keyAbility?.value ?? ['str']) as PF2eClass['keyAbility'],
      proficiencies: [],
      skillTrainedCount: Number(system.trainedSkills && typeof system.trainedSkills === 'object'
        ? (system.trainedSkills as Record<string, unknown>).additional ?? 0
        : 0),
      attackProficiency: (PROF_MAP[Number(attacksRaw?.simple?.rank ?? 1)] ?? 'trained') as PF2eClass['attackProficiency'],
      defenseProficiency: (PROF_MAP[Number(savesRaw?.unarmored?.rank ?? 1)] ?? 'trained') as PF2eClass['defenseProficiency'],
      perception: (PROF_MAP[Number(typeof perception === 'object' && perception !== null ? (perception as Record<string, unknown>).rank : 1)] ?? 'trained') as PF2eClass['perception'],
      fortitude: (PROF_MAP[Number(savesRaw?.fortitude?.rank ?? 1)] ?? 'trained') as PF2eClass['fortitude'],
      reflex: (PROF_MAP[Number(savesRaw?.reflex?.rank ?? 1)] ?? 'trained') as PF2eClass['reflex'],
      will: (PROF_MAP[Number(savesRaw?.will?.rank ?? 1)] ?? 'trained') as PF2eClass['will'],
      description: description?.value ? stripHtml(description.value) : '',
      source: source?.value ?? 'Pathfinder Core Rulebook',
    }

    return ClassSchema.parse(data)
  } catch (err) {
    console.warn(`Failed to parse class "${raw.name}":`, err instanceof Error ? err.message : err)
    return null
  }
}
