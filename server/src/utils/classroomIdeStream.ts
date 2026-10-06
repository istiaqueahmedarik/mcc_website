import sql from '../db';
import { ENROLLMENT_ACTIVE, ensurePreEnrollmentSchema } from './classroomPreEnrollment';

interface IdeConnection {
  ws: any;
  classroomId: string;
  userId: string;
  isTrainer: boolean;
}

// Map classroomId -> Set<IdeConnection>
const classroomIdeSockets = new Map<string, Set<IdeConnection>>();

// Memory cache for active IDE sessions per classroom: classroomId -> Map<studentId, sessionData>
const ideSessionCache = new Map<string, Map<string, any>>();

export async function validateClassroomIdeSocketToken(classroomId: string, token?: string) {
  if (!token || !classroomId) return null;
  try {
    await ensurePreEnrollmentSchema();
    const userRows = await sql`
      SELECT u.id, u.admin, u.trainer, u.full_name, u.email, u.is_pre_enrolled
      FROM users u
      WHERE u.id::text = ${token}
    `;
    if (userRows.length === 0) return null;

    const user = userRows[0];
    const classRows = await sql`
      SELECT c.id, c.created_by,
        (SELECT count(*) FROM classroom_students cs WHERE cs.classroom_id = c.id AND cs.student_id = ${user.id} AND cs.enrollment_status = ${ENROLLMENT_ACTIVE}) > 0 AS is_student
      FROM classrooms c
      WHERE c.id = ${classroomId}
    `;
    if (classRows.length === 0) return null;

    const isTrainer = classRows[0].created_by === user.id || Boolean(user.admin || user.trainer);
    const isStudent = Boolean(classRows[0].is_student) && !Boolean(user.is_pre_enrolled);

    if (!isTrainer && !isStudent) return null;

    return {
      classroomId,
      userId: String(user.id),
      userName: user.full_name || user.email,
      isTrainer,
    };
  } catch (error) {
    console.error('Error validating IDE socket token:', error);
    return null;
  }
}

export function connectClassroomIdeSocket(ws: any, joinContext: { classroomId: string; userId: string; isTrainer: boolean }) {
  const connection: IdeConnection = {
    ws,
    classroomId: joinContext.classroomId,
    userId: joinContext.userId,
    isTrainer: joinContext.isTrainer,
  };

  if (!classroomIdeSockets.has(joinContext.classroomId)) {
    classroomIdeSockets.set(joinContext.classroomId, new Set());
  }
  classroomIdeSockets.get(joinContext.classroomId)!.add(connection);

  // Send current cached sessions to trainer on connect
  if (joinContext.isTrainer) {
    const roomSessions = ideSessionCache.get(joinContext.classroomId);
    if (roomSessions) {
      const sessionsArray = Array.from(roomSessions.values());
      try {
        ws.send(JSON.stringify({ type: 'initial_sessions', sessions: sessionsArray }));
      } catch (err) {
        // ignore send error
      }
    }
  }

  return connection;
}

export function handleClassroomIdeSocketMessage(connection: IdeConnection | null, rawMessage: any) {
  if (!connection) return;
  try {
    const data = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'ide_update') {
      const studentId = data.studentId || connection.userId;
      const sessionUpdate = {
        student_id: studentId,
        student_name: data.studentName || 'Student',
        classroom_id: connection.classroomId,
        class_id: data.classId || null,
        language: data.language || 'javascript',
        code: data.code || '',
        focused: Boolean(data.focused),
        code_length: (data.code || '').length,
        last_event_type: data.eventType || 'code_update',
        updated_at: new Date().toISOString(),
      };

      // Cache session in memory
      if (!ideSessionCache.has(connection.classroomId)) {
        ideSessionCache.set(connection.classroomId, new Map());
      }
      ideSessionCache.get(connection.classroomId)!.set(studentId, sessionUpdate);

      // Broadcast real-time update to all connected trainers in this classroom
      const roomSockets = classroomIdeSockets.get(connection.classroomId);
      if (roomSockets) {
        const payload = JSON.stringify({
          type: 'live_ide_update',
          session: sessionUpdate,
          eventDetail: data.eventDetail || null,
        });

        for (const conn of roomSockets) {
          if (conn.isTrainer && conn.ws.readyState === 1) {
            try {
              conn.ws.send(payload);
            } catch (err) {
              // ignore socket write error
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error handling IDE socket message:', error);
  }
}

export function handleClassroomIdeSocketClose(connection: IdeConnection | null) {
  if (!connection) return;
  const roomSockets = classroomIdeSockets.get(connection.classroomId);
  if (roomSockets) {
    roomSockets.delete(connection);
    if (roomSockets.size === 0) {
      classroomIdeSockets.delete(connection.classroomId);
    }
  }
}

export function handleClassroomIdeSocketError(connection: IdeConnection | null) {
  handleClassroomIdeSocketClose(connection);
}
