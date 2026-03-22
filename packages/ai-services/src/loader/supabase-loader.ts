import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Ancestry } from '../schemas/ancestry'
import type { PF2eClass } from '../schemas/class'
import type { Feat } from '../schemas/feat'
import type { Spell } from '../schemas/spell'
import type { Item } from '../schemas/item'
import type { Monster } from '../schemas/monster'

export interface LoaderConfig {
  supabaseUrl: string
  supabaseServiceKey: string
  batchSize?: number
}

export interface LoadResult {
  table: string
  inserted: number
  updated: number
  errors: string[]
}

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}

export class SupabaseLoader {
  private client: SupabaseClient
  private batchSize: number

  constructor(config: LoaderConfig) {
    this.client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false },
    })
    this.batchSize = config.batchSize ?? 100
  }

  private async upsertBatch(
    table: string,
    items: Record<string, unknown>[],
    conflictColumn: string = 'id'
  ): Promise<LoadResult> {
    const result: LoadResult = { table, inserted: 0, updated: 0, errors: [] }

    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize).map(toSnakeCase)

      const { error, count } = await this.client
        .from(table)
        .upsert(batch, { onConflict: conflictColumn })

      if (error) {
        result.errors.push(`Batch ${Math.floor(i / this.batchSize)}: ${error.message}`)
      } else {
        result.inserted += batch.length
      }
    }

    return result
  }

  async loadAncestries(items: Ancestry[]): Promise<LoadResult> {
    return this.upsertBatch('pf2e_ancestries', items as unknown as Record<string, unknown>[])
  }

  async loadClasses(items: PF2eClass[]): Promise<LoadResult> {
    return this.upsertBatch('pf2e_classes', items as unknown as Record<string, unknown>[])
  }

  async loadFeats(items: Feat[]): Promise<LoadResult> {
    return this.upsertBatch('pf2e_feats', items as unknown as Record<string, unknown>[])
  }

  async loadSpells(items: Spell[]): Promise<LoadResult> {
    return this.upsertBatch('pf2e_spells', items as unknown as Record<string, unknown>[])
  }

  async loadItems(items: Item[]): Promise<LoadResult> {
    return this.upsertBatch('pf2e_items', items as unknown as Record<string, unknown>[])
  }

  async loadMonsters(items: Monster[]): Promise<LoadResult> {
    return this.upsertBatch('pf2e_monsters', items as unknown as Record<string, unknown>[])
  }
}
