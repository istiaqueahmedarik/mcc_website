import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { jwtAuthOptions } from "../utils/jwtAuthOptions";
import {
  deleteContestRoomContest,
  getAllContestRoomContests,
  getContestRoomContest,
  insertContestRoomContest,
  updateContestRoomContest,
} from "../controllers/contestRoomContestsController";

const route = new Hono();

route.use(
  "/*",
  jwt(jwtAuthOptions()),
);

route.post("/insert", insertContestRoomContest);
route.get("/all", getAllContestRoomContests);
route.post("/get", getContestRoomContest);
route.post("/update", updateContestRoomContest);
route.post("/delete", deleteContestRoomContest);

export default route;
