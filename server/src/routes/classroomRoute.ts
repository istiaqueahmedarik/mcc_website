import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import {
  addClassroomTopicProblem,
  addClassroomTopicResource,
  toggleTrainerRole,
  toggleAdminRole,
  listAllUsers,
  listTrainers,
  createClassroom,
  createClassroomBoardJoinTokenHandler,
  createClassroomTopic,
  getClassrooms,
  getClassroomDetails,
  getClassroomBoardSession,
  getClassroomTopicAnalytics,
  getClassroomTopicAssignments,
  addStudentToClassroom,
  removeStudentFromClassroom,
  createTeam,
  updateTeamMembers,
  scheduleClass,
  startClass,
  completeClass,
  assignProblem,
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
  sendChatMessage,
  getChatMessages,
  toggleChatReaction,
  listInAppNotifications,
  markNotificationsRead,
  createTrainerUser,
  createAdminUser,
  listClassroomTopics,
  startClassroomBoardSession,
  stopClassroomBoardSession,
  assignClassroomTopicToTeam,
  listClassroomIdeActivity,
  recordClassroomIdeActivity,
  resetClassroomIdeSession,
  updateClassroomTopic,
  updateClassroomTopicProblemProgress,
  verifyClassroomTopicProblemProgress,
  getClassroomSessionAttendance,
  updateClassroomSessionAttendance,
  getClassroomAttendanceSummary,
  validateClassroomBoardSocketToken,
  getClassroomSubstitutes,
  addClassroomSubstitute,
  removeClassroomSubstitute
} from '../controllers/classroomController';
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
  jwt({
    secret: process.env.SECRET || '',
    alg: 'HS256',
  })
);

// Admin-only endpoints
route.post('/admin/toggle-trainer', toggleTrainerRole);
route.post('/admin/create-trainer', createTrainerUser);
route.post('/admin/toggle-admin', toggleAdminRole);
route.post('/admin/create-admin', createAdminUser);
route.get('/admin/users', listAllUsers);
route.get('/admin/trainers-list', listTrainers);

// Classroom CRUD
route.post('/create', createClassroom);
route.get('/list', getClassrooms);
route.get('/problem-tags/dictionary', getProblemTagDictionary);
route.post('/problem-tags/dictionary', createProblemTag);
route.get('/:id/resources/:resourceId', getClassResourceDetail);
route.post('/:id/add-student', addStudentToClassroom);
route.post('/:id/remove-student', removeStudentFromClassroom);

// Team management
route.post('/:id/create-team', createTeam);
route.post('/:id/teams/:teamId/members', updateTeamMembers);

// Class sessions & scheduling
route.post('/:id/schedule-class', scheduleClass);
route.post('/class/:id/start', startClass);
route.post('/class/:id/complete', completeClass);
route.get('/:id/class/:classId/attendance', getClassroomSessionAttendance);
route.post('/:id/class/:classId/attendance', updateClassroomSessionAttendance);
route.get('/:id/attendance/summary', getClassroomAttendanceSummary);

// Problem assigning & tracking
route.post('/assign-problem', assignProblem);
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
route.post('/:id/topics/:topicId/resources', addClassroomTopicResource);
route.post('/:id/topics/:topicId/problems', addClassroomTopicProblem);
route.post('/:id/topics/:topicId/assign-team', assignClassroomTopicToTeam);
route.get('/:id/topic-assignments', getClassroomTopicAssignments);
route.post('/:id/topic-progress/status', updateClassroomTopicProblemProgress);
route.post('/:id/topic-progress/verify', verifyClassroomTopicProblemProgress);
route.get('/:id/topic-analytics', getClassroomTopicAnalytics);
route.post('/:id/ide/activity', recordClassroomIdeActivity);
route.post('/:id/ide/activity/list', listClassroomIdeActivity);
route.post('/:id/ide/reset', resetClassroomIdeSession);

// Ephemeral board broadcast
route.get('/:id/board/session', getClassroomBoardSession);
route.post('/:id/board/start', startClassroomBoardSession);
route.post('/:id/board/stop', stopClassroomBoardSession);
route.post('/:id/board/join-token', createClassroomBoardJoinTokenHandler);

// Resources
route.post('/:id/add-resource', addResource);
route.get('/:id/resources', getClassResources);

// Chat endpoints
route.post('/:id/chat/send', sendChatMessage);
route.get('/:id/chat/history', getChatMessages);
route.post('/:id/chat/reaction', toggleChatReaction);

// In-app notifications
route.get('/notifications/list', listInAppNotifications);
route.post('/notifications/read', markNotificationsRead);

// Substitute trainers management
route.get('/:id/substitutes', getClassroomSubstitutes);
route.post('/:id/substitutes', addClassroomSubstitute);
route.delete('/:id/substitutes/:trainerId', removeClassroomSubstitute);

route.get('/:id', getClassroomDetails);

export default route;
