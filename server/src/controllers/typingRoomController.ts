import { Context } from 'hono';
import sql from '../db';
import { uuidv7 } from 'uuidv7';

const RETRYABLE_DB_ERROR_CODES = new Set([
  'CONNECTION_CLOSED',
  'CONNECTION_ENDED',
  'CONNECT_TIMEOUT',
]);

const SCHEDULER_MAX_DB_RETRIES = 3;
const SCHEDULER_RETRY_DELAY_MS = 500;

type DbLikeError = {
  code?: string;
  message?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const isDbConnectionError = (error: unknown): boolean => {
  const code = (error as DbLikeError | null | undefined)?.code;
  return typeof code === 'string' && RETRYABLE_DB_ERROR_CODES.has(code);
};

// Helper function to generate room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Remove ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const createRoom = async (c: Context) => {
  try {
    const body = await c.req.json();
    const timeLimit = body.timeLimit || 60;
    const difficulty = body.difficulty || null;
    const scheduledStartTime = body.scheduledStartTime || null;
    const maxParticipants = body.maxParticipants || 1000;
    const roomName = body.name || null;
    
    // Generate unique room code
    const roomCode = generateRoomCode();
    const roomId = uuidv7();
    
    // Fetch random words for the room (filtered by difficulty if specified)
    const wordLimit = Math.ceil(timeLimit * 3);
    let words;
    
    if (difficulty) {
      words = await sql`
        SELECT word FROM words 
        WHERE difficulty = ${parseInt(difficulty)}
        ORDER BY RANDOM() 
        LIMIT ${wordLimit}
      `;
    } else {
      words = await sql`
        SELECT word FROM words 
        ORDER BY RANDOM() 
        LIMIT ${wordLimit}
      `;
    }
    
    const wordArray = words.map((r: any) => r.word);
    
    // Insert room into database
    const [room] = await sql`
      INSERT INTO rooms (
        id, name, room_code, time, status, scheduled_start_time, 
        max_participants, word_set
      ) VALUES (
        ${roomId}, ${roomName}, ${roomCode}, ${timeLimit}, 'waiting',
        ${scheduledStartTime ? new Date(scheduledStartTime) : null},
        ${maxParticipants}, ${JSON.stringify(wordArray)}
      )
      RETURNING id, name, room_code, time, status, scheduled_start_time, 
                max_participants, word_set, created_at
    `;
    
    return c.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        roomCode: room.room_code,
        timeLimit: room.time,
        status: room.status,
        scheduledStartTime: room.scheduled_start_time,
        maxParticipants: room.max_participants,
        wordSet: room.word_set,
        wordCount: wordArray.length,
        createdAt: room.created_at
      }
    });
  } catch (error) {
    console.error('Error creating room:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create room'
    }, 500);
  }
};

export const getRoomByCode = async (c: Context) => {
  try {
    const roomCode = c.req.param('code').toUpperCase();
    
    const [room] = await sql`
      SELECT 
        r.id, r.name, r.room_code, r.time, r.status, r.scheduled_start_time,
        r.max_participants, r.word_set, r.created_at, r.started_at, r.completed_at,
        COUNT(rp.id) as participant_count
      FROM rooms r
      LEFT JOIN room_participants rp ON r.id = rp.room_id
      WHERE r.room_code = ${roomCode}
      GROUP BY r.id
    `;
    
    if (!room) {
      return c.json({
        success: false,
        error: 'Room not found'
      }, 404);
    }
    
    return c.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        roomCode: room.room_code,
        timeLimit: room.time,
        status: room.status,
        scheduledStartTime: room.scheduled_start_time,
        maxParticipants: room.max_participants,
        participantCount: parseInt(room.participant_count),
        wordSet: room.word_set,
        createdAt: room.created_at,
        startedAt: room.started_at,
        completedAt: room.completed_at
      }
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch room'
    }, 500);
  }
};

