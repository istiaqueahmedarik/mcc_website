'use client'

import { useState } from 'react'

interface NameEntryModalProps {
  onSubmit: (name: string) => void
  roomCode: string
}

export function NameEntryModal({ onSubmit, roomCode }: NameEntryModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please enter your name')
      return
    }

    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters')
      return
    }

    if (trimmedName.length > 20) {
      setError('Name must be less than 20 characters')
      return
    }

    onSubmit(trimmedName)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background border rounded-lg p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Join Room</h2>
          <div className="text-4xl font-mono font-bold text-primary mb-2">
            {roomCode}
          </div>
          <p className="text-muted-foreground">Enter your name to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              placeholder="Enter your name"
              maxLength={20}
              className="w-full px-4 py-3 border rounded-md"
              autoFocus
            />
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}
