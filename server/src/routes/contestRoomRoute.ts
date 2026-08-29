import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { jwtAuthOptions } from "../utils/jwtAuthOptions";
import {
  deleteContestRoom,
  generateContestRoomReport,
  getAllContestRooms,
  getContestRoom,
  getContestRoomScoring,
  insertContestRoom,
  previewContestRoomScoring,
  publishContestRoomReport,
  updateContestRoom,
  updateContestRoomScoring,
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
route.get("/:roomId/scoring", getContestRoomScoring);
route.post("/:roomId/scoring/preview", previewContestRoomScoring);
route.put("/:roomId/scoring", updateContestRoomScoring);
route.post("/:roomId/report", generateContestRoomReport);
route.post("/:roomId/publish", publishContestRoomReport);

export default route;
