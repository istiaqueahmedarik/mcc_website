import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { jwtAuthOptions } from "../utils/jwtAuthOptions";
import {
  createTrainerForm,
  getPublicTrainerForm,
  getTrainerForm,
  getTrainerFormAnalytics,
  getTrainerFormResponses,
  listTrainerForms,
  listUserFormFields,
  resolvePublicTrainerFormUser,
  submitPublicTrainerForm,
  updateTrainerForm,
} from "../controllers/trainerFormController";

const route = new Hono();

route.get("/public/:slug", getPublicTrainerForm);
route.post("/public/:slug/resolve", resolvePublicTrainerFormUser);
route.post("/public/:slug/submit", submitPublicTrainerForm);

route.use(
  "/manage/*",
  jwt(jwtAuthOptions()),
);

route.get("/manage/user-fields", listUserFormFields);
route.get("/manage/forms", listTrainerForms);
route.post("/manage/forms", createTrainerForm);
route.get("/manage/forms/:id", getTrainerForm);
route.post("/manage/forms/:id", updateTrainerForm);
route.get("/manage/forms/:id/responses", getTrainerFormResponses);
route.get("/manage/forms/:id/analytics", getTrainerFormAnalytics);

export default route;
