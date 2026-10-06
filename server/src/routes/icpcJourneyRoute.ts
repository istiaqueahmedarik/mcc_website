import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { jwtAuthOptions } from "../utils/jwtAuthOptions";
import {
  createAdminIcpcJourney,
  deleteAdminIcpcJourney,
  getIcpcJourneyPublic,
  listAdminIcpcJourney,
  updateAdminIcpcJourney,
} from "../controllers/icpcJourneyController";

const route = new Hono();

route.get("/public", getIcpcJourneyPublic);
route.use("/admin/*", jwt(jwtAuthOptions()));
route.get("/admin/list", listAdminIcpcJourney);
route.post("/admin/create", createAdminIcpcJourney);
route.post("/admin/update", updateAdminIcpcJourney);
route.post("/admin/delete", deleteAdminIcpcJourney);

export default route;
