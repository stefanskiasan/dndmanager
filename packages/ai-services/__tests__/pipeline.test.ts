import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runPipeline } from '../src/pipeline'

// Mock the fetcher
vi.mock('../src/fetcher', () => ({
  fetchPack: vi.fn().mockResolvedValue({
    packType: 'ancestries',
    items: [
      {
        _id: 'human-123',
        name: 'Human',
        type: 'ancestry',
        system: {
          hp: 8,
          size: 'med',
          speed: 25,
          boosts: { '0': { value: [] }, '1': { value: [] } },
          flaws: {},
          languages: { value: ['common'] },
          traits: { value: ['human', 'humanoid'] },
          description: { value: 'Humans are versatile' },
          source: { value: 'Pathfinder Core Rulebook' },
        },
      },
    ],
    fetchedAt: new Date().toISOString(),
    errors: [],
  }),
}))

describe('runPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs a dry-run pipeline successfully', async () => {
    const result = await runPipeline({
      types: ['ancestries'],
      dryRun: true,
    })

    expect(result.fetchedCounts.ancestries).toBe(1)
    expect(result.parsedCounts.ancestries).toBe(1)
    expect(result.parseErrors.ancestries).toBe(0)
    expect(result.loadResults).toHaveLength(0) // dry run
    expect(result.totalDuration).toBeGreaterThanOrEqual(0)
  })

  it('tracks parse errors', async () => {
    const { fetchPack } = await import('../src/fetcher')
    vi.mocked(fetchPack).mockResolvedValueOnce({
      packType: 'ancestries',
      items: [
        { name: 'Bad', system: null }, // will fail parsing
      ],
      fetchedAt: new Date().toISOString(),
      errors: [],
    })

    const result = await runPipeline({
      types: ['ancestries'],
      dryRun: true,
    })

    expect(result.parsedCounts.ancestries).toBe(0)
    expect(result.parseErrors.ancestries).toBe(1)
  })
})
