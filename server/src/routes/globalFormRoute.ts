import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { jwt } from "hono/jwt";
import { HTTPException } from "hono/http-exception";
import { jwtAuthOptions } from "../utils/jwtAuthOptions";
import {
  cloneTemplate,
  cloneCampaign,
  createCampaign,
  createTemplate,
  deleteCampaign,
  deleteResponse,
  deleteTemplate,
  endCampaign,
  getCampaign,
  getDashboard,
  getPublicCampaign,
  heartbeatCampaign,
  listCampaigns,
  listResponses,
  listTemplates,
  previewCampaign,
  startCampaign,
  resumeCampaign,
  streamDashboard,
  submitCampaign,
  updateCampaign,
  updateTemplate,
} from "../controllers/globalFormController";

const route = new Hono();

route.onError((error: any, c) => {
  if (error instanceof HTTPException) return error.getResponse();
  if (error instanceof SyntaxError || error?.code === '22P02') {
    return c.json({ error: 'Invalid form request' }, 400);
  }
  // Database exceptions can contain identifiers and answer values. Do not log them.
  return c.json({ error: 'The forms service could not complete this request' }, 500);
});

route.get("/public/:slug", getPublicCampaign);
route.get("/public/:slug/preview", jwt(jwtAuthOptions()), previewCampaign);
route.post("/public/:slug/submit", bodyLimit({ maxSize: 256 * 1024 }), jwt(jwtAuthOptions()), submitCampaign);
route.post("/public/:slug/heartbeat", bodyLimit({ maxSize: 8 * 1024 }), jwt(jwtAuthOptions()), heartbeatCampaign);

route.use("/manage/*", jwt(jwtAuthOptions()));
route.get("/manage/templates", listTemplates);
route.post("/manage/templates", bodyLimit({ maxSize: 256 * 1024 }), createTemplate);
route.delete("/manage/templates/:id", deleteTemplate);
route.put("/manage/templates/:id", bodyLimit({ maxSize: 256 * 1024 }), updateTemplate);
route.post("/manage/templates/:id/clone", cloneTemplate);
route.get("/manage/campaigns", listCampaigns);
route.post("/manage/campaigns", bodyLimit({ maxSize: 32 * 1024 }), createCampaign);
route.get("/manage/campaigns/:id", getCampaign);
route.delete("/manage/campaigns/:id", deleteCampaign);
route.put("/manage/campaigns/:id", bodyLimit({ maxSize: 32 * 1024 }), updateCampaign);
route.post("/manage/campaigns/:id/start", startCampaign);
route.post("/manage/campaigns/:id/clone", cloneCampaign);
route.post("/manage/campaigns/:id/end", endCampaign);
route.post("/manage/campaigns/:id/resume", resumeCampaign);
route.get("/manage/campaigns/:id/responses", listResponses);
route.delete("/manage/campaigns/:id/responses/:responseId", deleteResponse);
route.get("/manage/dashboard", getDashboard);
route.get("/manage/stream", streamDashboard);

export default route;
