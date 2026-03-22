import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPack } from '../../src/fetcher/github-fetcher'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('fetchPack', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches JSON files from GitHub API', async () => {
    // Mock directory listing
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { name: 'human.json', download_url: 'https://raw.example.com/human.json' },
        { name: 'elf.json', download_url: 'https://raw.example.com/elf.json' },
      ],
    })

    // Mock file downloads
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Human', type: 'ancestry' }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Elf', type: 'ancestry' }),
    })

    const result = await fetchPack('ancestries')

    expect(result.packType).toBe('ancestries')
    expect(result.items).toHaveLength(2)
    expect(result.errors).toHaveLength(0)
    expect(result.fetchedAt).toBeDefined()
  })

  it('respects limit option', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { name: 'a.json', download_url: 'https://example.com/a.json' },
        { name: 'b.json', download_url: 'https://example.com/b.json' },
        { name: 'c.json', download_url: 'https://example.com/c.json' },
      ],
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'A' }),
    })

    const result = await fetchPack('ancestries', { limit: 1 })
    expect(result.items).toHaveLength(1)
  })

  it('collects errors without throwing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { name: 'good.json', download_url: 'https://example.com/good.json' },
        { name: 'bad.json', download_url: 'https://example.com/bad.json' },
      ],
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Good' }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    const result = await fetchPack('ancestries')
    expect(result.items).toHaveLength(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('bad.json')
  })

  it('throws if directory listing fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    })

    await expect(fetchPack('ancestries')).rejects.toThrow('Failed to list pack directory')
  })
})
