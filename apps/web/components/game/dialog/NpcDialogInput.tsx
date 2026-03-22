'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface NpcDialogInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function NpcDialogInput({
  onSend,
  disabled = false,
  placeholder = 'Say something...',
}: NpcDialogInputProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    inputRef.current?.focus()
  }, [text, disabled, onSend])

  return (
    <div className="flex gap-2">
      <Input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={1000}
        className="flex-1"
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        size="sm"
      >
        Send
      </Button>
    </div>
  )
}
