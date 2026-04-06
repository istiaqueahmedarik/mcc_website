'use client'

import { RoomState } from '@/hooks/use-websocket'
import { Users, Clock, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface WaitingLobbyProps {
  roomCode: string
  roomState: RoomState
  participantId: string | null
  onStartGame: () => void
}

export function WaitingLobby({ roomCode, roomState, participantId, onStartGame }: WaitingLobbyProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isCreator = roomState.participants[0]?.id === participantId

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Waiting for Players</h1>
        
        <div className="inline-flex items-center gap-3 bg-muted px-6 py-3 rounded-lg">
          <span className="text-sm text-muted-foreground">Room Code:</span>
          <span className="text-3xl font-mono font-bold">{roomCode}</span>
          <button
            onClick={handleCopyCode}
            className="p-2 hover:bg-background rounded-md transition-colors"
            title="Copy room code"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{roomState.timeLimit}s</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{roomState.participants.length} player(s)</span>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Players in Room</h2>
        <div className="space-y-2">
          {roomState.participants.map((participant, index) => (
            <div
              key={participant.id}
              className={`flex items-center justify-between p-3 rounded-md ${
                participant.id === participantId
                  ? 'bg-primary/10 border border-primary'
                  : 'bg-muted'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-semibold">
                  {index + 1}
                </div>
                <span className="font-medium">{participant.name}</span>
                {participant.id === participantId && (
                  <span className="text-xs text-muted-foreground">(You)</span>
                )}
                {index === 0 && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                    Host
                  </span>
                )}
              </div>
              <div className="w-3 h-3 rounded-full bg-green-500" title="Connected" />
            </div>
          ))}
        </div>
      </div>

      {isCreator && (
        <div className="text-center space-y-3">
          <button
            onClick={onStartGame}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors"
          >
            Start Game
          </button>
          <p className="text-sm text-muted-foreground">
            You are the host. Click to start the game when ready.
          </p>
        </div>
      )}

      {!isCreator && (
        <div className="text-center">
          <p className="text-muted-foreground">
            Waiting for host to start the game...
          </p>
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground">
        <p>Share the room code with friends to join!</p>
      </div>
    </div>
  )
}
