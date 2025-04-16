import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { JwtVariables } from 'hono/jwt'
import { prettyJSON } from 'hono/pretty-json'

import achievementRoute from './routes/achievementRoute'
import authRoute from './routes/authRoute'
import batchRoute from './routes/batchRoute'
import contestRoomContestsRoute from './routes/contestRoomContestsRoute'
import contestRoomRoute from './routes/contestRoomRoute'
import courseRoute from './routes/courseRoute'
import userRoute from './routes/userRoute'
import getContests from './contests/getContests'
type Bindings = {
  PORT: number
  DATABASE_URL: string
  EMAIL_PASS: string
  EMAIL_USER: string
  SECRET: string
  VJUDGE_USERNAME: string
  VJUDGE_PASSWORD: string
}
const app = new Hono<{ Variables: JwtVariables, Bindings: Bindings }>()

app.use(prettyJSON())
app.use('/*', cors())

app.route('/achieve', achievementRoute)
app.route('/auth', authRoute)
app.route('/course', courseRoute)
app.route('/batch', batchRoute)
app.route('/user', userRoute)
app.route('/getContests', getContests)
app.route('/contest-room', contestRoomRoute)
app.route('/contest-room-contests', contestRoomContestsRoute)

export default app;
