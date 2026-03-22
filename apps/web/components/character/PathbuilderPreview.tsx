import type { CharacterData } from '@dndmanager/pf2e-engine/pathbuilder'
import { abilityModifier } from '@dndmanager/pf2e-engine'
import type { AbilityId } from '@dndmanager/pf2e-engine'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PathbuilderPreviewProps {
  name: string
  data: CharacterData
}

const ABILITY_LABELS: Record<AbilityId, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
}

function formatModifier(score: number): string {
  const mod = abilityModifier(score)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function PathbuilderPreview({ name, data }: PathbuilderPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold">{name}</h3>
        <p className="text-sm text-neutral-400">
          Level {data.level} {data.ancestry} {data.heritage} {data.class}
        </p>
        <p className="text-sm text-neutral-400">
          {data.background} &middot; {data.size} &middot; HP {data.hitpoints}
        </p>
      </div>

      {/* Ability Scores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ability Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2 text-center text-sm">
            {(Object.entries(data.abilities) as [AbilityId, number][]).map(([id, score]) => (
              <div key={id}>
                <div className="text-xs text-neutral-400">{ABILITY_LABELS[id]}</div>
                <div className="font-bold">{score}</div>
                <div className="text-xs text-neutral-500">{formatModifier(score)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Saves & Perception */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Saves & Perception</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="grid grid-cols-2 gap-1">
            <span>Fortitude:</span><span className="font-medium">{data.saves.fortitude}</span>
            <span>Reflex:</span><span className="font-medium">{data.saves.reflex}</span>
            <span>Will:</span><span className="font-medium">{data.saves.will}</span>
            <span>Perception:</span><span className="font-medium">{data.perception}</span>
          </div>
        </CardContent>
      </Card>

      {/* Skills (only trained+) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Trained Skills</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {Object.entries(data.skills)
            .filter(([, rank]) => rank !== 'untrained')
            .map(([skill, rank]) => (
              <div key={skill} className="flex justify-between">
                <span className="capitalize">{skill}</span>
                <span className="text-neutral-400">{rank}</span>
              </div>
            ))}
          {data.lores.map((lore) => (
            <div key={lore.name} className="flex justify-between">
              <span>{lore.name}</span>
              <span className="text-neutral-400">{lore.rank}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Weapons */}
      {data.weapons.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Weapons</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {data.weapons.map((w, i) => (
              <div key={i}>{w.display} ({w.die} {w.damageType})</div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Armor */}
      {data.armor.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Armor</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {data.armor.filter((a) => a.worn).map((a, i) => (
              <div key={i}>{a.display}</div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Feats */}
      {data.feats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Feats</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {data.feats.map((f, i) => (
              <div key={i} className="flex justify-between">
                <span>{f.name}</span>
                <span className="text-neutral-400">Lvl {f.level}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
