import { Context } from 'hono';
import sql from '../db';

export const updateParticipantProgress = async (c: Context) => {
  try {
    const participantId = c.req.param('id');
    const body = await c.req.json();
    
    const { wpm, accuracy, progress, currentWpm, completed } = body;
    
    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    
    if (wpm !== undefined) {
      updates.push('wpm = $' + (values.length + 1));
      values.push(wpm);
    }
    if (accuracy !== undefined) {
      updates.push('accuracy = $' + (values.length + 1));
      values.push(accuracy);
    }
    if (progress !== undefined) {
      updates.push('progress = $' + (values.length + 1));
      values.push(progress);
    }
    if (currentWpm !== undefined) {
      updates.push('current_wpm = $' + (values.length + 1));
      values.push(currentWpm);
    }
    if (completed !== undefined) {
      updates.push('completed = $' + (values.length + 1));
      values.push(completed);
      if (completed) {
        updates.push('finished_at = NOW()');
      }
    }
    
    if (updates.length === 0) {
      return c.json({
        success: false,
        error: 'No fields to update'
      }, 400);
    }
    
    // Use postgres library's tagged template
    const [participant] = await sql`
      UPDATE room_participants 
      SET 
        ${wpm !== undefined ? sql`wpm = ${wpm},` : sql``}
        ${accuracy !== undefined ? sql`accuracy = ${accuracy},` : sql``}
        ${progress !== undefined ? sql`progress = ${progress},` : sql``}
        ${currentWpm !== undefined ? sql`current_wpm = ${currentWpm},` : sql``}
        ${completed !== undefined ? sql`completed = ${completed},` : sql``}
        ${completed ? sql`finished_at = NOW()` : sql`finished_at = finished_at`}
      WHERE id = ${participantId}
      RETURNING id, room_id, user_name, wpm, accuracy, progress, 
                current_wpm, completed, finished_at
    `;
    
    if (!participant) {
      return c.json({
        success: false,
        error: 'Participant not found'
      }, 404);
    }
    
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
        finishedAt: participant.finished_at
      }
    });
  } catch (error) {
    console.error('Error updating participant progress:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update progress'
    }, 500);
  }
};

export const getParticipant = async (c: Context) => {
  try {
    const participantId = c.req.param('id');
    
    const [participant] = await sql`
      SELECT 
        id, room_id, user_name, wpm, accuracy, progress, 
        current_wpm, completed, finished_at, joined_at
      FROM room_participants
      WHERE id = ${participantId}
    `;
    
    if (!participant) {
      return c.json({
        success: false,
        error: 'Participant not found'
      }, 404);
    }
    
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
        finishedAt: participant.finished_at,
        joinedAt: participant.joined_at
      }
    });
  } catch (error) {
    console.error('Error fetching participant:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch participant'
    }, 500);
  }
};

export const getRoomParticipants = async (c: Context) => {
  try {
    const roomCode = c.req.param('code').toUpperCase();
    
    // Get room ID first
    const [room] = await sql`
      SELECT id FROM rooms WHERE room_code = ${roomCode}
    `;
    
    if (!room) {
      return c.json({
        success: false,
        error: 'Room not found'
      }, 404);
    }
    
    // Get all participants
    const participants = await sql`
      SELECT 
        id, room_id, user_name, wpm, accuracy, progress, 
        current_wpm, completed, finished_at, joined_at
      FROM room_participants
      WHERE room_id = ${room.id}
      ORDER BY joined_at ASC
    `;
    
    return c.json({
      success: true,
      participants: participants.map((p: any) => ({
        id: p.id,
        roomId: p.room_id,
        userName: p.user_name,
        wpm: p.wpm,
        accuracy: p.accuracy,
        progress: p.progress,
        currentWpm: p.current_wpm,
        completed: p.completed,
        finishedAt: p.finished_at,
        joinedAt: p.joined_at
      }))
    });
  } catch (error) {
    console.error('Error fetching room participants:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch participants'
    }, 500);
  }
};
