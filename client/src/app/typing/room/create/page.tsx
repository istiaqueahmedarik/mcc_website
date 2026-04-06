'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { post } from '@/lib/action'

export default function CreateRoomPage() {
  const router = useRouter()
  const [timeLimit, setTimeLimit] = useState(60)
  const [difficulty, setDifficulty] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreateRoom = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await post('typing/rooms/create', { timeLimit, difficulty })

      if (data.success) {
        router.push(`/typing/room/${data.room.roomCode}`)
      } else {
        setError(data.error || 'Failed to create room')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const difficultyOptions = [
    { value: null, label: 'All', description: 'Mixed difficulty' },
    { value: 1, label: 'Easy', description: 'Simple words' },
    { value: 2, label: 'Medium', description: 'Common words' },
    { value: 3, label: 'Hard', description: 'Complex words' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Create Room</h1>
          <p className="text-muted-foreground">Set up a multiplayer typing test</p>
        </div>

        <div className="border rounded-lg p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Time Limit (seconds)</label>
            <div className="grid grid-cols-4 gap-2">
              {[30, 60, 120, 180].map((time) => (
                <button
                  key={time}
                  onClick={() => setTimeLimit(time)}
                  className={`py-2 px-4 rounded-md border transition-colors ${
                    timeLimit === time
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  {time}s
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Difficulty</label>
            <div className="grid grid-cols-4 gap-2">
              {difficultyOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setDifficulty(opt.value)}
                  className={`py-2 px-3 rounded-md border transition-colors text-sm ${
                    difficulty === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {difficultyOptions.find(o => o.value === difficulty)?.description}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>

          <button
            onClick={() => router.push('/typing')}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Back to Typing
          </button>
        </div>
      </div>
    </div>
  )
}
