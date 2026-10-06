import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { jwtAuthOptions } from "../utils/jwtAuthOptions";
import {
  deleteContestRoom,
  deleteContestReportCodeforcesCredentials,
  generateContestRoomReport,
  getAllContestRooms,
  getContestReportCodeforcesCredentials,
  getContestRoom,
  getContestRoomScoring,
  insertContestRoom,
  previewContestRoomScoring,
  publishContestRoomReport,
  saveContestReportCodeforcesCredentials,
  updateContestRoom,
  updateContestRoomScoring,
  validateContestReportCodeforcesSession,
} from "../controllers/contestRoomController";

const route = new Hono();

route.use(
  "/*",
  jwt(jwtAuthOptions()),
);

route.post("/insert", insertContestRoom);
route.get("/all", getAllContestRooms);
route.post("/get", getContestRoom);
route.post("/update", updateContestRoom);
route.post("/delete", deleteContestRoom);
route.get("/provider-access/codeforces-credentials", getContestReportCodeforcesCredentials);
route.put("/provider-access/codeforces-credentials", saveContestReportCodeforcesCredentials);
route.delete("/provider-access/codeforces-credentials", deleteContestReportCodeforcesCredentials);
route.post("/provider-access/codeforces-session/validate", validateContestReportCodeforcesSession);
route.get("/:roomId/scoring", getContestRoomScoring);
route.post("/:roomId/scoring/preview", previewContestRoomScoring);
route.put("/:roomId/scoring", updateContestRoomScoring);
route.post("/:roomId/report", generateContestRoomReport);
route.post("/:roomId/publish", publishContestRoomReport);

export default route;
