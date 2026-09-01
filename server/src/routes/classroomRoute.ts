import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { jwtAuthOptions } from '../utils/jwtAuthOptions';
import {
  addClassroomTopicProblem,
  addClassroomTopicResource,
  deleteClassroomTopicProblem,
  deleteClassroomTopicResource,
  toggleTrainerRole,
  toggleAdminRole,
  listAllUsers,
  getStudentProfileReadiness,
  listTrainers,
  createClassroom,
  updateClassroom,
  createClassroomBoardJoinTokenHandler,
  createClassroomTopic,
  getClassrooms,
  getClassroomDetails,
  getClassroomBoardSession,
  getClassroomTopicAnalytics,
  getClassroomTopicAssignments,
  getClassroomPendingSubmissions,
  addStudentToClassroom,
  addStudentsToClassroom,
  preEnrollStudents,
  handlePreEnrollmentClaim,
  removeStudentFromClassroom,
  createTeam,
  updateTeamMembers,
  scheduleClass,
  updateClassSession,
  startClass,
  completeClass,
  assignProblem,
  assignProblemsBulk,
  previewProblem,
  getClassProblems,
  updateProblemStatus,
  getProblemTagDictionary,
  createProblemTag,
  addNote,
  getProblemNotesAndHints,
  addHint,
  addResource,
  getClassResourceDetail,
  getClassResources,
  createTrainerUser,
  createAdminUser,
  createFullUser,
  createUsersBulk,
  changeUserPassword,
  listClassroomTopics,
  startClassroomBoardSession,
  stopClassroomBoardSession,
  assignClassroomTopicToTeam,
  unassignClassroomTopic,
  listClassroomIdeActivity,
  recordClassroomIdeActivity,
  resetClassroomIdeSession,
  updateClassroomTopic,
  updateClassroomTopicProblem,
  updateClassroomTopicResource,
  updateClassroomTopicProblemProgress,
  verifyClassroomTopicProblemProgress,
  getClassroomSessionAttendance,
  updateClassroomSessionAttendance,
  getClassroomAttendanceSummary,
  validateClassroomBoardSocketToken,
  getClassroomSubstitutes,
  addClassroomSubstitute,
  removeClassroomSubstitute,
  getClassroomUpdates,
  markClassroomUpdateRead,
  markAllClassroomUpdatesRead,
  getClassroomStudentThreads,
  getClassroomStudentThread,
  getClassroomStudentThreadMessagesAfterRevision,
  getClassroomStudentThreadMessage,
  getClassroomStudentThreadSummary,
  postClassroomStudentThreadRealtimeCredentials,
  postClassroomStudentThreadMessage,
  postClassroomStudentThreadAttachment,
  getClassroomStudentThreadAttachmentUrl,
  getProblemThread,
  postProblemThreadMessage,
  toggleProblemThreadReaction
} from '../controllers/classroomController';
import {
  changeClassroomDiscordChannels,
  createClassroomDailyCheckin,
  bindExistingClassroomDiscord,
  getClassroomDailyCheckins,
  getClassroomDiscordRules,
  getClassroomDiscordRoster,
  getClassroomDiscordStatus,
  listEligibleDiscordGuilds,
  reconcileClassroomDiscord,
  trustClassroomStudentDiscordConnection,
  updateClassroomDiscordRules,
  updateClassroomDiscordSettings,
} from '../controllers/discordController';
import {
  createClassroomContestDemerit,
  createClassroomContestHandleOverride,
  createClassroomContestItem,
  createClassroomContestRoom,
  createClassroomContestSolveOverride,
  deleteClassroomCodeforcesCredentials,
  deleteClassroomContestDemerit,
  deleteClassroomContestHandleOverride,
  deleteClassroomContestItem,
  deleteClassroomContestRoom,
  deleteClassroomContestSolveOverride,
  fetchClassroomContestItem,
  generateClassroomContestReport,
  getClassroomCodeforcesCredentials,
  getClassroomCodeforcesSession,
  getClassroomContestReport,
  getClassroomContestScoring,
  listClassroomContestDemerits,
  listClassroomContestHandleOverrides,
  listClassroomContestSolveOverrides,
  listClassroomContestUnmatchedRows,
  listClassroomContestRooms,
  previewClassroomContestScoring,
  saveClassroomCodeforcesCredentials,
  saveClassroomCodeforcesSession,
  deleteClassroomCodeforcesSession,
  shareClassroomContestReport,
  updateClassroomContestDemerit,
  updateClassroomContestHandleOverride,
  updateClassroomContestItem,
  updateClassroomContestItemOrder,
  updateClassroomContestRoom,
  updateClassroomContestScoring,
  updateClassroomContestSolveOverride,
} from '../controllers/classroomContestController';
import { requireDiscordLink } from '../middleware/discordLinkMiddleware';
import { upgradeWebSocket } from '../utils/bunWebSocket';
import {
  connectClassroomBoardSocket,
  handleClassroomBoardSocketClose,
  handleClassroomBoardSocketError,
  handleClassroomBoardSocketMessage,
} from '../utils/classroomBoardSync';
import {
  connectClassroomIdeSocket,
  handleClassroomIdeSocketClose,
  handleClassroomIdeSocketError,
  handleClassroomIdeSocketMessage,
  validateClassroomIdeSocketToken,
} from '../utils/classroomIdeStream';

