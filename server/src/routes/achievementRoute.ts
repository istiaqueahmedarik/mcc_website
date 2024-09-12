import { Hono } from 'hono';
import { insertAchievement } from '../controllers/achievementController';

const route = new Hono();

route.post('/insert', insertAchievement);

export default route;