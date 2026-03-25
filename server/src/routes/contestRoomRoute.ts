import { Hono } from "hono";
import { jwt } from "hono/jwt";
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
  jwt({
    secret: process.env.SECRET || "",
    alg: "HS256",
  }),
);

route.post("/insert", insertContestRoom);
route.get("/all", getAllContestRooms);
route.post("/get", getContestRoom);
route.post("/update", updateContestRoom);
route.post("/delete", deleteContestRoom);

export default route;
