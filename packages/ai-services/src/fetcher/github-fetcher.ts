/**
 * Fetches PF2e data pack JSON files from the Foundry VTT pf2e GitHub repository.
 * Uses the GitHub raw content URLs to download JSON pack data.
 *
 * Source: https://github.com/foundryvtt/pf2e
 * Pack data: packs/ directory, organized by type
 */

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/foundryvtt/pf2e/master'

export type PackType = 'ancestries' | 'classes' | 'feats' | 'spells' | 'equipment' | 'bestiary'

/** Maps our pack types to the Foundry repo paths */
const PACK_PATHS: Record<PackType, string> = {
  ancestries: 'packs/ancestries',
  classes: 'packs/classes',
  feats: 'packs/feats',
  spells: 'packs/spells',
  equipment: 'packs/equipment',
  bestiary: 'packs/pathfinder-bestiary',
}

export interface FetchResult {
  packType: PackType
  items: unknown[]
  fetchedAt: string
  errors: string[]
}

/**
 * Fetches the directory listing from GitHub API to discover JSON files,
 * then downloads each file.
 */
export async function fetchPack(
  packType: PackType,
  options?: { signal?: AbortSignal; limit?: number }
): Promise<FetchResult> {
  const errors: string[] = []
  const path = PACK_PATHS[packType]

  // Use GitHub API to list directory contents
  const apiUrl = `https://api.github.com/repos/foundryvtt/pf2e/contents/${path}`
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'dndmanager-import',
  }

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const dirResponse = await fetch(apiUrl, {
    headers,
    signal: options?.signal,
  })

  if (!dirResponse.ok) {
    throw new Error(`Failed to list pack directory ${path}: ${dirResponse.status} ${dirResponse.statusText}`)
  }

  const dirEntries = (await dirResponse.json()) as Array<{
    name: string
    download_url: string
  }>

  const jsonFiles = dirEntries
    .filter((e) => e.name.endsWith('.json'))
    .slice(0, options?.limit)

  const items: unknown[] = []

  for (const file of jsonFiles) {
    try {
      const res = await fetch(file.download_url, { signal: options?.signal })
      if (!res.ok) {
        errors.push(`Failed to fetch ${file.name}: ${res.status}`)
        continue
      }
      const data = await res.json()
      items.push(data)
    } catch (err) {
      errors.push(`Error fetching ${file.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return {
    packType,
    items,
    fetchedAt: new Date().toISOString(),
    errors,
  }
}

/**
 * Fetches all pack types. Returns results keyed by pack type.
 */
export async function fetchAllPacks(
  options?: { signal?: AbortSignal; limit?: number; types?: PackType[] }
): Promise<Map<PackType, FetchResult>> {
  const types = options?.types ?? (['ancestries', 'classes', 'feats', 'spells', 'equipment', 'bestiary'] as PackType[])
  const results = new Map<PackType, FetchResult>()

  for (const type of types) {
    console.log(`Fetching ${type}...`)
    const result = await fetchPack(type, options)
    results.set(type, result)
    console.log(`  → ${result.items.length} items, ${result.errors.length} errors`)
  }

  return results
}
