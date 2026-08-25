import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { jwtAuthOptions } from "../utils/jwtAuthOptions";
import {
  deleteContestRoom,
  getAllContestRooms,
  getContestRoom,
  insertContestRoom,
  updateContestRoom,
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

export default route;
