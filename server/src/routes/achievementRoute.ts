import { Hono } from 'hono';
import { insertAchievement } from '../controllers/achievementController';
import { jwt } from 'hono/jwt';

const route = new Hono();

route.use(
    '/insert/*',
    jwt({
      secret: process.env.SECRET || '',
    }),
  )

route.post('/insert', insertAchievement);

export default route;