'use client'

import { useParams } from 'next/navigation'
import { MultiplayerRoom } from '@/components/typing/multiplayer-room'

export default function RoomPage() {
  const params = useParams()
  const roomCode = params.code as string

  return (
    <div className="min-h-screen py-6">
      <MultiplayerRoom roomCode={roomCode.toUpperCase()} />
    </div>
  )
}
