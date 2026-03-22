import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    messageId: string
    action: 'approve' | 'edit' | 'reject'
    editedContent?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.messageId || !body.action) {
    return NextResponse.json(
      { error: 'messageId and action are required' },
      { status: 400 }
    )
  }

  if (body.action === 'edit' && !body.editedContent?.trim()) {
    return NextResponse.json(
      { error: 'editedContent is required when action is edit' },
      { status: 400 }
    )
  }

  try {
    // Verify the message exists and is pending
    const { data: message, error: fetchErr } = await supabase
      .from('npc_messages')
      .select('id, content, status, conversation_id')
      .eq('id', body.messageId)
      .single()

    if (fetchErr || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.status !== 'pending') {
      return NextResponse.json(
        { error: 'Message has already been reviewed' },
        { status: 409 }
      )
    }

    // Verify caller is the GM for this session
    const { data: conv } = await supabase
      .from('npc_conversations')
      .select('session_id')
      .eq('id', message.conversation_id)
      .single()

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { data: session } = await supabase
      .from('sessions')
      .select('campaign_id')
      .eq('id', conv.session_id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('gm_id')
      .eq('id', session.campaign_id)
      .single()

    if (!campaign || campaign.gm_id !== user.id) {
      return NextResponse.json({ error: 'Only the GM can approve NPC messages' }, { status: 403 })
    }

    // Apply the action
    let updateData: Record<string, unknown>

    switch (body.action) {
      case 'approve':
        updateData = { status: 'approved' }
        break
      case 'edit':
        updateData = {
          status: 'edited',
          original_content: message.content,
          content: body.editedContent!.trim(),
        }
        break
      case 'reject':
        updateData = { status: 'rejected' }
        break
    }

    const { error: updateErr } = await supabase
      .from('npc_messages')
      .update(updateData)
      .eq('id', body.messageId)

    if (updateErr) throw updateErr

    return NextResponse.json({
      messageId: body.messageId,
      action: body.action,
      status: body.action === 'edit' ? 'edited' : body.action === 'approve' ? 'approved' : 'rejected',
    })
  } catch (error) {
    console.error('NPC approval error:', error)
    return NextResponse.json(
      { error: 'Failed to process approval. Please try again.' },
      { status: 500 }
    )
  }
}
