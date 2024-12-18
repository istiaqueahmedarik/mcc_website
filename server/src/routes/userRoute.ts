import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { getVjudgeId } from '../controllers/userController'

const route = new Hono()

route.use(
  '/*',
  jwt({
    secret: process.env.SECRET || '',
  }),
)

route.get('/get_vjudge_id', getVjudgeId)

export default route
