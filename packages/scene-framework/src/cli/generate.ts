#!/usr/bin/env tsx
import { parseArgs } from 'node:util'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { generateDungeon } from '../generators/dungeon-generator.js'
import { generateWilderness } from '../generators/wilderness-generator.js'
import { validateScenario } from '../validator.js'

// Filter out bare '--' from argv (pnpm forwards it)
const argv = process.argv.slice(2).filter((a) => a !== '--')

const { values } = parseArgs({
  args: argv,
  options: {
    type: { type: 'string', short: 't', default: 'dungeon' },
    rooms: { type: 'string', short: 'r', default: '5' },
    level: { type: 'string', short: 'l', default: '3' },
    seed: { type: 'string', short: 's', default: String(Date.now()) },
    output: { type: 'string', short: 'o', default: '' },
    template: { type: 'string', default: 'forest' },
    theme: { type: 'string', default: 'stone' },
    party: { type: 'string', short: 'p', default: '4' },
    difficulty: { type: 'string', short: 'd', default: 'moderate' },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: true,
})

if (values.help) {
  console.log(`
Usage: pnpm scenario:generate [options]

Options:
  -t, --type <type>         Generator type: dungeon | forest | cave | ruin | swamp | mountain | desert
  -r, --rooms <count>       Number of rooms / points of interest (default: 5)
  -l, --level <level>       Party level (default: 3)
  -s, --seed <seed>         Random seed for deterministic generation
  -o, --output <path>       Output file path (default: stdout as JSON)
  -p, --party <size>        Party size (default: 4)
  -d, --difficulty <diff>   Base difficulty: trivial | low | moderate | severe | extreme
  --template <template>     Wilderness template (forest, cave, ruin, swamp, mountain, desert)
  --theme <theme>           Dungeon theme (stone, cave, crypt, sewer, temple, mine)
  -h, --help                Show this help
`)
  process.exit(0)
}

const seed = parseInt(values.seed!, 10)
const level = parseInt(values.level!, 10)
const roomCount = parseInt(values.rooms!, 10)
const partySize = parseInt(values.party!, 10)

let scenario

if (values.type === 'dungeon') {
  const result = generateDungeon({
    seed,
    rooms: roomCount,
    level,
    partySize,
    theme: values.theme as any,
    difficulty: values.difficulty as any,
  })
  scenario = result.toScenario()
} else {
  const result = generateWilderness({
    seed,
    template: (values.type === 'dungeon' ? values.template : values.type) as any,
    level,
    partySize,
    pointsOfInterest: roomCount,
    difficulty: values.difficulty as any,
  })
  scenario = result.toScenario()
}

// Validate
const validation = validateScenario(scenario)
if (!validation.valid) {
  console.error('Validation errors:')
  for (const err of validation.errors) console.error(`  - ${err}`)
  process.exit(1)
}
if (validation.warnings.length > 0) {
  console.warn('Warnings:')
  for (const warn of validation.warnings) console.warn(`  - ${warn}`)
}

const json = JSON.stringify(scenario, null, 2)

if (values.output) {
  const outputPath = resolve(values.output)
  writeFileSync(outputPath, json, 'utf-8')
  console.log(`Scenario written to ${outputPath}`)
} else {
  console.log(json)
}
