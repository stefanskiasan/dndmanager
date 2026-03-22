import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SupabaseLoader } from '../../src/loader/supabase-loader'

// Mock supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null, count: 1 }),
    })),
  })),
}))

describe('SupabaseLoader', () => {
  let loader: SupabaseLoader

  beforeEach(() => {
    loader = new SupabaseLoader({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-key',
      batchSize: 2,
    })
  })

  it('loads ancestries', async () => {
    const items = [
      {
        id: 'human',
        name: 'Human',
        sourceId: 'f-human',
        hp: 8,
        size: 'medium' as const,
        speed: 25,
        abilityBoosts: [{ type: 'free' as const }],
        abilityFlaws: [],
        languages: ['Common'],
        traits: ['human', 'humanoid'],
        features: [],
        description: 'Versatile people',
        source: 'Core Rulebook',
      },
    ]

    const result = await loader.loadAncestries(items)
    expect(result.table).toBe('pf2e_ancestries')
    expect(result.errors).toHaveLength(0)
  })

  it('loads spells', async () => {
    const items = [
      {
        id: 'fireball',
        name: 'Fireball',
        sourceId: 'f-fireball',
        level: 3,
        traditions: ['arcane' as const, 'primal' as const],
        components: ['somatic' as const, 'verbal' as const],
        castActions: 2 as const,
        traits: ['evocation', 'fire'],
        description: 'A burst of fire',
        sustained: false,
        source: 'Core Rulebook',
      },
    ]

    const result = await loader.loadSpells(items)
    expect(result.table).toBe('pf2e_spells')
    expect(result.errors).toHaveLength(0)
  })
})
