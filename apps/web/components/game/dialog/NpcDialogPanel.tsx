'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNpcDialogStore } from '@/lib/stores/npc-dialog-store'
import { NpcDialogBubble } from './NpcDialogBubble'
import { NpcDialogInput } from './NpcDialogInput'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { NpcMessage } from '@dndmanager/ai-services'

interface NpcDialogPanelProps {
  sessionId: string
}

export function NpcDialogPanel({ sessionId }: NpcDialogPanelProps) {
  const {
    activeNpc,
    activeConversationId,
    messages,
    isGenerating,
    isPendingApproval,
    error,
    sendPlayerMessage,
    addMessage,
    updateMessage,
    setPendingApproval,
    closeDialog,
    setMessages,
  } = useNpcDialogStore()

  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  // Subscribe to message updates (for when GM approves/edits)
  useEffect(() => {
    if (!activeConversationId) return

    const channel = supabase
      .channel(`npc-dialog-${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'npc_messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const m = payload.new as Record<string, unknown>
          // Only add if it's a visible message (approved/edited npc, or player)
          const status = m.status as string
          const role = m.role as string
          if (role === 'player' || status === 'approved' || status === 'edited') {
            const msg: NpcMessage = {
              id: m.id as string,
              conversationId: m.conversation_id as string,
              role: role as 'player' | 'npc' | 'system',
              content: m.content as string,
              status: status as 'pending' | 'approved' | 'edited' | 'rejected',
              originalContent: m.original_content as string | undefined,
              createdAt: m.created_at as string,
            }
            addMessage(msg)
            if (role === 'npc') {
              setPendingApproval(false)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'npc_messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const m = payload.new as Record<string, unknown>
          const status = m.status as string
          const role = m.role as string

          if (status === 'approved' || status === 'edited') {
            // Message was approved — add it to visible messages
            const msg: NpcMessage = {
              id: m.id as string,
              conversationId: m.conversation_id as string,
              role: role as 'player' | 'npc' | 'system',
              content: m.content as string,
              status: status as 'approved' | 'edited',
              originalContent: m.original_content as string | undefined,
              createdAt: m.created_at as string,
            }
            // Check if we already have this message
            const existing = messages.find((em) => em.id === msg.id)
            if (existing) {
              updateMessage(msg.id, msg)
            } else {
              addMessage(msg)
            }
            setPendingApproval(false)
          } else if (status === 'rejected') {
            setPendingApproval(false)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeConversationId, supabase, addMessage, updateMessage, setPendingApproval, messages])

  // Load existing conversation messages when dialog opens
  useEffect(() => {
    if (!activeConversationId) return

    const loadMessages = async () => {
      const { data } = await supabase
        .from('npc_messages')
        .select('*')
        .eq('conversation_id', activeConversationId)
        .in('status', ['approved', 'edited'])
        .order('created_at', { ascending: true })

      if (data) {
        setMessages(
          data.map((m: Record<string, unknown>) => ({
            id: m.id as string,
            conversationId: m.conversation_id as string,
            role: m.role as 'player' | 'npc' | 'system',
            content: m.content as string,
            status: m.status as 'approved' | 'edited',
            originalContent: m.original_content as string | undefined,
            createdAt: m.created_at as string,
          }))
        )
      }
    }

    loadMessages()
  }, [activeConversationId, supabase, setMessages])

  if (!activeNpc) return null

  // Filter to only show approved/edited NPC messages and all player messages
  const visibleMessages = messages.filter(
    (m) =>
      m.role === 'player' ||
      m.role === 'system' ||
      m.status === 'approved' ||
      m.status === 'edited'
  )

  return (
    <Card className="flex flex-col w-80 h-96 border shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div>
          <h3 className="font-semibold text-sm">{activeNpc.name}</h3>
          <p className="text-xs text-muted-foreground">In conversation</p>
        </div>
        <Button variant="ghost" size="sm" onClick={closeDialog}>
          Close
        </Button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-3"
      >
        {visibleMessages.map((msg) => (
          <NpcDialogBubble
            key={msg.id}
            message={msg}
            npcName={activeNpc.name}
          />
        ))}

        {isGenerating && (
          <div className="self-start text-xs text-muted-foreground italic">
            {activeNpc.name} is thinking...
          </div>
        )}

        {isPendingApproval && !isGenerating && (
          <div className="self-start text-xs text-muted-foreground italic">
            Waiting for GM approval...
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-1 text-xs text-destructive">{error}</div>
      )}

      {/* Input */}
      <div className="p-3 border-t">
        <NpcDialogInput
          onSend={(message) => sendPlayerMessage(sessionId, message)}
          disabled={isGenerating || isPendingApproval}
          placeholder={`Talk to ${activeNpc.name}...`}
        />
      </div>
    </Card>
  )
}
