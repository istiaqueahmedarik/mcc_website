import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import {
    insertContestRoomContest,
    getAllContestRoomContests,
    getContestRoomContest,
    updateContestRoomContest,
    deleteContestRoomContest,
} from '../controllers/contestRoomContestsController'

const route = new Hono()

route.use(
    '/*',
    jwt({
        secret: process.env.SECRET || '',
    }),
)

route.post('/insert', insertContestRoomContest)
route.get('/all', getAllContestRoomContests)
route.post('/get', getContestRoomContest)
route.post('/update', updateContestRoomContest)
route.post('/delete', deleteContestRoomContest)

export default route
