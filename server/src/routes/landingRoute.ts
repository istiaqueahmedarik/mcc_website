import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { getLandingPublic, featuresCrud, statsCrud, timelineCrud, alumniBatchCrud, alumniMemberCrud, migrateLegacyTestimonialsToAlumni } from '../controllers/landingController'

const route = new Hono()

// Public aggregate endpoint
route.get('/public', getLandingPublic)

// Protect admin endpoints
route.use('/admin/*', jwt({ secret: process.env.SECRET || '' }))

// Features
route.get('/admin/features', featuresCrud.list)
route.post('/admin/features/create', featuresCrud.create)
route.post('/admin/features/update', featuresCrud.update)
route.post('/admin/features/delete', featuresCrud.delete)

// Stats
route.get('/admin/stats', statsCrud.list)
route.post('/admin/stats/create', statsCrud.create)
route.post('/admin/stats/update', statsCrud.update)
route.post('/admin/stats/delete', statsCrud.delete)

// Timeline
route.get('/admin/timeline', timelineCrud.list)
route.post('/admin/timeline/create', timelineCrud.create)
route.post('/admin/timeline/update', timelineCrud.update)
route.post('/admin/timeline/delete', timelineCrud.delete)

// Alumni batch & member
route.get('/admin/alumni/batch', alumniBatchCrud.list)
route.post('/admin/alumni/batch/create', alumniBatchCrud.create)
route.post('/admin/alumni/batch/update', alumniBatchCrud.update)
route.post('/admin/alumni/batch/delete', alumniBatchCrud.delete)
route.post('/admin/alumni/migrate-legacy', migrateLegacyTestimonialsToAlumni)

route.get('/admin/alumni/member', alumniMemberCrud.list)
route.post('/admin/alumni/member/create', alumniMemberCrud.create)
route.post('/admin/alumni/member/update', alumniMemberCrud.update)
route.post('/admin/alumni/member/delete', alumniMemberCrud.delete)

export default route
