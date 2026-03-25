import { Hono } from "hono";
import { jwt } from "hono/jwt";
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
  jwt({
    secret: process.env.SECRET || "",
    alg: "HS256",
  }),
);

route.post("/admin/insert", insertPublicContestReport);
route.get("/all", getAllPublicContestReports);
route.post("/get", getPublicContestReport);
route.post("/admin/update", updatePublicContestReport);
route.post("/admin/delete", deletePublicContestReport);

export default route;
