import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: journal, error } = await supabase
    .from('session_journals')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (error || !journal) {
    return NextResponse.json({ error: 'Journal not found' }, { status: 404 })
  }

  return NextResponse.json(journal)
}