const route = new Hono();

route.get('/:id/board/ws', upgradeWebSocket(async (c) => {
  const classroomId = c.req.param('id');
  const token = c.req.query('token');
  const joinContext = await validateClassroomBoardSocketToken(classroomId, token);
  let connection: ReturnType<typeof connectClassroomBoardSocket> | null = null;

  return {
    onOpen: (_event, ws) => {
      if (!joinContext) {
        ws.close(1008, 'Invalid or expired board token');
        return;
      }
      connection = connectClassroomBoardSocket(ws, joinContext);
    },
    onMessage: (event) => handleClassroomBoardSocketMessage(connection, event.data),
    onClose: () => handleClassroomBoardSocketClose(connection),
    onError: () => handleClassroomBoardSocketError(connection),
  };
}));

route.get('/:id/ide/ws', upgradeWebSocket(async (c) => {
  const classroomId = c.req.param('id');
  const token = c.req.query('token');
  const joinContext = await validateClassroomIdeSocketToken(classroomId, token);
  let connection: ReturnType<typeof connectClassroomIdeSocket> | null = null;

  return {
    onOpen: (_event, ws) => {
      if (!joinContext) {
        ws.close(1008, 'Invalid or expired IDE socket token');
        return;
      }
      connection = connectClassroomIdeSocket(ws, joinContext);
    },
    onMessage: (event) => handleClassroomIdeSocketMessage(connection, event.data),
    onClose: () => handleClassroomIdeSocketClose(connection),
    onError: () => handleClassroomIdeSocketError(connection),
  };
}));

// Apply JWT middleware to secure all classroom endpoints
route.use(
  '/*',
  jwt(jwtAuthOptions())
);
route.use('/*', requireDiscordLink);

// Admin-only endpoints
route.post('/admin/toggle-trainer', toggleTrainerRole);
route.post('/admin/create-trainer', createTrainerUser);
route.post('/admin/toggle-admin', toggleAdminRole);
route.post('/admin/create-admin', createAdminUser);
route.post('/admin/create-user', createFullUser);
route.post('/admin/create-users-bulk', createUsersBulk);
route.post('/admin/change-password', changeUserPassword);
route.get('/admin/users', listAllUsers);
route.get('/admin/student-profile-readiness', getStudentProfileReadiness);
route.get('/admin/trainers-list', listTrainers);

// Classroom CRUD
route.post('/create', createClassroom);
route.get('/list', getClassrooms);
route.get('/discord/guilds', listEligibleDiscordGuilds);
route.get('/problem-tags/dictionary', getProblemTagDictionary);
route.post('/problem-tags/dictionary', createProblemTag);
route.get('/:id/resources/:resourceId', getClassResourceDetail);
route.post('/:id/add-student', addStudentToClassroom);
route.post('/:id/add-students', addStudentsToClassroom);
route.post('/:id/pre-enroll-students', preEnrollStudents);
route.post('/:id/pre-enrollment/claim', handlePreEnrollmentClaim);
route.post('/:id/remove-student', removeStudentFromClassroom);
route.post('/:id/update', updateClassroom);

// Team management
route.post('/:id/create-team', createTeam);
route.post('/:id/teams/:teamId/members', updateTeamMembers);

