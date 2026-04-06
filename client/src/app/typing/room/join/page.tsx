'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { get } from '@/lib/action'

export default function JoinRoomPage() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!roomCode.trim()) {
      setError('Please enter a room code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const code = roomCode.toUpperCase().trim()
      const data = await get(`typing/rooms/${code}`)

      if (data.success) {
        router.push(`/typing/room/${code}`)
      } else {
        setError(data.error || 'Room not found')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Join Room</h1>
          <p className="text-muted-foreground">Enter the room code to join</p>
        </div>

        <form onSubmit={handleJoinRoom} className="border rounded-lg p-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="roomCode" className="text-sm font-medium">
              Room Code
            </label>
            <input
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABCD12"
              maxLength={6}
              className="w-full px-4 py-3 text-2xl font-mono text-center border rounded-md uppercase tracking-wider"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !roomCode.trim()}
            className="w-full py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join Room'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/typing')}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Back to Typing
          </button>
        </form>
      </div>
    </div>
  )
}
