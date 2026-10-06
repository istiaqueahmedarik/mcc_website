import { InMemorySyncStorage, TLSocketRoom } from '@tldraw/sync-core';
import type { WSContext, WSMessageReceive } from 'hono/ws';

type BoardRole = 'trainer' | 'student';

export type BoardJoinContext = {
  boardSessionId: string;
  classroomId: string;
  roomId: string;
  userId: string;
  role: BoardRole;
};

type BoardTokenRecord = BoardJoinContext & {
  token: string;
  expiresAt: number;
};

type BoardSocketConnection = {
  room: TLSocketRoom<any, BoardJoinContext>;
  sessionId: string;
};

const BOARD_TOKEN_TTL_MS = 30_000;
const boardTokens = new Map<string, BoardTokenRecord>();
const boardRooms = new Map<string, TLSocketRoom<any, BoardJoinContext>>();

function pruneExpiredTokens() {
  const now = Date.now();
  for (const [token, record] of boardTokens) {
    if (record.expiresAt <= now) boardTokens.delete(token);
  }
}

function getOrCreateBoardRoom(roomId: string) {
  let room = boardRooms.get(roomId);
  if (!room || room.isClosed()) {
    room = new TLSocketRoom<any, BoardJoinContext>({
      storage: new InMemorySyncStorage<any>(),
      log: {
        warn: (...args) => console.warn('classroom board sync:', ...args),
        error: (...args) => console.error('classroom board sync:', ...args),
      },
      onSessionRemoved: (removedRoom, { numSessionsRemaining }) => {
        if (numSessionsRemaining === 0 && removedRoom.isClosed()) {
          boardRooms.delete(roomId);
        }
      },
    });
    boardRooms.set(roomId, room);
  }
  return room;
}

function adaptHonoSocket(ws: WSContext) {
  return {
    send(data: string) {
      ws.send(data);
    },
    close(code?: number, reason?: string) {
      ws.close(code, reason);
    },
    get readyState() {
      return ws.readyState;
    },
  };
}

export function createClassroomBoardJoinToken(context: BoardJoinContext) {
  pruneExpiredTokens();
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + BOARD_TOKEN_TTL_MS;
  boardTokens.set(token, { ...context, token, expiresAt });
  return { token, expiresAt };
}

export function consumeClassroomBoardJoinToken(token: string | null | undefined) {
  pruneExpiredTokens();
  if (!token) return null;
  const record = boardTokens.get(token);
  if (!record || record.expiresAt <= Date.now()) {
    boardTokens.delete(token);
    return null;
  }
  boardTokens.delete(token);
  return record;
}

export function connectClassroomBoardSocket(ws: WSContext, context: BoardJoinContext): BoardSocketConnection {
  const room = getOrCreateBoardRoom(context.roomId);
  const sessionId = crypto.randomUUID();
  room.handleSocketConnect({
    sessionId,
    socket: adaptHonoSocket(ws),
    isReadonly: context.role !== 'trainer',
    meta: context,
  });
  return { room, sessionId };
}

export function handleClassroomBoardSocketMessage(connection: BoardSocketConnection | null, message: WSMessageReceive) {
  if (!connection) return;
  if (typeof Blob !== 'undefined' && message instanceof Blob) return;
  connection.room.handleSocketMessage(connection.sessionId, message as any);
}

export function handleClassroomBoardSocketClose(connection: BoardSocketConnection | null) {
  if (!connection) return;
  connection.room.handleSocketClose(connection.sessionId);
}

export function handleClassroomBoardSocketError(connection: BoardSocketConnection | null) {
  if (!connection) return;
  connection.room.handleSocketError(connection.sessionId);
}

export function closeClassroomBoardRoom(roomId: string) {
  const room = boardRooms.get(roomId);
  if (!room) return;
  room.close();
  boardRooms.delete(roomId);
}
