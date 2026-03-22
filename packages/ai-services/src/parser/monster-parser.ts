import { MonsterSchema, type Monster } from '../schemas/monster'
import { stripHtml, toSlug } from './foundry-parser'

const SIZE_MAP: Record<string, string> = {
  tiny: 'tiny',
  sm: 'small',
  med: 'medium',
  lg: 'large',
  huge: 'huge',
  grg: 'gargantuan',
}

export function parseMonster(raw: Record<string, unknown>): Monster | null {
  try {
    const system = raw.system as Record<string, unknown>
    if (!system) return null

    const traits = system.traits as { value: string[]; size?: string } | undefined
    const description = system.description as { value: string } | undefined
    const source = system.source as { value: string } | undefined
    const details = system.details as Record<string, unknown> | undefined
    const attributes = system.attributes as Record<string, unknown> | undefined
    const saves = system.saves as Record<string, { value: number }> | undefined
    const perception = system.perception as { value?: number; mod?: number } | undefined
    const abilities = system.abilities as Record<string, { mod: number }> | undefined

    const hp = attributes?.hp as { value: number; max: number } | undefined
    const ac = attributes?.ac as { value: number } | undefined
    const speed = attributes?.speed as { value: number } | undefined

    // Parse strikes from items
    const items = raw.items as Array<Record<string, unknown>> | undefined
    const strikes = (items ?? [])
      .filter((item) => item.type === 'melee' || item.type === 'ranged')
      .map((item) => {
        const itemSystem = item.system as Record<string, unknown>
        const bonus = itemSystem?.bonus as { value: number } | undefined
        const damageRolls = itemSystem?.damageRolls as Record<string, { damage: string; damageType: string }> | undefined
        const firstDamage = damageRolls ? Object.values(damageRolls)[0] : undefined
        const strikeTraits = itemSystem?.traits as { value: string[] } | undefined

        return {
          name: String(item.name),
          attackBonus: Number(bonus?.value ?? 0),
          damage: firstDamage?.damage ?? '1d4',
          damageType: firstDamage?.damageType ?? 'untyped',
          traits: strikeTraits?.value ?? [],
        }
      })

    const data = {
      id: toSlug(String(raw.name)),
      name: String(raw.name),
      sourceId: String(raw._id ?? toSlug(String(raw.name))),
      level: Number((details?.level as Record<string, unknown>)?.value ?? 0),
      traits: traits?.value ?? [],
      size: (SIZE_MAP[String(traits?.size ?? '')] ?? 'medium') as Monster['size'],
      hp: Number(hp?.max ?? hp?.value ?? 1),
      ac: Number(ac?.value ?? 10),
      fortitude: Number(saves?.fortitude?.value ?? 0),
      reflex: Number(saves?.reflex?.value ?? 0),
      will: Number(saves?.will?.value ?? 0),
      perception: Number(perception?.mod ?? perception?.value ?? 0),
      speed: Number(speed?.value ?? 0),
      abilities: {
        str: Number(abilities?.str?.mod ?? 0),
        dex: Number(abilities?.dex?.mod ?? 0),
        con: Number(abilities?.con?.mod ?? 0),
        int: Number(abilities?.int?.mod ?? 0),
        wis: Number(abilities?.wis?.mod ?? 0),
        cha: Number(abilities?.cha?.mod ?? 0),
      },
      immunities: [],
      resistances: {},
      weaknesses: {},
      strikes,
      description: description?.value ? stripHtml(description.value) : '',
      source: source?.value ?? 'Pathfinder Bestiary',
    }

    return MonsterSchema.parse(data)
  } catch (err) {
    console.warn(`Failed to parse monster "${raw.name}":`, err instanceof Error ? err.message : err)
    return null
  }
}