export const joinRoom = async (c: Context) => {
  try {
    const roomCode = c.req.param('code').toUpperCase();
    const body = await c.req.json();
    const userName = body.userName || 'Anonymous';
    
    // Get room
    const [room] = await sql`
      SELECT id, status, max_participants FROM rooms 
      WHERE room_code = ${roomCode}
    `;
    
    if (!room) {
      return c.json({
        success: false,
        error: 'Room not found'
      }, 404);
    }
    
    if (room.status !== 'waiting') {
      return c.json({
        success: false,
        error: 'Room has already started or completed'
      }, 400);
    }
    
    // Check participant count
    const [countResult] = await sql`
      SELECT COUNT(*) as count FROM room_participants 
      WHERE room_id = ${room.id}
    `;
    
    if (parseInt(countResult.count) >= room.max_participants) {
      return c.json({
        success: false,
        error: 'Room is full'
      }, 400);
    }

    // Prevent duplicate names within the same room.
    const [existingParticipant] = await sql`
      SELECT id FROM room_participants
      WHERE room_id = ${room.id}
        AND LOWER(user_name) = LOWER(${userName})
      LIMIT 1
    `;

    if (existingParticipant) {
      return c.json({
        success: false,
        error: 'This name is already taken in this room. Please choose a different name.'
      }, 409);
    }
    
    // Create participant
    const participantId = uuidv7();
    const [participant] = await sql`
      INSERT INTO room_participants (
        id, room_id, user_name, wpm, accuracy, progress, current_wpm, completed
      ) VALUES (
        ${participantId}, ${room.id}, ${userName}, 0, 0.0, 0, 0, false
      )
      RETURNING id, room_id, user_name, wpm, accuracy, progress, current_wpm, 
                completed, joined_at
    `;
    
    return c.json({
      success: true,
      participant: {
        id: participant.id,
        roomId: participant.room_id,
        userName: participant.user_name,
        wpm: participant.wpm,
        accuracy: participant.accuracy,
        progress: participant.progress,
        currentWpm: participant.current_wpm,
        completed: participant.completed,
        joinedAt: participant.joined_at
      }
    });
  } catch (error) {
    console.error('Error joining room:', error);

    const err = error as { code?: string; constraint_name?: string; detail?: string; message?: string };
    if (err?.code === '23505') {
      return c.json({
        success: false,
        error: 'This name is already taken in this room. Please choose a different name.'
      }, 409);
    }

    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join room'
    }, 500);
  }
};

export const startRoom = async (c: Context) => {
  try {
    const roomCode = c.req.param('code').toUpperCase();
    
    const [room] = await sql`
      UPDATE rooms 
      SET status = 'active', started_at = NOW(), scheduled_start_time = NULL
      WHERE room_code = ${roomCode} AND status = 'waiting'
      RETURNING id, room_code, status, started_at
    `;
    
    if (!room) {
      return c.json({
        success: false,
        error: 'Room not found or already started'
      }, 404);
    }
    
    return c.json({
      success: true,
      room: {
        id: room.id,
        roomCode: room.room_code,
        status: room.status,
        startedAt: room.started_at
      }
    });
  } catch (error) {
    console.error('Error starting room:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start room'
    }, 500);
  }
};

export const getLeaderboard = async (c: Context) => {
  try {
    const roomCode = c.req.param('code').toUpperCase();
    
    // Get room
    const [room] = await sql`
      SELECT id FROM rooms WHERE room_code = ${roomCode}
    `;
    
    if (!room) {
      return c.json({
        success: false,
        error: 'Room not found'
      }, 404);
    }
    
    // Get participants sorted by performance
    const participants = await sql`
      SELECT 
        id, user_name, wpm, accuracy, progress, completed, finished_at
      FROM room_participants
      WHERE room_id = ${room.id}
      ORDER BY completed DESC, wpm DESC, accuracy DESC
    `;
    
    return c.json({
      success: true,
      leaderboard: participants.map((p: any) => ({
        id: p.id,
        userName: p.user_name,
        wpm: p.wpm,
        accuracy: p.accuracy,
        progress: p.progress,
        completed: p.completed,
        finishedAt: p.finished_at
      }))
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch leaderboard'
    }, 500);
  }
};

export const completeRoom = async (c: Context) => {
  try {
    const roomCode = c.req.param('code').toUpperCase();
    
    const [room] = await sql`
      UPDATE rooms 
      SET status = 'completed', completed_at = NOW()
      WHERE room_code = ${roomCode} AND status = 'active'
      RETURNING id, room_code, status, completed_at
    `;
    
    if (!room) {
      return c.json({
        success: false,
        error: 'Room not found or not active'
      }, 404);
    }
    
    // Auto-complete any participants who haven't finished, copying current_wpm to wpm
    await sql`
      UPDATE room_participants
      SET 
        wpm = CASE WHEN wpm = 0 THEN current_wpm ELSE wpm END,
        completed = true,
        finished_at = COALESCE(finished_at, NOW())
      WHERE room_id = ${room.id} AND completed = false
    `;
    
    return c.json({
      success: true,
      room: {
        id: room.id,
        roomCode: room.room_code,
        status: room.status,
        completedAt: room.completed_at
      }
    });
  } catch (error) {
    console.error('Error completing room:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete room'
    }, 500);
  }
};

