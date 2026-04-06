import { Hono } from 'hono';
import { getRandomWords } from '../controllers/wordController';

const wordRoute = new Hono();

// GET /api/words/random - Get random words by difficulty
wordRoute.get('/random', getRandomWords);

export default wordRoute;
