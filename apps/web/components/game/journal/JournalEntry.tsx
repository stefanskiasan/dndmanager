'use client'

import type { SessionJournal } from '@dndmanager/ai-services'

interface JournalEntryProps {
  journal: SessionJournal
}

export function JournalEntry({ journal }: JournalEntryProps) {
  return (
    <article className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <header>
        <h2 className="text-xl font-bold text-amber-400">{journal.title}</h2>
        <p className="mt-1 text-xs text-neutral-500">
          {new Date(journal.generatedAt).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </header>

      {/* Narrative */}
      <div className="prose prose-invert prose-sm max-w-none">
        {journal.narrative.split('\n\n').map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {/* Highlights */}
      {journal.highlights.length > 0 && (
        <div className="rounded border border-neutral-800 bg-neutral-950 p-4">
          <h3 className="mb-2 text-sm font-medium text-amber-400">Key Moments</h3>
          <ul className="space-y-1 text-sm text-neutral-300">
            {journal.highlights.map((h, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-600">*</span>
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Combat summary */}
      {journal.combatSummary && (
        <div className="rounded border border-red-900/30 bg-red-950/20 p-4">
          <h3 className="mb-2 text-sm font-medium text-red-400">Combat Summary</h3>
          <p className="text-sm text-neutral-300">{journal.combatSummary}</p>
        </div>
      )}
    </article>
  )
}
