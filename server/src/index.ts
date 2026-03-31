import { Hono } from "hono";
import { cors } from "hono/cors";
import type { JwtVariables } from "hono/jwt";

import getContests from "./contests/getContests";
import achievementRoute from "./routes/achievementRoute";
import alumniRoute from "./routes/alumniRoute";
import authRoute from "./routes/authRoute";
import batchRoute from "./routes/batchRoute";
import contestRoomContestsRoute from "./routes/contestRoomContestsRoute";
import contestRoomRoute from "./routes/contestRoomRoute";
import courseRoute from "./routes/courseRoute";
import customContestRoute from "./routes/customContestRoute";
import demeritRoute from "./routes/demeritRoute";
import icpcJourneyRoute from "./routes/icpcJourneyRoute";
import landingRoute from "./routes/landingRoute";
import publicContestReportRoute from "./routes/publicContestReportRoute";
import teamCollectionRoute from "./routes/teamCollectionRoute";
import userRoute from "./routes/userRoute";
import vjudgeRoute from "./routes/vjudgeRoute";

const app = new Hono<{ Variables: JwtVariables }>();

app.use("/*", cors());

app.route("/achieve", achievementRoute);
app.route("/auth", authRoute);
app.route("/course", courseRoute);
app.route("/batch", batchRoute);
app.route("/user", userRoute);
app.route("/getContests", getContests);
app.route("/contest-room", contestRoomRoute);
app.route("/contest-room-contests", contestRoomContestsRoute);
app.route("/demerit", demeritRoute);
app.route("/icpc-journey", icpcJourneyRoute);
app.route("/public-contest-report", publicContestReportRoute);
app.route("/vjudge", vjudgeRoute);
app.route("/api/vjudge", vjudgeRoute);
app.route("/custom-contests", customContestRoute);
app.route("/landing", landingRoute);
app.route("/alumni", alumniRoute);
app.route("/team-collection", teamCollectionRoute);

export default {
  port: process.env.PORT || 5000,
  fetch: app.fetch,
};
