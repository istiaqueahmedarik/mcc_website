import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { getSchedulesDash, getVjudgeId } from '../controllers/userController'

const route = new Hono()

route.use(
  '/*',
  jwt({
    secret: process.env.SECRET || '',
  }),
)

route.get('/get_vjudge_id', getVjudgeId)
route.get('/get_shchedules_dash', getSchedulesDash)

export default route
