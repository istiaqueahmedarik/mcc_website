import { Hono } from "hono";
import { jwt } from "hono/jwt";
import {
  createCustomContest,
  deleteCustomContest,
  getActiveCustomContests,
  getAllCustomContests,
  updateCustomContest,
} from "../controllers/customContestController";

const route = new Hono();

route.get("/active", getActiveCustomContests);

route.use(
  "/*",
  jwt({
    secret: process.env.SECRET || process.env.JWT_SECRET || "secret",
    alg: "HS256",
  }),
);

route.get("/all", getAllCustomContests);
route.post("/create", createCustomContest);
route.post("/update", updateCustomContest);
route.post("/delete", deleteCustomContest);

export default route;
