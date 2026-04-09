"use client";

import { RoomState } from "@/hooks/use-supabase-realtime";
import { Check, Clock, Copy, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface WaitingLobbyProps {
  roomCode: string;
  roomState: RoomState;
  participantId: string | null;
  onStartGame: () => void;
  onScheduleStart: (scheduledStartTime: string | null) => Promise<void> | void;
}

export function WaitingLobby({
  roomCode,
  roomState,
  participantId,
  onStartGame,
  onScheduleStart,
}: WaitingLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [quickTimerMinutes, setQuickTimerMinutes] = useState(1);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCreator = roomState.participants[0]?.id === participantId;
  const scheduledDate = roomState.scheduledStartTime
    ? new Date(roomState.scheduledStartTime)
    : null;


  const scheduleCountdown = useMemo(() => {
    if (!scheduledDate) return null;
    const diffMs = scheduledDate.getTime() - nowMs;
    if (diffMs <= 0) return { text: "Starting now...", mins: 0, secs: 0, progress: 0 };

    const totalSeconds = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    // Calculate progress (assume max 60 minutes for progress bar)
    const maxSeconds = 60 * 60;
    const progress = Math.min(100, ((maxSeconds - totalSeconds) / maxSeconds) * 100);
    
    return { 
      text: `Auto starts in ${mins}:${secs.toString().padStart(2, "0")}`,
      mins,
      secs,
      progress
    };
  }, [scheduledDate, nowMs]);

  const handleQuickTimer = async () => {
    const futureDate = new Date(Date.now() + quickTimerMinutes * 60 * 1000);
    setIsScheduling(true);
    setScheduleError(null);
    try {
      await onScheduleStart(futureDate.toISOString());
    } finally {
      setIsScheduling(false);
    }
  };

  const handleClearSchedule = async () => {
    setIsScheduling(true);
    try {
      await onScheduleStart(null);
    } finally {
      setIsScheduling(false);
    }
  };

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

          <div className="border rounded-lg p-5 max-w-xl mx-auto bg-muted/30">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4" />
              <p className="text-sm font-medium">Schedule Auto-Start</p>
            </div>

            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Start in:</span>
                  <span className="font-semibold">{quickTimerMinutes} {quickTimerMinutes === 1 ? 'minute' : 'minutes'}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={quickTimerMinutes}
                  onChange={(e) => setQuickTimerMinutes(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
              </div>

              {/* Quick Options */}
              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 5, 10, 15, 30].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setQuickTimerMinutes(mins)}
                    className={`px-2 py-1.5 rounded text-sm font-medium transition-colors ${
                      quickTimerMinutes === mins
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-accent'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              <button
                onClick={handleQuickTimer}
                disabled={isScheduling}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isScheduling ? "Setting..." : "Set Timer"}
              </button>
            </div>

            {scheduleError && (
              <p className="mt-3 text-sm text-red-600">{scheduleError}</p>
            )}

            {scheduledDate && scheduleCountdown && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Starting in</p>
                  <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                    <span>{scheduleCountdown.mins.toString().padStart(2, '0')}</span>
                    <span className="text-muted-foreground">:</span>
                    <span>{scheduleCountdown.secs.toString().padStart(2, '0')}</span>
                  </div>
                </div>
                <button
                  onClick={handleClearSchedule}
                  disabled={isScheduling}
                  className="w-full px-3 py-1.5 text-sm border rounded-md hover:bg-accent disabled:opacity-50"
                >
                  Cancel Timer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!isCreator && (
        <div className="text-center">
          {scheduledDate && scheduleCountdown ? (
            <div className="inline-block">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Clock className="w-4 h-4" />
                <span>Game starting in</span>
              </div>
              <div className="text-3xl font-bold">
                {scheduleCountdown.mins.toString().padStart(2, '0')}:{scheduleCountdown.secs.toString().padStart(2, '0')}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Waiting for host to start the game...
            </p>
          )}
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground">
        <p>Share the room code with friends to join!</p>
      </div>

      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Players in Room</h2>
        <div className="space-y-2">
          {roomState.participants.map((participant, index) => (
            <div
              key={participant.id}
              className={`flex items-center justify-between p-3 rounded-md ${
                participant.id === participantId
                  ? "bg-primary/10 border border-primary"
                  : "bg-muted"
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
              <div
                className="w-3 h-3 rounded-full bg-green-500"
                title="Connected"
              />
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}
