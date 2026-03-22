'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function JoinCampaignPage() {
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Nicht angemeldet')
      setLoading(false)
      return
    }

    const { error: joinError } = await supabase
      .rpc('join_campaign_by_invite_code', { code: inviteCode.trim() })

    if (joinError) {
      if (joinError.message.includes('Campaign not found')) {
        setError('Kampagne nicht gefunden. Pruefe den Einladungscode.')
      } else {
        setError(joinError.message)
      }
      setLoading(false)
      return
    }

    router.push('/campaigns')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Kampagne beitreten</CardTitle>
          <CardDescription>Gib den Einladungscode deines GMs ein</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Einladungscode</Label>
              <Input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="a1b2c3d4"
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Beitreten...' : 'Beitreten'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
