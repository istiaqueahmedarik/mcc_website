import { Hono } from 'hono';
import { 
  createRoom, 
  getRoomByCode, 
  joinRoom, 
  startRoom, 
  getLeaderboard,
  completeRoom,
  restartRoom,
  scheduleRoomStart
} from '../controllers/typingRoomController';

const typingRoomRoute = new Hono();

// POST /api/typing/rooms/create - Create a new room
typingRoomRoute.post('/create', createRoom);

// GET /api/typing/rooms/:code - Get room details by code
typingRoomRoute.get('/:code', getRoomByCode);

// POST /api/typing/rooms/:code/join - Join a room
typingRoomRoute.post('/:code/join', joinRoom);

// POST /api/typing/rooms/:code/start - Start a room
typingRoomRoute.post('/:code/start', startRoom);

// POST /api/typing/rooms/:code/complete - Complete a room
typingRoomRoute.post('/:code/complete', completeRoom);

// POST /api/typing/rooms/:code/restart - Restart a room
typingRoomRoute.post('/:code/restart', restartRoom);

// POST /api/typing/rooms/:code/schedule-start - Schedule or clear scheduled start
typingRoomRoute.post('/:code/schedule-start', scheduleRoomStart);

// GET /api/typing/rooms/:code/leaderboard - Get room leaderboard
typingRoomRoute.get('/:code/leaderboard', getLeaderboard);

export default typingRoomRoute;
