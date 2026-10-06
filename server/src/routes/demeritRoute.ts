import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { jwtAuthOptions } from "../utils/jwtAuthOptions";
import {
  createDemerit,
  deleteDemerit,
  getAllDemerits,
  getDemeritsByContest,
  getDemeritsByVjudgeContest,
  updateDemerit,
} from "../controllers/demeritController";

const demeritRoute = new Hono();

demeritRoute.use(
  "/admin/*",
  jwt(jwtAuthOptions()),
);

// Public routes (no JWT required)
demeritRoute.post("/by-contest", getDemeritsByContest);
demeritRoute.post("/by-vjudge-contest", getDemeritsByVjudgeContest);

// Admin routes (JWT required)
demeritRoute.post("/admin/create", createDemerit);
demeritRoute.post("/admin/update", updateDemerit);
demeritRoute.post("/admin/delete", deleteDemerit);
demeritRoute.get("/admin/all", getAllDemerits);

export default demeritRoute;
