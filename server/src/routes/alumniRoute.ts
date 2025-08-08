import { Hono } from 'hono'
import { getAlumniPublic } from '../controllers/alumniController'

const route = new Hono()

route.get('/public', getAlumniPublic)

export default route
