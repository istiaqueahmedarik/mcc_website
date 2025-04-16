import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import {
  addBatchMembers,
  deleteBatch,
  editBatch,
  getAllBatches,
  getBatch,
  getBatchInstrucotrs,
  getBatchNonUsers,
  getBatchUsers,
  insertBatch,
  removeBatchMembers,
} from '../controllers/batchController'

const route = new Hono()

route.use(
  '/*',
  jwt({
    secret: process.env.SECRET || '',
  }),
)

route.post('/insert', insertBatch)
route.get('/all', getAllBatches)
route.post('/get_batch', getBatch)
route.post('/get_ins', getBatchInstrucotrs)
route.post('/edit', editBatch)
route.post('/get_batch_non_users', getBatchNonUsers)
route.post('/get_batch_users', getBatchUsers)
route.post('/add_members', addBatchMembers)
route.post('/remove_members', removeBatchMembers)
route.post('/delete', deleteBatch)

export default route
