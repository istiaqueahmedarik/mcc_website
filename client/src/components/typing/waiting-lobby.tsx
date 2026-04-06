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
  const [scheduleInput, setScheduleInput] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

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
  const minScheduleInput = useMemo(() => {
    const minDate = new Date(nowMs + 30000);
    const tzOffset = minDate.getTimezoneOffset() * 60000;
    return new Date(minDate.getTime() - tzOffset).toISOString().slice(0, 16);
  }, [nowMs]);

  const scheduleCountdown = useMemo(() => {
    if (!scheduledDate) return null;
    const diffMs = scheduledDate.getTime() - nowMs;
    if (diffMs <= 0) return "Starting now...";

    const totalSeconds = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `Auto starts in ${mins}:${secs.toString().padStart(2, "0")}`;
  }, [scheduledDate, nowMs]);

  const handleSchedule = async () => {
    if (!scheduleInput) return;

    const localDate = new Date(scheduleInput);
    if (
      Number.isNaN(localDate.getTime()) ||
      localDate.getTime() <= Date.now()
    ) {
      setScheduleError("Please select a future time.");
      return;
    }

    setIsScheduling(true);
    setScheduleError(null);
    try {
      await onScheduleStart(localDate.toISOString());
      setScheduleInput("");
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

          <div className="border rounded-lg p-4 max-w-xl mx-auto text-left space-y-3">
            <p className="text-sm font-medium">Or schedule auto-start</p>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="datetime-local"
                value={scheduleInput}
                onChange={(e) => {
                  setScheduleInput(e.target.value);
                  if (scheduleError) setScheduleError(null);
                }}
                className="flex-1 px-3 py-2 border rounded-md"
                min={minScheduleInput}
              />
              <button
                onClick={handleSchedule}
                disabled={!scheduleInput || isScheduling}
                className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isScheduling ? "Saving..." : "Schedule"}
              </button>
              {scheduledDate && (
                <button
                  onClick={handleClearSchedule}
                  disabled={isScheduling}
                  className="px-4 py-2 border rounded-md font-medium hover:bg-accent disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
            {scheduleError && (
              <p className="text-sm text-red-600">{scheduleError}</p>
            )}
            {scheduledDate && (
              <p className="text-sm text-muted-foreground">
                Scheduled for {scheduledDate.toLocaleString()}{" "}
                {scheduleCountdown ? `(${scheduleCountdown})` : ""}
              </p>
            )}
          </div>
        </div>
      )}

      {!isCreator && (
        <div className="text-center">
          {scheduledDate ? (
            <p className="text-muted-foreground">
              Game is scheduled for {scheduledDate.toLocaleString()}.{" "}
              {scheduleCountdown}
            </p>
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
    </div>
  );
}
