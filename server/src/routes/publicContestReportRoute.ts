import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { jwtAuthOptions } from "../utils/jwtAuthOptions";
import {
  deletePublicContestReport,
  getAllPublicContestReports,
  getPublicContestReport,
  insertPublicContestReport,
  updatePublicContestReport,
} from "../controllers/publicContestReportController";

const route = new Hono();

route.use(
  "/admin/*",
  jwt(jwtAuthOptions()),
);

route.post("/admin/insert", insertPublicContestReport);
route.get("/all", getAllPublicContestReports);
route.post("/get", getPublicContestReport);
route.post("/admin/update", updatePublicContestReport);
route.post("/admin/delete", deletePublicContestReport);

export default route;
