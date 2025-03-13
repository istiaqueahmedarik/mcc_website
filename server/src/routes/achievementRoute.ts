import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { getAchievements, insertAchievement } from '../controllers/achievementController'

const route = new Hono()

route.use(
  '/insert/*',
  jwt({
    secret: process.env.SECRET || '',
  }),
)

route.post('/insert', insertAchievement)
route.get('/get_achievement', getAchievements)

export default route
