import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import {
  acceptUser,
  getProfile,
  getProfilePost,
  login,
  pendingUser,
  rejectUser,
  signup,
  getPublicProfileByVjudge,
  listPublicVjudgeIds,
} from '../controllers/authController'

const route = new Hono()

route.use(
  '/user/*',
  jwt({
    secret: process.env.SECRET || '',
  }),
)

// route.use('/user/*', async (c, next) => {
//   try {
//     const authToken = c.req.header('Authorization')?.replace('Bearer ', '')
//     if (!authToken) {
//       return c.json({ error: 'Unauthorized' }, 401)
//     }
//     const secret = process.env.SECRET
//     if (!secret) {
//       ('JWT secret is not defined')
//       return c.json({ error: 'Internal server error' }, 500)
//     }
//     let payload = null
//     try {
//       payload = await JwtVerify(authToken, secret)
//     } catch (error) {
//       return c.json({ error: 'Invalid credentials' }, 401)
//     }
//     if (payload?.id) {
//       return await next()
//     }
//     return c.json({ error: 'Unauthorized' }, 401)
//   } catch (error) {
//     (error)
//     return c.json({ error: 'Something went wrong' }, 400)
//   }
// })

route.post('/signup', signup)
route.post('/login', login)
route.get('/user/pendings', pendingUser)
route.post('/user/reject', rejectUser)
route.post('/user/accept', acceptUser)
route.get('/user/profile', getProfile)
route.post('/profile', getProfilePost)

// Public endpoints (no auth)
route.get('/public/profile/vj/:vjudge', getPublicProfileByVjudge)
route.get('/public/vjudge-ids', listPublicVjudgeIds)

export default route
