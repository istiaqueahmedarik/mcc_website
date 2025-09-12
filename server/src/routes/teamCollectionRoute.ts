import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
// Use dynamic require to avoid TS path resolution issues in this environment
// eslint-disable-next-line @typescript-eslint/no-var-requires
const teamCtrl = require('../controllers/teamCollectionController')
const { adminListCollections, finalizeCollection, unfinalizeCollection, getCollectionPublic, startCollection, stopCollection, reopenCollection, submitChoices, approveManualTeam, adminCreateAssignment, getUserTeams, getTeamsByVjudgePublic, getTeamsCoachedByVjudgePublic, deleteCollection, getMyChoice, adminGetCollectionDetail, previewCollection, adminDeleteTeam, adminRemoveMember, adminRenameTeam, getTeamPublic, renameMyTeam, adminAssignCoach } = teamCtrl
// @ts-ignore - help resolver in this environment
// eslint-disable-next-line
import * as _fix from '../controllers/teamCollectionController.ts'

const route = new Hono()

// Public endpoint to view collection info by token
route.post('/public/get', getCollectionPublic)
route.post('/public/teams/by-vjudge', getTeamsByVjudgePublic)
route.post('/public/teams/coached-by-vjudge', getTeamsCoachedByVjudgePublic)
route.post('/public/team/get', getTeamPublic)

// Authenticated user endpoints
route.use(
    '/*',
    jwt({
        secret: process.env.SECRET || '',
    }),
)

// Admin endpoints
route.post('/admin/start', startCollection)
route.post('/admin/stop', stopCollection)
route.post('/admin/reopen', reopenCollection)
route.get('/admin/list', adminListCollections)
route.post('/admin/finalize', finalizeCollection)
route.post('/admin/unfinalize', unfinalizeCollection)
route.post('/admin/approve-manual', approveManualTeam)
route.post('/admin/assign', adminCreateAssignment)
route.post('/admin/delete', deleteCollection)
route.post('/admin/detail', adminGetCollectionDetail)
route.post('/admin/preview', previewCollection)
route.post('/admin/team/delete', adminDeleteTeam)
route.post('/admin/team/remove', adminRemoveMember)
route.post('/admin/team/rename', adminRenameTeam)
route.post('/admin/team/assign-coach', adminAssignCoach)

// User submit choices
route.post('/submit', submitChoices)
route.get('/my-teams', getUserTeams)
route.post('/my-choice', getMyChoice)
route.post('/my-team/rename', renameMyTeam)

export default route
