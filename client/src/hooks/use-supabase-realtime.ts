'use server'
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Participant {
  id: string;
  name: string;
  progress: number;
  wpm?: number;
  currentWpm: number;
  accuracy: number;
  completed: boolean;
}

export interface RoomState {
  roomId: string;
  roomCode: string;
  status: 'waiting' | 'active' | 'completed';
  timeLimit: number;
  wordSet: string[];
  scheduledStartTime?: number;
  startedAt?: number;
  participants: Participant[];
}

interface LeaderboardEntry {
  id?: string;
  rank: number;
  name: string;
  wpm: number;
  accuracy: number;
  completed: boolean;
}

interface CachedFinalStats {
  wpm: number;
  accuracy: number;
}

export function useSupabaseRealtime(roomCode: string, userName: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const hasJoinedRef = useRef(false);
  const finalStatsByIdRef = useRef<Record<string, CachedFinalStats>>({});
  const finalStatsByNameRef = useRef<Record<string, CachedFinalStats>>({});
  const participantNamesByIdRef = useRef<Record<string, string>>({});

  const cacheStorageKey = `typing-final-stats:${roomCode}`;

  const persistStatsCache = useCallback(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(
      cacheStorageKey,
      JSON.stringify({
        byId: finalStatsByIdRef.current,
        byName: finalStatsByNameRef.current,
      })
    );
  }, [cacheStorageKey]);

  const restoreStatsCache = useCallback(() => {
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem(cacheStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      finalStatsByIdRef.current = parsed?.byId ?? {};
      finalStatsByNameRef.current = parsed?.byName ?? {};
    } catch {
      finalStatsByIdRef.current = {};
      finalStatsByNameRef.current = {};
    }
  }, [cacheStorageKey]);

  const cacheParticipantStats = useCallback((id: string | undefined, name: string | undefined, wpm: number, accuracy: number) => {
    const safeWpm = Number.isFinite(wpm) ? Math.round(wpm) : 0;
    const safeAccuracy = Number.isFinite(accuracy) ? Math.round(accuracy) : 0;

    if (id) {
      finalStatsByIdRef.current[id] = { wpm: safeWpm, accuracy: safeAccuracy };
    }

    if (name) {
      finalStatsByNameRef.current[name] = { wpm: safeWpm, accuracy: safeAccuracy };
    }

    persistStatsCache();
  }, [persistStatsCache]);

  const withCachedFinalStats = useCallback((entry: LeaderboardEntry): LeaderboardEntry => {
    if (entry.wpm !== 0 || entry.accuracy !== 0) {
      return entry;
    }

    const byId = entry.id ? finalStatsByIdRef.current[entry.id] : undefined;
    const byName = finalStatsByNameRef.current[entry.name];
    const cached = byId ?? byName;

    if (!cached) {
      return entry;
    }

    return {
      ...entry,
      wpm: cached.wpm,
      accuracy: cached.accuracy,
    };
  }, []);

  useEffect(() => {
    restoreStatsCache();
  }, [restoreStatsCache]);

  useEffect(() => {
    if (!roomState?.participants) return;
    const nextMap: Record<string, string> = {};
    roomState.participants.forEach((p) => {
      nextMap[p.id] = p.name;
    });
    participantNamesByIdRef.current = nextMap;
  }, [roomState?.participants]);

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/typing/participants/rooms/${roomCode}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch participants (${response.status})`);
      }

      const data = await response.json();
      if (data.success) {
        const participants = data.participants.map((p: any) => ({
          id: p.id,
          name: p.userName,
          progress: p.progress,
          wpm: p.wpm,
          currentWpm: p.currentWpm,
          accuracy: p.accuracy,
          completed: p.completed,
        }));

        participants.forEach((p: Participant) => {
          if (p.completed || p.wpm || p.currentWpm || p.accuracy) {
            cacheParticipantStats(p.id, p.name, p.wpm ?? p.currentWpm ?? 0, p.accuracy ?? 0);
          }
        });

        setRoomState(prev => prev ? { ...prev, participants } : null);
      }
    } catch (err) {
      console.error('Error fetching participants:', err);
    }
  }, [roomCode]);

  // Fetch current room state
  const fetchRoomState = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/typing/rooms/${roomCode}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch room (${response.status})`);
      }

      const data = await response.json();
      if (data.success) {
        setRoomState((prev) => ({
          roomId: data.room.id,
          roomCode: data.room.roomCode,
          status: data.room.status,
          timeLimit: data.room.timeLimit,
          wordSet: typeof data.room.wordSet === 'string' ? JSON.parse(data.room.wordSet) : data.room.wordSet,
          scheduledStartTime: data.room.scheduledStartTime ? new Date(data.room.scheduledStartTime).getTime() : undefined,
          startedAt: data.room.startedAt ? new Date(data.room.startedAt).getTime() : undefined,
          participants: prev?.participants ?? [],
        }));

        await fetchParticipants();
      } else {
        setError(data.error || 'Failed to fetch room state');
      }
    } catch (err) {
      console.error('Error fetching room state:', err);
      setError('Failed to fetch room state');
    }
  }, [roomCode, fetchParticipants]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/typing/rooms/${roomCode}/leaderboard`);
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard (${response.status})`);
      }

      const data = await response.json();
      if (data.success) {
        const mappedLeaderboard = data.leaderboard.map((entry: any, index: number) => withCachedFinalStats({
          id: entry.id,
          rank: index + 1,
          name: entry.userName,
          wpm: entry.wpm,
          accuracy: entry.accuracy,
          completed: entry.completed,
        }));
        setLeaderboard(mappedLeaderboard);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  }, [roomCode, withCachedFinalStats]);

  // Join room once user is known.
  const joinRoom = useCallback(async () => {
    if (!userName) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/typing/rooms/${roomCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to join room (${response.status})`);
      }

      const data = await response.json();
      if (data.success) {
        setParticipantId(data.participant.id);
        await fetchRoomState();

        channelRef.current?.send({
          type: 'broadcast',
          event: 'participant_joined',
          payload: {
            participantId: data.participant.id,
          },
        });
      } else {
        setError(data.error || 'Failed to join room');
      }
    } catch (err) {
      console.error('Error joining room:', err);
      setError('Failed to join room');
    }
  }, [roomCode, userName, fetchRoomState]);

  useEffect(() => {
    if (!userName || !roomCode) return;
    if (hasJoinedRef.current) return;

    hasJoinedRef.current = true;
    joinRoom();
  }, [roomCode, userName, joinRoom]);

  // Setup Supabase Realtime channel
  useEffect(() => {
    if (!userName || !roomCode) return;

    const channel = supabase.channel(`room:${roomCode}`, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on('broadcast', { event: 'participant_update' }, ({ payload }) => {
        if (payload?.participantId && (payload.wpm !== undefined || payload.currentWpm !== undefined || payload.accuracy !== undefined)) {
          cacheParticipantStats(
            payload.participantId,
            participantNamesByIdRef.current[payload.participantId],
            payload.wpm ?? payload.currentWpm ?? 0,
            payload.accuracy ?? 0
          );
        }

        setRoomState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            participants: prev.participants.map(p =>
              p.id === payload.participantId
                ? {
                    ...p,
                    progress: payload.progress ?? p.progress,
                    wpm: payload.wpm ?? p.wpm,
                    currentWpm: payload.currentWpm ?? p.currentWpm,
                    accuracy: payload.accuracy ?? p.accuracy,
                    completed: payload.completed ?? p.completed,
                  }
                : p
            ),
          };
        });
      })
      .on('broadcast', { event: 'room_status' }, ({ payload }) => {
        setRoomState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            status: payload.status,
            scheduledStartTime: payload.scheduledStartTime
              ? new Date(payload.scheduledStartTime).getTime()
              : payload.scheduledStartTime === null
                ? undefined
                : prev.scheduledStartTime,
            startedAt: payload.startedAt ? new Date(payload.startedAt).getTime() : prev.startedAt,
            wordSet: payload.wordSet ?? prev.wordSet,
          };
        });

        if (payload.status === 'waiting') {
          fetchParticipants();
        }
      })
      .on('broadcast', { event: 'game_started' }, ({ payload }) => {
        setRoomState(prev => prev ? { ...prev, status: 'active', startedAt: payload.startedAt } : null);
      })
      .on('broadcast', { event: 'game_ended' }, () => {
        setRoomState(prev => prev ? { ...prev, status: 'completed' } : null);
        fetchLeaderboard();
      })
      .on('broadcast', { event: 'participant_joined' }, () => {
        fetchParticipants();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
          fetchParticipants();
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setError('Realtime connection timed out. Retrying...');
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        } else if (status === 'CHANNEL_ERROR') {
          setError('Connection error');
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [roomCode, userName, fetchParticipants, fetchLeaderboard, cacheParticipantStats]);

  // Fallback polling while realtime is disconnected.
  useEffect(() => {
    if (!roomState || isConnected) return;

    const intervalId = setInterval(() => {
      fetchParticipants();
    }, 2000);

    return () => clearInterval(intervalId);
  }, [roomState, isConnected, fetchParticipants]);

  // Lightweight room-state polling while waiting so scheduled auto-start is reflected for everyone.
  useEffect(() => {
    if (!roomState || roomState.status !== 'waiting') return;

    const intervalId = setInterval(() => {
      fetchRoomState();
    }, 1000);

    return () => clearInterval(intervalId);
  }, [roomState?.status, fetchRoomState]);

  // Send progress update
  const sendProgress = useCallback(async (progress: number, currentWpm: number, accuracy: number) => {
    if (!participantId) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/typing/participants/${participantId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress, currentWpm, accuracy }),
      });

      channelRef.current?.send({
        type: 'broadcast',
        event: 'participant_update',
        payload: {
          participantId,
          progress,
          currentWpm,
          accuracy,
        },
      });
    } catch (err) {
      console.error('Error sending progress:', err);
    }
  }, [participantId]);

  // Send completion
  const sendComplete = useCallback(async (wpm: number, accuracy: number, stats: any) => {
    if (!participantId) return;

    try {
      const selfName = roomState?.participants.find(p => p.id === participantId)?.name;
      cacheParticipantStats(participantId, selfName, wpm, accuracy);

      await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/typing/participants/${participantId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wpm, accuracy, completed: true }),
      });

      channelRef.current?.send({
        type: 'broadcast',
        event: 'participant_update',
        payload: {
          participantId,
          wpm,
          accuracy,
          completed: true,
        },
      });

      setTimeout(() => fetchParticipants(), 1000);
    } catch (err) {
      console.error('Error sending complete:', err);
    }
  }, [participantId, fetchParticipants, roomState?.participants, cacheParticipantStats]);

  // Start game
  const startGame = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/typing/rooms/${roomCode}/start`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'game_started',
          payload: {
            startedAt: new Date(data.room.startedAt).getTime(),
          },
        });
      }
    } catch (err) {
      console.error('Error starting game:', err);
    }
  }, [roomCode]);

  // Restart game
  const restartGame = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/typing/rooms/${roomCode}/restart`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'room_status',
          payload: {
            status: 'waiting',
            scheduledStartTime: null,
            wordSet: typeof data.room.wordSet === 'string' ? JSON.parse(data.room.wordSet) : data.room.wordSet,
          },
        });

        setRoomState(prev => prev ? {
          ...prev,
          status: 'waiting',
          scheduledStartTime: undefined,
          startedAt: undefined,
          wordSet: typeof data.room.wordSet === 'string' ? JSON.parse(data.room.wordSet) : data.room.wordSet,
        } : prev);
      }
    } catch (err) {
      console.error('Error restarting game:', err);
    }
  }, [roomCode]);

  const scheduleGameStart = useCallback(async (scheduledStartTime: string | null) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/typing/rooms/${roomCode}/schedule-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledStartTime }),
      });

      const data = await response.json();
      if (data.success) {
        const parsedSchedule = data.room.scheduledStartTime ? new Date(data.room.scheduledStartTime).getTime() : undefined;

        setRoomState(prev => prev ? {
          ...prev,
          scheduledStartTime: parsedSchedule,
        } : prev);

        channelRef.current?.send({
          type: 'broadcast',
          event: 'room_status',
          payload: {
            status: 'waiting',
            scheduledStartTime: data.room.scheduledStartTime,
          },
        });
      }
    } catch (err) {
      console.error('Error scheduling game start:', err);
    }
  }, [roomCode]);

  const completeRoom = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/typing/rooms/${roomCode}/complete`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        setRoomState(prev => prev ? { ...prev, status: 'completed' } : null);

        channelRef.current?.send({
          type: 'broadcast',
          event: 'game_ended',
          payload: {
            completedAt: new Date(data.room.completedAt).getTime(),
          },
        });

        await fetchLeaderboard();
      }
    } catch (err) {
      console.error('Error completing room:', err);
    }
  }, [roomCode, fetchLeaderboard]);

  return {
    isConnected,
    roomState,
    participantId,
    leaderboard,
    error,
    sendProgress,
    sendComplete,
    startGame,
    restartGame,
    scheduleGameStart,
    completeRoom,
    fetchLeaderboard,
  };
}
