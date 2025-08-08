import { Hono } from 'hono'
import { createCustomContest, getActiveCustomContests, getAllCustomContests, updateCustomContest, deleteCustomContest } from '../controllers/customContestController'
import { jwt } from 'hono/jwt'

const route = new Hono()

route.get('/active', getActiveCustomContests)

route.use('/*', jwt({ secret: process.env.SECRET || process.env.JWT_SECRET || 'secret' }))

route.get('/all', getAllCustomContests)
route.post('/create', createCustomContest)
route.post('/update', updateCustomContest)
route.post('/delete', deleteCustomContest)

export default route