// Class sessions & scheduling
route.post('/:id/schedule-class', scheduleClass);
route.post('/:id/class/:classId/update', updateClassSession);
route.post('/class/:id/start', startClass);
route.post('/class/:id/complete', completeClass);
route.get('/:id/class/:classId/attendance', getClassroomSessionAttendance);
route.post('/:id/class/:classId/attendance', updateClassroomSessionAttendance);
route.get('/:id/attendance/summary', getClassroomAttendanceSummary);

// Problem assigning & tracking
route.post('/assign-problem', assignProblem);
route.post('/assign-problems/bulk', assignProblemsBulk);
route.post('/problem-preview', previewProblem);
route.get('/class/:id/problems', getClassProblems);
route.post('/problem/:id/status', updateProblemStatus);

// Notes & Hints
route.post('/problem/:id/add-note', addNote);
route.post('/problem/:id/add-hint', addHint);
route.get('/problem/:id/notes-hints', getProblemNotesAndHints);

// Topics, team assignments, and analytics
route.get('/:id/topics', listClassroomTopics);
route.post('/:id/topics', createClassroomTopic);
route.patch('/:id/topics/:topicId', updateClassroomTopic);
route.post('/:id/topics/:topicId/update', updateClassroomTopic);
route.post('/:id/topics/:topicId/resources', addClassroomTopicResource);
route.post('/:id/topics/:topicId/resources/:resourceId/update', updateClassroomTopicResource);
route.delete('/:id/topics/:topicId/resources/:resourceId', deleteClassroomTopicResource);
route.post('/:id/topics/:topicId/problems', addClassroomTopicProblem);
route.post('/:id/topics/:topicId/problems/:problemId/update', updateClassroomTopicProblem);
route.delete('/:id/topics/:topicId/problems/:problemId', deleteClassroomTopicProblem);
route.post('/:id/topics/:topicId/assign-team', assignClassroomTopicToTeam);
route.post('/:id/topic-assignments/:assignmentId/unassign', unassignClassroomTopic);
route.get('/:id/topic-assignments', getClassroomTopicAssignments);
route.get('/:id/topic-pending-submissions', getClassroomPendingSubmissions);
route.post('/:id/topic-progress/status', updateClassroomTopicProblemProgress);
route.post('/:id/topic-progress/verify', verifyClassroomTopicProblemProgress);
route.get('/:id/topic-analytics', getClassroomTopicAnalytics);
route.post('/:id/ide/activity', recordClassroomIdeActivity);
route.post('/:id/ide/activity/list', listClassroomIdeActivity);
route.post('/:id/ide/reset', resetClassroomIdeSession);
route.get('/:id/updates', getClassroomUpdates);
route.post('/:id/updates/read', markClassroomUpdateRead);
route.post('/:id/updates/read-all', markAllClassroomUpdatesRead);
route.get('/:id/student-threads', getClassroomStudentThreads);
route.post('/:id/student-threads/realtime', postClassroomStudentThreadRealtimeCredentials);
route.get('/:id/student-threads/:studentId/summary', getClassroomStudentThreadSummary);
route.get('/:id/student-threads/:studentId/messages', getClassroomStudentThreadMessagesAfterRevision);
route.get('/:id/student-threads/:studentId/messages/:messageId', getClassroomStudentThreadMessage);
route.get('/:id/student-threads/:studentId', getClassroomStudentThread);
route.post('/:id/student-threads/:studentId/messages', postClassroomStudentThreadMessage);
route.post('/:id/student-threads/:studentId/attachments', postClassroomStudentThreadAttachment);
route.get('/:id/student-threads/:studentId/attachments/:attachmentId', getClassroomStudentThreadAttachmentUrl);
route.get('/:id/problem-thread/:problemId', getProblemThread);
route.post('/:id/problem-thread/reaction', toggleProblemThreadReaction);
route.post('/:id/problem-thread/:problemId', postProblemThreadMessage);

// Discord integration
route.get('/:id/discord', getClassroomDiscordStatus);
route.post('/:id/discord', bindExistingClassroomDiscord);
route.put('/:id/discord', updateClassroomDiscordSettings);
route.post('/:id/discord/channels/change', changeClassroomDiscordChannels);
route.post('/:id/discord/reconcile', reconcileClassroomDiscord);
route.get('/:id/discord/rules', getClassroomDiscordRules);
route.put('/:id/discord/rules', updateClassroomDiscordRules);
route.get('/:id/discord/roster', getClassroomDiscordRoster);
route.post('/:id/discord/roster/:studentId/trusted-link', trustClassroomStudentDiscordConnection);
route.get('/:id/checkins', getClassroomDailyCheckins);
route.post('/:id/checkins', createClassroomDailyCheckin);

