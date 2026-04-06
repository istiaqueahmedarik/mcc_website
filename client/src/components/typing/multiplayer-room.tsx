'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSupabaseRealtime } from '@/hooks/use-supabase-realtime'
import { NameEntryModal } from './name-entry-modal'
import { WaitingLobby } from './waiting-lobby'
import { MultiplayerTyping } from './multiplayer-typing'
import { Leaderboard } from './leaderboard'

interface MultiplayerRoomProps {
  roomCode: string
}

export function MultiplayerRoom({ roomCode }: MultiplayerRoomProps) {
  const [userName, setUserName] = useState<string | null>(null)
  const [fixedWordSet, setFixedWordSet] = useState<string[]>([])
  const [localFinalStats, setLocalFinalStats] = useState<{wpm: number, accuracy: number} | null>(null)

  const {
    isConnected,
    roomState,
    participantId,
    leaderboard,
    error: wsError,
    sendProgress,
    sendComplete,
    startGame,
    restartGame,
    completeRoom
  } = useSupabaseRealtime(roomCode, userName)

  // Fix the word list when game starts
  useEffect(() => {
    if (roomState?.status === 'active' && roomState.wordSet && fixedWordSet.length === 0) {
      setFixedWordSet([...roomState.wordSet])
    }
    // Reset word list when game restarts (goes back to waiting)
    if (roomState?.status === 'waiting') {
      setFixedWordSet([])
    }
  }, [roomState?.status, roomState?.wordSet])

  const isHost = roomState?.participants[0]?.id === participantId

  const finalLeaderboard = useMemo(() => {
    const updated = leaderboard.map(entry => {
      // Always treat numbers cleanly
      let wpm = Number(entry.wpm) || 0
      let accuracy = Number(entry.accuracy) || 0

      // 1. Fallback via live participants data for anyone missing final scores
      const participant = roomState?.participants.find(p => p.name === entry.name)
      if (participant) {
        wpm = Math.max(wpm, participant.wpm || participant.currentWpm || 0)
        accuracy = Math.max(accuracy, participant.accuracy || 0)
      }

      // 2. Absolute override for current local user using our exact final stats computation
      if (entry.name === userName && localFinalStats) {
        wpm = Math.max(wpm, localFinalStats.wpm)
        accuracy = Math.max(accuracy, localFinalStats.accuracy)
      }

      return { ...entry, wpm, accuracy: Math.min(100, Math.round(accuracy)) }
    })
    
    // Hard re-sort everything accurately using our new numbers
    updated.sort((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy)

    // Re-index rank
    return updated.map((entry, idx) => ({ ...entry, rank: idx + 1 }))
  }, [leaderboard, roomState?.participants, userName, localFinalStats])

  if (!userName) {
    return <NameEntryModal onSubmit={setUserName} roomCode={roomCode} />
  }

  if (!roomState) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-lg">Connecting to room...</div>
          {wsError && <div className="text-destructive text-sm mt-2">{wsError}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4">
      {!isConnected && (
        <div className="mb-4 text-sm text-amber-500">
          Realtime is reconnecting. Live updates may be delayed.
        </div>
      )}

      {roomState.status === 'waiting' && (
        <WaitingLobby
          roomCode={roomCode}
          roomState={roomState}
          participantId={participantId}
          onStartGame={startGame}
        />
      )}

      {roomState.status === 'active' && (
        <MultiplayerTyping
          roomState={{ ...roomState, wordSet: fixedWordSet.length > 0 ? fixedWordSet : roomState.wordSet }}
          participantId={participantId}
          onProgress={sendProgress}
          onComplete={async (wpm, accuracy, stats) => {
            setLocalFinalStats({ wpm, accuracy })
            await sendComplete(wpm, accuracy, stats)
          }}
          onTimeUp={completeRoom}
        />
      )}

      {roomState.status === 'completed' && (
        <Leaderboard
          leaderboard={finalLeaderboard}
          roomCode={roomCode}
          participantId={participantId}
          isHost={isHost}
          onRestart={() => {
            setLocalFinalStats(null)
            restartGame()
          }}
        />
      )}
    </div>
  )
}
