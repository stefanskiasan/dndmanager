'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface PendingMessage {
  id: string
  conversation_id: string
  content: string
  created_at: string
  npc_name: string
  player_name: string
  npc_id: string
}

interface NpcApprovalPanelProps {
  sessionId: string
}

export function NpcApprovalPanel({ sessionId }: NpcApprovalPanelProps) {
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch pending messages and subscribe to realtime updates
  useEffect(() => {
    const fetchPending = async () => {
      const { data } = await supabase
        .from('npc_messages')
        .select(`
          id,
          conversation_id,
          content,
          created_at,
          npc_conversations!inner (
            npc_name,
            npc_id,
            session_id,
            profiles!npc_conversations_player_id_fkey ( display_name )
          )
        `)
        .eq('status', 'pending')
        .eq('role', 'npc')
        .eq('npc_conversations.session_id', sessionId)
        .order('created_at', { ascending: true })

      if (data) {
        setPendingMessages(
          data.map((m: Record<string, unknown>) => {
            const conv = m.npc_conversations as Record<string, unknown>
            const profile = conv.profiles as Record<string, unknown>
            return {
              id: m.id as string,
              conversation_id: m.conversation_id as string,
              content: m.content as string,
              created_at: m.created_at as string,
              npc_name: conv.npc_name as string,
              npc_id: conv.npc_id as string,
              player_name: profile.display_name as string,
            }
          })
        )
      }
    }

    fetchPending()

    // Subscribe to new pending messages
    const channel = supabase
      .channel(`npc-approval-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'npc_messages',
          filter: `status=eq.pending`,
        },
        () => {
          fetchPending()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase])

  const handleAction = async (
    messageId: string,
    action: 'approve' | 'edit' | 'reject'
  ) => {
    setProcessing(messageId)
    try {
      const res = await fetch('/api/ai/npc-dialog/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          action,
          editedContent: action === 'edit' ? editText : undefined,
        }),
      })

      if (res.ok) {
        setPendingMessages((prev) => prev.filter((m) => m.id !== messageId))
        setEditingId(null)
        setEditText('')
      }
    } finally {
      setProcessing(null)
    }
  }

  if (pendingMessages.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        NPC Responses Pending Approval
      </h3>
      {pendingMessages.map((msg) => (
        <Card key={msg.id} className="p-4 border-amber-500/50 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm">{msg.npc_name}</span>
            <span className="text-xs text-muted-foreground">
              responding to {msg.player_name}
            </span>
          </div>

          {editingId === msg.id ? (
            <textarea
              className="w-full min-h-[80px] p-2 rounded border bg-background text-sm resize-y"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
          ) : (
            <p className="text-sm mb-3 whitespace-pre-wrap italic">
              &ldquo;{msg.content}&rdquo;
            </p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              disabled={processing === msg.id}
              onClick={() =>
                editingId === msg.id
                  ? handleAction(msg.id, 'edit')
                  : handleAction(msg.id, 'approve')
              }
            >
              {editingId === msg.id ? 'Save Edit' : 'Approve'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={processing === msg.id}
              onClick={() => {
                if (editingId === msg.id) {
                  setEditingId(null)
                  setEditText('')
                } else {
                  setEditingId(msg.id)
                  setEditText(msg.content)
                }
              }}
            >
              {editingId === msg.id ? 'Cancel' : 'Edit'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={processing === msg.id}
              onClick={() => handleAction(msg.id, 'reject')}
            >
              Reject
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
