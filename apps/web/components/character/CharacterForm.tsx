'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CharacterFormProps {
  campaignId: string
}

export function CharacterForm({ campaignId }: CharacterFormProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        Weitere Charakter-Optionen (Ancestry, Class, Abilities) werden in Phase 2 hinzugefuegt.
        Aktuell wird nur der Name gespeichert.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Erstellen...' : 'Charakter erstellen'}
      </Button>
    </form>
  )
}
