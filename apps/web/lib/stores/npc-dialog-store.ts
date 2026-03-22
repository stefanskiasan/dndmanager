import { create } from 'zustand'
import type { NpcMessage, NpcDialogProfile, NpcDialogResponse } from '@dndmanager/ai-services'

interface NpcDialogState {
  /** Currently active conversation ID (null if no dialog open) */
  activeConversationId: string | null
  /** NPC we're currently talking to */
  activeNpc: NpcDialogProfile | null
  /** All messages in the current conversation */
  messages: NpcMessage[]
  /** Whether we're waiting for AI to generate a response */
  isGenerating: boolean
  /** Whether we're waiting for GM approval */
  isPendingApproval: boolean
  /** Error message if something went wrong */
  error: string | null

  // Actions
  openDialog: (npc: NpcDialogProfile, conversationId?: string) => void
  closeDialog: () => void
  setMessages: (messages: NpcMessage[]) => void
  addMessage: (message: NpcMessage) => void
  updateMessage: (messageId: string, updates: Partial<NpcMessage>) => void
  sendPlayerMessage: (sessionId: string, message: string) => Promise<void>
  setGenerating: (generating: boolean) => void
  setPendingApproval: (pending: boolean) => void
  setError: (error: string | null) => void
}

export const useNpcDialogStore = create<NpcDialogState>((set, get) => ({
  activeConversationId: null,
  activeNpc: null,
  messages: [],
  isGenerating: false,
  isPendingApproval: false,
  error: null,

  openDialog: (npc, conversationId) =>
    set({
      activeNpc: npc,
      activeConversationId: conversationId ?? null,
      messages: [],
      error: null,
    }),

  closeDialog: () =>
    set({
      activeConversationId: null,
      activeNpc: null,
      messages: [],
      isGenerating: false,
      isPendingApproval: false,
      error: null,
    }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      ),
    })),

  sendPlayerMessage: async (sessionId, message) => {
    const { activeNpc, activeConversationId } = get()
    if (!activeNpc) return

    set({ isGenerating: true, error: null })

    // Optimistically add the player message
    const optimisticMsg: NpcMessage = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversationId ?? '',
      role: 'player',
      content: message,
      status: 'approved',
      createdAt: new Date().toISOString(),
    }
    set((state) => ({ messages: [...state.messages, optimisticMsg] }))

    try {
      const res = await fetch('/api/ai/npc-dialog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          npcId: activeNpc.npcId,
          playerMessage: message,
          npcProfile: activeNpc,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to send message')
      }

      const data: NpcDialogResponse = await res.json()

      // Update conversation ID if this was the first message
      if (!activeConversationId) {
        set({ activeConversationId: data.conversationId })
      }

      // NPC response is pending GM approval — player sees a "waiting" state
      set({ isGenerating: false, isPendingApproval: true })
    } catch (error) {
      set({
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Something went wrong',
      })
    }
  },

  setGenerating: (generating) => set({ isGenerating: generating }),
  setPendingApproval: (pending) => set({ isPendingApproval: pending }),
  setError: (error) => set({ error }),
}))
