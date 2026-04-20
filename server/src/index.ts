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
import wordRoute from "./routes/wordRoute";
import typingRoomRoute from "./routes/typingRoomRoute";
import typingParticipantRoute from "./routes/typingParticipantRoute";
import {
  autoStartScheduledRooms,
  isDbConnectionError,
} from "./controllers/typingRoomController";

const AUTO_START_INTERVAL_MS = 1000;
const AUTO_START_MAX_CONSECUTIVE_DB_FAILURES = 5;

const app = new Hono<{ Variables: JwtVariables }>();

app.use("/*", cors());

// console the endpoint hit for debugging
app.use("/*", async (c, next) => {
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.url}`);
  await next();
});

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
app.route("/typing/words", wordRoute);
app.route("/typing/rooms", typingRoomRoute);
app.route("/typing/participants", typingParticipantRoute);

let autoStartSchedulerInFlight = false;
let autoStartConsecutiveDbFailures = 0;

setInterval(async () => {
  if (autoStartSchedulerInFlight) return;
  autoStartSchedulerInFlight = true;

  try {
    await autoStartScheduledRooms();

    if (autoStartConsecutiveDbFailures > 0) {
      console.log(
        `[${new Date().toISOString()}] Auto-start scheduler recovered after ${autoStartConsecutiveDbFailures} DB failure(s).`,
      );
    }

    autoStartConsecutiveDbFailures = 0;
  } catch (error) {
    const timestamp = new Date().toISOString();

    if (isDbConnectionError(error)) {
      autoStartConsecutiveDbFailures += 1;
      console.error(
        `[${timestamp}] Auto-start scheduler DB failure ${autoStartConsecutiveDbFailures}/${AUTO_START_MAX_CONSECUTIVE_DB_FAILURES}.`,
        error,
      );

      if (
        autoStartConsecutiveDbFailures >=
        AUTO_START_MAX_CONSECUTIVE_DB_FAILURES
      ) {
        console.error(
          `[${timestamp}] Auto-start scheduler reached max consecutive DB failures; exiting for PM2 restart.`,
        );
        process.exit(1);
      }
    } else {
      console.error(
        `[${timestamp}] Auto-start scheduler failed with non-retryable error:`,
        error,
      );
    }
  } finally {
    autoStartSchedulerInFlight = false;
  }
}, AUTO_START_INTERVAL_MS);

export default {
  port: process.env.PORT || 5000,
  fetch: app.fetch,
};