export const restartRoom = async (c: Context) => {
  try {
    const roomCode = c.req.param('code').toUpperCase();

    const [existingRoom] = await sql`
      SELECT id, time FROM rooms WHERE room_code = ${roomCode}
    `;

    if (!existingRoom) {
      return c.json({
        success: false,
        error: 'Room not found'
      }, 404);
    }

    const wordLimit = Math.ceil(Number(existingRoom.time || 60) * 3);
    const words = await sql`
      SELECT word FROM words
      ORDER BY RANDOM()
      LIMIT ${wordLimit}
    `;
    const wordArray = words.map((r: any) => r.word);
    
    // Reset room status
    const [room] = await sql`
      UPDATE rooms 
      SET status = 'waiting', started_at = NULL, completed_at = NULL, scheduled_start_time = NULL, word_set = ${JSON.stringify(wordArray)}
      WHERE id = ${existingRoom.id}
      RETURNING id, room_code, status, word_set, scheduled_start_time
    `;
    
    if (!room) {
      return c.json({
        success: false,
        error: 'Room not found'
      }, 404);
    }
    
    // Reset participants
    await sql`
      UPDATE room_participants
      SET 
        wpm = 0,
        accuracy = 0.0,
        progress = 0,
        current_wpm = 0,
        completed = false,
        finished_at = NULL
      WHERE room_id = ${room.id}
    `;
    
    return c.json({
      success: true,
      room: {
        id: room.id,
        roomCode: room.room_code,
        status: room.status,
        wordSet: room.word_set,
        scheduledStartTime: room.scheduled_start_time
      }
    });
  } catch (error) {
    console.error('Error restarting room:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restart room'
    }, 500);
  }
};

export const scheduleRoomStart = async (c: Context) => {
  try {
    const roomCode = c.req.param('code').toUpperCase();
    const body = await c.req.json();
    const scheduledStartTime = body?.scheduledStartTime;

    if (!scheduledStartTime) {
      const [room] = await sql`
        UPDATE rooms
        SET scheduled_start_time = NULL
        WHERE room_code = ${roomCode} AND status = 'waiting'
        RETURNING id, room_code, status, scheduled_start_time
      `;

      if (!room) {
        return c.json({
          success: false,
          error: 'Room not found or already started'
        }, 404);
      }

      return c.json({
        success: true,
        room: {
          id: room.id,
          roomCode: room.room_code,
          status: room.status,
          scheduledStartTime: room.scheduled_start_time
        }
      });
    }

    const parsed = new Date(scheduledStartTime);
    if (Number.isNaN(parsed.getTime())) {
      return c.json({
        success: false,
        error: 'Invalid scheduled start time'
      }, 400);
    }

    const [room] = await sql`
      UPDATE rooms
      SET scheduled_start_time = ${parsed}
      WHERE room_code = ${roomCode} AND status = 'waiting'
      RETURNING id, room_code, status, scheduled_start_time
    `;

    if (!room) {
      return c.json({
        success: false,
        error: 'Room not found or already started'
      }, 404);
    }

    return c.json({
      success: true,
      room: {
        id: room.id,
        roomCode: room.room_code,
        status: room.status,
        scheduledStartTime: room.scheduled_start_time
      }
    });
  } catch (error) {
    console.error('Error scheduling room start:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to schedule room start'
    }, 500);
  }
};

export const autoStartScheduledRooms = async () => {
  for (let attempt = 1; attempt <= SCHEDULER_MAX_DB_RETRIES; attempt += 1) {
    try {
      const startedRooms = await sql`
        UPDATE rooms
        SET status = 'active', started_at = NOW(), scheduled_start_time = NULL
        WHERE status = 'waiting'
          AND scheduled_start_time IS NOT NULL
          AND scheduled_start_time <= NOW()
        RETURNING id, room_code, started_at
      `;

      if (startedRooms.length > 0) {
        const startedRoomsList = startedRooms as unknown as Array<{
          room_code: string;
          started_at: Date;
        }>;

        for (const room of startedRoomsList) {
          console.log(`⏰ Auto-started typing room ${room.room_code} at ${room.started_at.toISOString()}`);
        }
      }

      return;
    } catch (error) {
      const timestamp = new Date().toISOString();
      const canRetry = isDbConnectionError(error) && attempt < SCHEDULER_MAX_DB_RETRIES;

      if (canRetry) {
        const delayMs = SCHEDULER_RETRY_DELAY_MS * attempt;
        console.warn(
          `[${timestamp}] Auto-start scheduler DB disconnect on attempt ${attempt}/${SCHEDULER_MAX_DB_RETRIES}. Retrying in ${delayMs}ms.`,
          error,
        );
        await sleep(delayMs);
        continue;
      }

      console.error(`[${timestamp}] Error auto-starting scheduled typing rooms:`, error);
      throw error;
    }
  }
};
