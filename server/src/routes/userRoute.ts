import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { getSchedulesDash, getVjudgeId, loginToVJudgeRoute, verifyCodeforces, setVjudgeId, listVjudgePending, verifyVjudge, setTshirtSize } from '../controllers/userController'

const route = new Hono()

route.use(
  '/*',
  jwt({
    secret: process.env.SECRET || '',
  }),
)

route.get('/get_vjudge_id', getVjudgeId)
route.get('/get_shchedules_dash', getSchedulesDash)
route.post('/vjudge_login', loginToVJudgeRoute)
route.post('/cf/verify', verifyCodeforces)
route.post('/vjudge/set', setVjudgeId)
route.get('/vjudge/pending', listVjudgePending)
route.post('/vjudge/verify', verifyVjudge)
route.post('/tshirt/set', setTshirtSize)

export default route
