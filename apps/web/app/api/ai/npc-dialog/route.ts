import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateNpcResponse } from '@dndmanager/ai-services'
import type { NpcDialogProfile, NpcMessage } from '@dndmanager/ai-services'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    sessionId: string
    npcId: string
    playerMessage: string
    npcProfile: NpcDialogProfile
    gmHint?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.sessionId || !body.npcId || !body.playerMessage?.trim()) {
    return NextResponse.json(
      { error: 'sessionId, npcId, and playerMessage are required' },
      { status: 400 }
    )
  }

  if (body.playerMessage.length > 1000) {
    return NextResponse.json(
      { error: 'Message must be under 1000 characters' },
      { status: 400 }
    )
  }

  try {
    // Get or create conversation
    let { data: conversation } = await supabase
      .from('npc_conversations')
      .select('id')
      .eq('session_id', body.sessionId)
      .eq('npc_id', body.npcId)
      .eq('player_id', user.id)
      .single()

    if (!conversation) {
      const { data: newConv, error: createErr } = await supabase
        .from('npc_conversations')
        .insert({
          session_id: body.sessionId,
          npc_id: body.npcId,
          player_id: user.id,
          npc_name: body.npcProfile.name,
          npc_profile: body.npcProfile,
        })
        .select('id')
        .single()

      if (createErr) throw createErr
      conversation = newConv
    }

    // Save player message
    await supabase.from('npc_messages').insert({
      conversation_id: conversation.id,
      role: 'player',
      content: body.playerMessage.trim(),
      status: 'approved',
    })

    // Fetch conversation history
    const { data: history } = await supabase
      .from('npc_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })

    const messages: NpcMessage[] = (history ?? []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      conversationId: m.conversation_id as string,
      role: m.role as 'player' | 'npc' | 'system',
      content: m.content as string,
      status: m.status as 'pending' | 'approved' | 'edited' | 'rejected',
      originalContent: m.original_content as string | undefined,
      createdAt: m.created_at as string,
    }))

    // Generate NPC response
    const result = await generateNpcResponse({
      npc: body.npcProfile,
      conversationHistory: messages,
      playerMessage: body.playerMessage.trim(),
      gmHint: body.gmHint,
    })

    // Save NPC response as pending (needs GM approval)
    const { data: npcMsg, error: msgErr } = await supabase
      .from('npc_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'npc',
        content: result.npcResponse,
        status: 'pending',
        token_count_input: result.inputTokens,
        token_count_output: result.outputTokens,
      })
      .select('id')
      .single()

    if (msgErr) throw msgErr

    return NextResponse.json({
      messageId: npcMsg.id,
      conversationId: conversation.id,
      npcMessage: result.npcResponse,
      status: 'pending',
    })
  } catch (error) {
    console.error('NPC dialog error:', error)
    return NextResponse.json(
      { error: 'Failed to generate NPC response. Please try again.' },
      { status: 500 }
    )
  }
}
