import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import {
    insertContestRoom,
    getAllContestRooms,
    getContestRoom,
    updateContestRoom,
    deleteContestRoom,
} from '../controllers/contestRoomController'

const route = new Hono()

route.use(
    '/*',
    jwt({
        secret: process.env.SECRET || '',
    }),
)

route.post('/insert', insertContestRoom)
route.get('/all', getAllContestRooms)
route.post('/get', getContestRoom)
route.post('/update', updateContestRoom)
route.post('/delete', deleteContestRoom)

export default route
