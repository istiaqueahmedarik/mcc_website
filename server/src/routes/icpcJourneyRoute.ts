import { Hono } from "hono";
import { jwt } from "hono/jwt";
import {
  createAdminIcpcJourney,
  deleteAdminIcpcJourney,
  getIcpcJourneyPublic,
  listAdminIcpcJourney,
  updateAdminIcpcJourney,
} from "../controllers/icpcJourneyController";

const route = new Hono();

route.get("/public", getIcpcJourneyPublic);
route.use("/admin/*", jwt({ secret: process.env.SECRET || "", alg: "HS256" }));
route.get("/admin/list", listAdminIcpcJourney);
route.post("/admin/create", createAdminIcpcJourney);
route.post("/admin/update", updateAdminIcpcJourney);
route.post("/admin/delete", deleteAdminIcpcJourney);

export default route;
