/** Real route handlers against a disposable database; no production app scheduler. */
import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import globalFormRoute from '../src/routes/globalFormRoute';
import { acceptUser, getProfile, login, pendingUser, rejectUser } from '../src/controllers/authController';
import { setMistId } from '../src/controllers/userController';
import { jwtAuthOptions } from '../src/utils/jwtAuthOptions';
import contestRoomRoute from '../src/routes/contestRoomRoute';
import contestRoomContestsRoute from '../src/routes/contestRoomContestsRoute';

export function createGlobalFormsTestApp() {
  const app = new Hono();
  app.route('/global-forms', globalFormRoute);
  app.route('/contest-room', contestRoomRoute);
  app.route('/contest-room-contests', contestRoomContestsRoute);
  app.post('/auth/login', login);
  app.use('/auth/user/*', jwt(jwtAuthOptions()));
  app.get('/auth/user/profile', getProfile);
  app.get('/auth/user/pendings', pendingUser);
  app.post('/auth/user/accept', acceptUser);
  app.post('/auth/user/reject', rejectUser);
  app.post('/user/mist-id/set', jwt(jwtAuthOptions()), setMistId);
  return app;
}
