import { ItemSchema, type Item } from '../schemas/item'
import { stripHtml, toSlug } from './foundry-parser'

function mapItemType(foundryType: string): Item['itemType'] | null {
  const map: Record<string, Item['itemType']> = {
    weapon: 'weapon',
    armor: 'armor',
    shield: 'shield',
    consumable: 'consumable',
    equipment: 'equipment',
    treasure: 'treasure',
    backpack: 'equipment',
  }
  return map[foundryType] ?? null
}

export function parseItem(raw: Record<string, unknown>): Item | null {
  try {
    const system = raw.system as Record<string, unknown>
    if (!system) return null

    const foundryType = String(raw.type)
    const itemType = mapItemType(foundryType)
    if (!itemType) return null

    const traits = system.traits as { value: string[] } | undefined
    const description = system.description as { value: string } | undefined
    const source = system.source as { value: string } | undefined
    const level = system.level as { value: number } | undefined
    const price = system.price as { value: { gp?: number; sp?: number; cp?: number } } | undefined
    const bulk = system.bulk as { value: number | string } | undefined

    const data: Record<string, unknown> = {
      id: toSlug(String(raw.name)),
      name: String(raw.name),
      sourceId: String(raw._id ?? toSlug(String(raw.name))),
      itemType,
      level: Number(level?.value ?? 0),
      price: {
        gp: Number(price?.value?.gp ?? 0),
        sp: Number(price?.value?.sp ?? 0),
        cp: Number(price?.value?.cp ?? 0),
      },
      bulk: bulk?.value === 'L' ? 'L' : Number(bulk?.value ?? 0),
      traits: traits?.value ?? [],
      description: description?.value ? stripHtml(description.value) : '',
      source: source?.value ?? 'Pathfinder Core Rulebook',
    }

    // Parse weapon stats
    if (itemType === 'weapon') {
      const weaponDamage = system.damage as { dice: number; die: string; damageType: string } | undefined
      const weaponGroup = system.group as string | undefined
      const weaponCategory = system.category as string | undefined
      const hands = system.usage as { value: string } | undefined

      if (weaponDamage) {
        data.weaponStats = {
          damage: `${weaponDamage.dice}${weaponDamage.die}`,
          damageType: weaponDamage.damageType ?? 'slashing',
          hands: hands?.value?.includes('two') ? '2' : '1',
          group: weaponGroup ?? 'other',
          category: weaponCategory ?? 'simple',
        }
      }
    }

    // Parse armor stats
    if (itemType === 'armor') {
      const acBonus = system.acBonus as number | undefined
      const dexCap = system.dexCap as number | undefined
      const checkPenalty = system.checkPenalty as number | undefined
      const speedPenalty = system.speedPenalty as number | undefined
      const strength = system.strength as number | undefined
      const armorGroup = system.group as string | undefined
      const armorCategory = system.category as string | undefined

      data.armorStats = {
        acBonus: Number(acBonus ?? 0),
        dexCap: dexCap ?? undefined,
        checkPenalty: Number(checkPenalty ?? 0),
        speedPenalty: Number(speedPenalty ?? 0),
        strength: strength ?? undefined,
        group: armorGroup ?? 'other',
        category: armorCategory ?? 'light',
      }
    }

    return ItemSchema.parse(data)
  } catch (err) {
    console.warn(`Failed to parse item "${raw.name}":`, err instanceof Error ? err.message : err)
    return null
  }
}