// Classroom-scoped contest reports
route.get('/:id/contests/codeforces-credentials', getClassroomCodeforcesCredentials);
route.put('/:id/contests/codeforces-credentials', saveClassroomCodeforcesCredentials);
route.delete('/:id/contests/codeforces-credentials', deleteClassroomCodeforcesCredentials);
route.get('/:id/contests/codeforces-session', getClassroomCodeforcesSession);
route.post('/:id/contests/codeforces-session', saveClassroomCodeforcesSession);
route.delete('/:id/contests/codeforces-session', deleteClassroomCodeforcesSession);
route.get('/:id/contests/rooms', listClassroomContestRooms);
route.post('/:id/contests/rooms', createClassroomContestRoom);
route.patch('/:id/contests/rooms/:roomId', updateClassroomContestRoom);
route.delete('/:id/contests/rooms/:roomId', deleteClassroomContestRoom);
route.post('/:id/contests/rooms/:roomId/items', createClassroomContestItem);
route.patch('/:id/contests/rooms/:roomId/items/order', updateClassroomContestItemOrder);
route.patch('/:id/contests/rooms/:roomId/items', updateClassroomContestItem);
route.patch('/:id/contests/rooms/:roomId/items/:contestItemId', updateClassroomContestItem);
route.delete('/:id/contests/rooms/:roomId/items', deleteClassroomContestItem);
route.delete('/:id/contests/rooms/:roomId/items/:contestItemId', deleteClassroomContestItem);
route.post('/:id/contests/rooms/:roomId/items/:contestItemId/fetch', fetchClassroomContestItem);
route.get('/:id/contests/rooms/:roomId/scoring', getClassroomContestScoring);
route.post('/:id/contests/rooms/:roomId/scoring/preview', previewClassroomContestScoring);
route.put('/:id/contests/rooms/:roomId/scoring', updateClassroomContestScoring);
route.post('/:id/contests/rooms/:roomId/report', generateClassroomContestReport);
route.get('/:id/contests/rooms/:roomId/report', getClassroomContestReport);
route.post('/:id/contests/rooms/:roomId/share', shareClassroomContestReport);
route.get('/:id/contests/rooms/:roomId/unmatched-rows', listClassroomContestUnmatchedRows);
route.get('/:id/contests/handles', listClassroomContestHandleOverrides);
route.post('/:id/contests/handles', createClassroomContestHandleOverride);
route.patch('/:id/contests/handles/:handleId', updateClassroomContestHandleOverride);
route.delete('/:id/contests/handles/:handleId', deleteClassroomContestHandleOverride);
route.get('/:id/contests/rooms/:roomId/solve-overrides', listClassroomContestSolveOverrides);
route.post('/:id/contests/rooms/:roomId/solve-overrides', createClassroomContestSolveOverride);
route.patch('/:id/contests/rooms/:roomId/solve-overrides/:overrideId', updateClassroomContestSolveOverride);
route.delete('/:id/contests/rooms/:roomId/solve-overrides/:overrideId', deleteClassroomContestSolveOverride);
route.get('/:id/contests/rooms/:roomId/demerits', listClassroomContestDemerits);
route.post('/:id/contests/rooms/:roomId/demerits', createClassroomContestDemerit);
route.patch('/:id/contests/rooms/:roomId/demerits/:demeritId', updateClassroomContestDemerit);
route.delete('/:id/contests/rooms/:roomId/demerits/:demeritId', deleteClassroomContestDemerit);

// Ephemeral board broadcast
route.get('/:id/board/session', getClassroomBoardSession);
route.post('/:id/board/start', startClassroomBoardSession);
route.post('/:id/board/stop', stopClassroomBoardSession);
route.post('/:id/board/join-token', createClassroomBoardJoinTokenHandler);

// Resources
route.post('/:id/add-resource', addResource);
route.get('/:id/resources', getClassResources);

// Substitute trainers management
route.get('/:id/substitutes', getClassroomSubstitutes);
route.post('/:id/substitutes', addClassroomSubstitute);
route.delete('/:id/substitutes/:trainerId', removeClassroomSubstitute);

route.get('/:id', getClassroomDetails);

export default route;
