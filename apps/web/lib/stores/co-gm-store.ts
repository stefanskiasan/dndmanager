import { create } from 'zustand'
import type { CoGMMessage, GameContextSnapshot } from '@dndmanager/ai-services'

interface CoGMState {
  messages: CoGMMessage[]
  isStreaming: boolean
  error: string | null

  addUserMessage: (content: string) => void
  startStreaming: () => void
  appendToAssistant: (delta: string) => void
  finishStreaming: () => void
  setError: (error: string | null) => void
  clearChat: () => void
}

export const useCoGMStore = create<CoGMState>((set, get) => ({
  messages: [],
  isStreaming: false,
  error: null,

  addUserMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { role: 'user', content, timestamp: Date.now() },
      ],
      error: null,
    })),

  startStreaming: () =>
    set((state) => ({
      isStreaming: true,
      messages: [
        ...state.messages,
        { role: 'assistant', content: '', timestamp: Date.now() },
      ],
    })),

  appendToAssistant: (delta) =>
    set((state) => {
      const messages = [...state.messages]
      const last = messages[messages.length - 1]
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = {
          ...last,
          content: last.content + delta,
        }
      }
      return { messages }
    }),

  finishStreaming: () => set({ isStreaming: false }),

  setError: (error) => set({ error, isStreaming: false }),

  clearChat: () => set({ messages: [], error: null, isStreaming: false }),
}))

/**
 * Sends a message to the Co-GM and streams the response.
 */
export async function sendCoGMMessage(
  message: string,
  gameContext: GameContextSnapshot,
  store: CoGMState
) {
  store.addUserMessage(message)
  store.startStreaming()

  try {
    const conversationHistory = store.messages.filter(
      (m) => m.content.length > 0
    )

    const response = await fetch('/api/ai/co-gm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory: conversationHistory.slice(0, -1), // exclude the empty assistant message
        gameContext,
      }),
    })

    if (!response.ok) {
      throw new Error(`Co-GM error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      store.appendToAssistant(text)
    }

    store.finishStreaming()
  } catch (err) {
    store.setError(err instanceof Error ? err.message : 'Unknown error')
  }
}
