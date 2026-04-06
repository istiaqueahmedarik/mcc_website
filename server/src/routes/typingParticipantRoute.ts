import { Hono } from 'hono';
import { 
  updateParticipantProgress, 
  getParticipant,
  getRoomParticipants 
} from '../controllers/typingParticipantController';

const typingParticipantRoute = new Hono();

// GET /api/typing/participants/:id - Get participant details
typingParticipantRoute.get('/:id', getParticipant);

// PUT /api/typing/participants/:id/progress - Update participant progress
typingParticipantRoute.put('/:id/progress', updateParticipantProgress);

// GET /api/typing/participants/rooms/:code - Get all participants in a room
typingParticipantRoute.get('/rooms/:code', getRoomParticipants);

export default typingParticipantRoute;
