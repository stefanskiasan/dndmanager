'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CharacterWizard } from './CharacterWizard'

interface CharacterFormProps {
  campaignId: string
}

export function CharacterForm({ campaignId }: CharacterFormProps) {
  const [mode, setMode] = useState<'choose' | 'ai' | 'manual'>('choose')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Nicht angemeldet')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('characters')
      .insert({
        name,
        owner_id: user.id,
        campaign_id: campaignId,
        level: 1,
        xp: 0,
        data: {},
      })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/campaigns/${campaignId}`)
    router.refresh()
  }

  // Mode selection screen
  if (mode === 'choose') {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Wie moechtest du deinen Charakter erstellen?</h2>
        <div className="grid gap-3">
          <button
            onClick={() => setMode('ai')}
            className="rounded-lg border border-amber-700 bg-amber-900/20 p-4 text-left transition-colors hover:bg-amber-900/40"
          >
            <div className="font-medium text-amber-400">KI-Assistent</div>
            <div className="text-sm text-neutral-400">
              Beschreibe dein Charakterkonzept und erhalte passende PF2e-Vorschlaege.
            </div>
          </button>
          <button
            onClick={() => setMode('manual')}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-4 text-left transition-colors hover:border-neutral-500"
          >
            <div className="font-medium text-neutral-300">Manuell</div>
            <div className="text-sm text-neutral-500">
              Erstelle einen einfachen Charakter mit Name.
            </div>
          </button>
        </div>
      </div>
    )
  }

  // AI wizard
  if (mode === 'ai') {
    return (
      <div>
        <button
          onClick={() => setMode('choose')}
          className="mb-4 text-sm text-neutral-500 hover:text-neutral-300"
        >
          &larr; Zurueck zur Auswahl
        </button>
        <CharacterWizard campaignId={campaignId} />
      </div>
    )
  }

  // Manual form (existing behavior)
  return (
    <div>
      <button
        onClick={() => setMode('choose')}
        className="mb-4 text-sm text-neutral-500 hover:text-neutral-300"
      >
        &larr; Zurueck zur Auswahl
      </button>
      <form onSubmit={handleManualSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Charaktername</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Thorin Eisenschild"
            required
          />
        </div>

        <p className="text-sm text-neutral-400">
          Weitere Charakter-Optionen (Ancestry, Class, Abilities) koennen ueber den KI-Assistenten
          gewaehlt werden.
        </p>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Erstellen...' : 'Charakter erstellen'}
        </Button>
      </form>
    </div>
  )
}
