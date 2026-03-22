import type { Scenario, ValidationResult } from './types.js'

export function validateScenario(scenario: Scenario): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Basic fields
  if (!scenario.name || scenario.name.trim() === '') {
    errors.push('Scenario name is required')
  }

  if (scenario.level.min > scenario.level.max) {
    errors.push(`Invalid level range: min (${scenario.level.min}) > max (${scenario.level.max})`)
  }

  if (scenario.maps.length === 0) {
    errors.push('At least one map is required')
  }

  // Collect all room IDs
  const roomIds = new Set<string>()
  for (const mapDef of scenario.maps) {
    for (const roomDef of mapDef.rooms) {
      if (roomIds.has(roomDef.id)) {
        errors.push(`Duplicate room ID: ${roomDef.id}`)
      }
      roomIds.add(roomDef.id)

      if (!roomDef.lighting) {
        warnings.push(`Room "${roomDef.id}" is missing lighting property`)
      }
    }
  }

  // Validate encounters
  const encounterIds = new Set<string>()
  for (const enc of scenario.encounters) {
    encounterIds.add(enc.id)

    if (!roomIds.has(enc.room)) {
      errors.push(`Encounter "${enc.id}" references nonexistent room: ${enc.room}`)
    }

    for (const monster of enc.monsters) {
      if (!monster.type.startsWith('pf2e:')) {
        warnings.push(`Monster type "${monster.type}" in encounter "${enc.id}" should use pf2e: prefix`)
      }
    }
  }

  // Validate triggers — check references and cycles
  const triggerIds = new Set<string>(scenario.triggers.map((t) => t.id))

  for (const trig of scenario.triggers) {
    for (const effect of trig.effects) {
      if (effect.type === 'trigger') {
        const target = effect.target as string
        if (!triggerIds.has(target)) {
          errors.push(`Trigger "${trig.id}" references nonexistent trigger: ${target}`)
        }
      }
    }
  }

  // Cycle detection in triggers
  if (hasTriggerCycle(scenario.triggers)) {
    errors.push('Cyclic trigger chain detected')
  }

  // Validate loot references
  for (const lootDef of scenario.loot) {
    if (lootDef.encounter && !encounterIds.has(lootDef.encounter)) {
      errors.push(`Loot "${lootDef.id}" references nonexistent encounter: ${lootDef.encounter}`)
    }
    if (lootDef.room && !roomIds.has(lootDef.room)) {
      errors.push(`Loot "${lootDef.id}" references nonexistent room: ${lootDef.room}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

function hasTriggerCycle(triggers: Scenario['triggers']): boolean {
  const graph = new Map<string, string[]>()

  for (const trig of triggers) {
    const targets: string[] = []
    for (const effect of trig.effects) {
      if (effect.type === 'trigger' && typeof effect.target === 'string') {
        targets.push(effect.target)
      }
    }
    graph.set(trig.id, targets)
  }

  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true
    if (visited.has(nodeId)) return false

    visited.add(nodeId)
    inStack.add(nodeId)

    for (const neighbor of graph.get(nodeId) ?? []) {
      if (dfs(neighbor)) return true
    }

    inStack.delete(nodeId)
    return false
  }

  for (const id of graph.keys()) {
    if (dfs(id)) return true
  }

  return false
}
