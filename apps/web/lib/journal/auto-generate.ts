/**
 * Triggers journal generation for a completed session.
 * Called when session status changes to 'completed'.
 */
export async function triggerJournalGeneration(sessionId: string): Promise<void> {
  try {
    const res = await fetch('/api/ai/journal/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.warn('Journal generation failed:', body.error ?? res.status)
      return
    }

    console.info('Session journal generated successfully')
  } catch (err) {
    // Non-blocking — journal generation is best-effort
    console.warn('Journal generation error:', err)
  }
}
