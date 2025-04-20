import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import {
    insertPublicContestReport,
    getAllPublicContestReports,
    getPublicContestReport,
    updatePublicContestReport,
    deletePublicContestReport,
} from '../controllers/publicContestReportController'

const route = new Hono()

route.use(
    '/admin/*',
    jwt({
        secret: process.env.SECRET || '',
    }),
)

route.post('/admin/insert', insertPublicContestReport)
route.get('/all', getAllPublicContestReports)
route.post('/get', getPublicContestReport)
route.post('/admin/update', updatePublicContestReport)
route.post('/admin/delete', deletePublicContestReport)

export default route
