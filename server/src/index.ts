import { Hono } from "hono";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import type { JwtVariables } from "hono/jwt";

import achievementRoute from "./routes/achievementRoute";
import authRoute from "./routes/authRoute";
import courseRoute from "./routes/courseRoute";
import batchRoute from "./routes/batchRoute";

const app = new Hono<{ Variables: JwtVariables }>();

app.use(prettyJSON());
app.use("/*", cors());

app.route("/achieve", achievementRoute);
app.route("/auth", authRoute);
app.route("/course", courseRoute);
app.route("/batch", batchRoute);

export default {
  port: process.env.PORT || 5000,
  fetch: app.fetch,
};
