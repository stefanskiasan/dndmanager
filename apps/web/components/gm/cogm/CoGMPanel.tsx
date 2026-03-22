'use client'

import { useRef, useEffect, useState } from 'react'
import { useCoGMStore, sendCoGMMessage } from '@/lib/stores/co-gm-store'
import { useGameStore } from '@/lib/stores/game-store'
import { CoGMMessage } from './CoGMMessage'
import type { GameContextSnapshot } from '@dndmanager/ai-services'

interface CoGMPanelProps {
  sessionId: string
}

export function CoGMPanel({ sessionId }: CoGMPanelProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const messages = useCoGMStore((s) => s.messages)
  const isStreaming = useCoGMStore((s) => s.isStreaming)
  const error = useCoGMStore((s) => s.error)
  const clearChat = useCoGMStore((s) => s.clearChat)
  const store = useCoGMStore.getState

  // Pull game state for context
  const tokens = useGameStore((s) => s.tokens)
  const mode = useGameStore((s) => s.mode)
  const round = useGameStore((s) => s.round)
  const turnOrder = useGameStore((s) => s.turnOrder)
  const currentTurnIndex = useGameStore((s) => s.currentTurnIndex)

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  function buildContext(): GameContextSnapshot {
    const currentTurnTokenId =
      currentTurnIndex >= 0 && turnOrder.length > 0
        ? turnOrder[currentTurnIndex]
        : undefined

    return {
      sessionId,
      mode: mode ?? 'exploration',
      round: round ?? 0,
      tokens: tokens.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        hp: { current: t.hp.current, max: t.hp.max },
        ac: t.ac,
        conditions: t.conditions.map((c) => c.id),
      })),
      currentTurnTokenId,
      recentEvents: [],
    }
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    setInput('')
    const context = buildContext()
    await sendCoGMMessage(trimmed, context, store())
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col rounded border border-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
        <h3 className="text-sm font-medium text-amber-400">Co-GM Assistant</h3>
        <button
          onClick={clearChat}
          className="text-xs text-neutral-500 hover:text-neutral-300"
          title="Clear chat"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto p-3"
      >
        {messages.length === 0 && (
          <div className="space-y-2 py-4 text-center text-xs text-neutral-500">
            <p>Ask me about PF2e rules, encounter balancing, or consequences.</p>
            <div className="space-y-1">
              <p className="text-neutral-600">Try:</p>
              <p>&quot;How does Grapple work?&quot;</p>
              <p>&quot;Balance this encounter for 3 players&quot;</p>
              <p>&quot;Players want to burn down the tavern&quot;</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <CoGMMessage key={i} message={msg} />
        ))}
        {isStreaming && (
          <div className="text-xs text-neutral-500">Co-GM is thinking...</div>
        )}
        {error && (
          <div className="rounded bg-red-900/30 px-2 py-1 text-xs text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-neutral-800 p-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the Co-GM..."
            disabled={isStreaming}
            className="flex-1 rounded bg-neutral-800 px-3 py-1.5 text-sm text-white placeholder-neutral-500 outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
