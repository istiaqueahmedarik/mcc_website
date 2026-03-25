import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import {
  createAdminAlumniBatch,
  createAdminAlumniMember,
  deleteAdminAlumniBatch,
  deleteAdminAlumniMember,
  getAlumniPublic,
  listAdminAlumniBatches,
  listAdminAlumniMembers,
  updateAdminAlumniBatch,
  updateAdminAlumniMember,
} from '../controllers/alumniController'

const route = new Hono()

route.get('/public', getAlumniPublic)
route.use('/admin/*', jwt({ secret: process.env.SECRET || '', alg: 'HS256' }))
route.get('/admin/batch', listAdminAlumniBatches)
route.post('/admin/batch/create', createAdminAlumniBatch)
route.post('/admin/batch/update', updateAdminAlumniBatch)
route.post('/admin/batch/delete', deleteAdminAlumniBatch)
route.get('/admin/member', listAdminAlumniMembers)
route.post('/admin/member/create', createAdminAlumniMember)
route.post('/admin/member/update', updateAdminAlumniMember)
route.post('/admin/member/delete', deleteAdminAlumniMember)

export default route
