import { fetchPack, type PackType } from './fetcher'
import { parseAncestry } from './parser/ancestry-parser'
import { parseClass } from './parser/class-parser'
import { parseFeat } from './parser/feat-parser'
import { parseSpell } from './parser/spell-parser'
import { parseItem } from './parser/item-parser'
import { parseMonster } from './parser/monster-parser'
import { SupabaseLoader, type LoaderConfig, type LoadResult } from './loader'

export interface PipelineOptions {
  types?: PackType[]
  limit?: number
  dryRun?: boolean
  loaderConfig?: LoaderConfig
}

export interface PipelineResult {
  fetchedCounts: Record<string, number>
  parsedCounts: Record<string, number>
  parseErrors: Record<string, number>
  loadResults: LoadResult[]
  totalDuration: number
}

type ParserFn = (raw: Record<string, unknown>) => unknown | null

const PARSERS: Record<PackType, ParserFn> = {
  ancestries: parseAncestry,
  classes: parseClass,
  feats: parseFeat,
  spells: parseSpell,
  equipment: parseItem,
  bestiary: parseMonster,
}

const TABLE_LOADERS: Record<PackType, string> = {
  ancestries: 'loadAncestries',
  classes: 'loadClasses',
  feats: 'loadFeats',
  spells: 'loadSpells',
  equipment: 'loadItems',
  bestiary: 'loadMonsters',
}

export async function runPipeline(options: PipelineOptions = {}): Promise<PipelineResult> {
  const start = Date.now()
  const types = options.types ?? ['ancestries', 'classes', 'feats', 'spells', 'equipment', 'bestiary']

  const result: PipelineResult = {
    fetchedCounts: {},
    parsedCounts: {},
    parseErrors: {},
    loadResults: [],
    totalDuration: 0,
  }

  // Stage 1: Fetch
  console.log('\n=== Stage 1: Fetch ===')
  const fetchResults = new Map<PackType, unknown[]>()

  for (const type of types) {
    console.log(`Fetching ${type}...`)
    const fetchResult = await fetchPack(type, { limit: options.limit })
    fetchResults.set(type, fetchResult.items)
    result.fetchedCounts[type] = fetchResult.items.length

    if (fetchResult.errors.length > 0) {
      console.warn(`  Fetch errors for ${type}:`, fetchResult.errors)
    }
    console.log(`  → ${fetchResult.items.length} items fetched`)
  }

  // Stage 2: Parse + Validate (Zod validation happens inside parsers)
  console.log('\n=== Stage 2: Parse & Validate ===')
  const parsedData = new Map<PackType, unknown[]>()

  for (const type of types) {
    const rawItems = fetchResults.get(type) ?? []
    const parser = PARSERS[type]
    const parsed: unknown[] = []
    let errors = 0

    for (const raw of rawItems) {
      const item = parser(raw as Record<string, unknown>)
      if (item) {
        parsed.push(item)
      } else {
        errors++
      }
    }

    parsedData.set(type, parsed)
    result.parsedCounts[type] = parsed.length
    result.parseErrors[type] = errors
    console.log(`  ${type}: ${parsed.length} parsed, ${errors} errors`)
  }

  // Stage 3: Load into database
  if (!options.dryRun && options.loaderConfig) {
    console.log('\n=== Stage 3: Load ===')
    const loader = new SupabaseLoader(options.loaderConfig)

    for (const type of types) {
      const items = parsedData.get(type) ?? []
      if (items.length === 0) continue

      const methodName = TABLE_LOADERS[type] as keyof SupabaseLoader
      const loadFn = loader[methodName] as (items: unknown[]) => Promise<LoadResult>
      const loadResult = await loadFn.call(loader, items)
      result.loadResults.push(loadResult)
      console.log(`  ${type}: ${loadResult.inserted} loaded, ${loadResult.errors.length} errors`)
    }
  } else if (options.dryRun) {
    console.log('\n=== Stage 3: Load (DRY RUN — skipped) ===')
  } else {
    console.log('\n=== Stage 3: Load (skipped — no loader config) ===')
  }

  result.totalDuration = Date.now() - start
  console.log(`\nPipeline completed in ${result.totalDuration}ms`)

  return result
}
