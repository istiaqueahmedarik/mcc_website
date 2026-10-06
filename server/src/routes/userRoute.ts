import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { jwtAuthOptions } from "../utils/jwtAuthOptions";
import {
  getSchedulesDash,
  getClassroomSettings,
  getVjudgeId,
  listCodeforcesPending,
  listVjudgePending,
  loginToVJudgeRoute,
  searchUsers,
  setBasicProfile,
  setCodeforcesId,
  setMistId,
  setMistIdCard,
  setProfilePic,
  setTrainerProfile,
  setTshirtSize,
  updateClassroomSettings,
  setVjudgeId,
  verifyCodeforces,
  verifyVjudge,
} from "../controllers/userController";

const route = new Hono();

route.use(
  "/*",
  jwt(jwtAuthOptions()),
);

route.get("/get_vjudge_id", getVjudgeId);
route.get("/get_shchedules_dash", getSchedulesDash);
route.get("/classroom-settings", getClassroomSettings);
route.post("/classroom-settings", updateClassroomSettings);
route.post("/vjudge_login", loginToVJudgeRoute);
// Codeforces manual verification endpoints
route.post("/cf/set", setCodeforcesId);
route.get("/cf/pending", listCodeforcesPending);
route.post("/cf/verify", verifyCodeforces);
route.post("/vjudge/set", setVjudgeId);
route.get("/vjudge/pending", listVjudgePending);
route.post("/vjudge/verify", verifyVjudge);
route.post("/tshirt/set", setTshirtSize);
route.post("/basic/set", setBasicProfile);
route.post("/profile-pic/set", setProfilePic);
route.post("/mist-id-card/set", setMistIdCard);
route.post("/mist-id/set", setMistId);
route.get("/search", searchUsers);
route.post("/trainer-profile/set", setTrainerProfile);

export default route;
