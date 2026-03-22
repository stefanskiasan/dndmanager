'use client'

import { useEffect, useState } from 'react'
import { JournalEntry } from './JournalEntry'
import type { SessionJournal } from '@dndmanager/ai-services'

interface JournalListProps {
  campaignId: string
}

interface JournalRow {
  id: string
  session_id: string
  campaign_id: string
  title: string
  narrative: string
  highlights: string[]
  combat_summary: string | null
  generated_at: string
}

function toSessionJournal(row: JournalRow): SessionJournal {
  return {
    id: row.id,
    sessionId: row.session_id,
    campaignId: row.campaign_id,
    title: row.title,
    narrative: row.narrative,
    highlights: row.highlights,
    combatSummary: row.combat_summary ?? undefined,
    generatedAt: row.generated_at,
  }
}

export function JournalList({ campaignId }: JournalListProps) {
  const [journals, setJournals] = useState<SessionJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchJournals() {
      try {
        const res = await fetch(`/api/ai/journal?campaignId=${campaignId}`)
        if (!res.ok) throw new Error('Failed to fetch journals')
        const rows: JournalRow[] = await res.json()
        setJournals(rows.map(toSessionJournal))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchJournals()
  }, [campaignId])

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading journals...</p>
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  if (journals.length === 0) {
    return (
      <div className="rounded border border-neutral-800 p-8 text-center">
        <p className="text-sm text-neutral-500">No session journals yet.</p>
        <p className="mt-1 text-xs text-neutral-600">
          Journals are automatically generated when a session ends.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {journals.map((journal) => (
        <JournalEntry key={journal.id} journal={journal} />
      ))}
    </div>
  )
}
