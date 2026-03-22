#!/usr/bin/env node

import { runPipeline, type PipelineOptions } from './pipeline'
import type { PackType } from './fetcher'

async function main() {
  const args = process.argv.slice(2)

  const options: PipelineOptions = {
    dryRun: args.includes('--dry-run'),
    limit: undefined,
    types: undefined,
  }

  // Parse --limit=N
  const limitArg = args.find((a) => a.startsWith('--limit='))
  if (limitArg) {
    options.limit = parseInt(limitArg.split('=')[1], 10)
  }

  // Parse --types=ancestries,classes
  const typesArg = args.find((a) => a.startsWith('--types='))
  if (typesArg) {
    options.types = typesArg.split('=')[1].split(',') as PackType[]
  }

  // Load Supabase config from environment
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseServiceKey && !options.dryRun) {
    options.loaderConfig = {
      supabaseUrl,
      supabaseServiceKey,
    }
  } else if (!options.dryRun) {
    console.warn('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set — running in dry-run mode')
    options.dryRun = true
  }

  console.log('PF2e Data Import Pipeline')
  console.log('========================')
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`)
  if (options.limit) console.log(`Limit: ${options.limit} items per pack`)
  if (options.types) console.log(`Types: ${options.types.join(', ')}`)
  console.log('')

  try {
    const result = await runPipeline(options)

    console.log('\n========================')
    console.log('Summary:')
    for (const type of Object.keys(result.fetchedCounts)) {
      console.log(`  ${type}: ${result.fetchedCounts[type]} fetched → ${result.parsedCounts[type]} parsed (${result.parseErrors[type]} errors)`)
    }
    console.log(`Total duration: ${result.totalDuration}ms`)
  } catch (err) {
    console.error('Pipeline failed:', err)
    process.exit(1)
  }
}

main()
