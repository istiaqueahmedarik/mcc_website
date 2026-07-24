import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import {
  toggleTrainerRole,
  listAllUsers,
  createClassroom,
  getClassrooms,
  getClassroomDetails,
  addStudentToClassroom,
  removeStudentFromClassroom,
  createTeam,
  scheduleClass,
  startClass,
  completeClass,
  assignProblem,
  getClassProblems,
  updateProblemStatus,
  addNote,
  getProblemNotesAndHints,
  addHint,
  addResource,
  getClassResources,
  sendChatMessage,
  getChatMessages,
  listInAppNotifications,
  markNotificationsRead,
  createTrainerUser
} from '../controllers/classroomController';

const route = new Hono();

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
route.get('/admin/users', listAllUsers);

// Classroom CRUD
route.post('/create', createClassroom);
route.get('/list', getClassrooms);
route.get('/:id', getClassroomDetails);
route.post('/:id/add-student', addStudentToClassroom);
route.post('/:id/remove-student', removeStudentFromClassroom);

// Team management
route.post('/:id/create-team', createTeam);

// Class sessions & scheduling
route.post('/:id/schedule-class', scheduleClass);
route.post('/class/:id/start', startClass);
route.post('/class/:id/complete', completeClass);

// Problem assigning & tracking
route.post('/assign-problem', assignProblem);
route.get('/class/:id/problems', getClassProblems);
route.post('/problem/:id/status', updateProblemStatus);

// Notes & Hints
route.post('/problem/:id/add-note', addNote);
route.post('/problem/:id/add-hint', addHint);
route.get('/problem/:id/notes-hints', getProblemNotesAndHints);

// Resources
route.post('/:id/add-resource', addResource);
route.get('/:id/resources', getClassResources);

// Chat endpoints
route.post('/:id/chat/send', sendChatMessage);
route.get('/:id/chat/history', getChatMessages);

// In-app notifications
route.get('/notifications/list', listInAppNotifications);
route.post('/notifications/read', markNotificationsRead);

export default route;
