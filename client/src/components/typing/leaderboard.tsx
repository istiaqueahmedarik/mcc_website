'use client'

import { Trophy, Medal, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LeaderboardEntry {
  rank: number
  name: string
  wpm: number
  accuracy: number
  completed?: boolean
}

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[]
  roomCode: string
  participantId: string | null
  isHost?: boolean
  onRestart?: () => void
}

export function Leaderboard({ leaderboard, roomCode, participantId, isHost, onRestart }: LeaderboardProps) {
  const router = useRouter()

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />
    return <span className="w-6 h-6 flex items-center justify-center font-semibold">{rank}</span>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/20 rounded-full mb-2">
          <Trophy className="w-8 h-8 text-yellow-500" />
        </div>
        <h1 className="text-3xl font-bold">Game Finished!</h1>
        <p className="text-muted-foreground">Final Results</p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted px-6 py-3 border-b">
          <div className="grid grid-cols-12 gap-4 font-semibold text-sm">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">Name</div>
            <div className="col-span-3 text-right">WPM</div>
            <div className="col-span-3 text-right">Accuracy</div>
          </div>
        </div>

        <div className="divide-y">
          {leaderboard.map((entry) => (
            <div
              key={entry.rank}
              className={`px-6 py-4 transition-colors ${
                entry.rank <= 3 ? 'bg-muted/30' : ''
              }`}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-1">
                  {getMedalIcon(entry.rank)}
                </div>
                <div className="col-span-5">
                  <span className="font-medium">{entry.name}</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-2xl font-bold tabular-nums">
                    {entry.wpm}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">WPM</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-xl font-semibold tabular-nums">
                    {entry.accuracy}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 justify-center flex-wrap">
        {isHost && onRestart && (
          <button
            onClick={onRestart}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restart Game
          </button>
        )}
        <button
          onClick={() => router.push('/room/create')}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
        >
          Create New Room
        </button>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 border rounded-lg font-medium hover:bg-accent"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
