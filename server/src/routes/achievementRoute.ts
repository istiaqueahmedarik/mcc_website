import { Hono } from "hono";
import { jwt } from "hono/jwt";
import {
  deleteAchievement,
  getAchievement,
  getAchievementNumber,
  getAchievements,
  getAchievementTags,
  insertAchievement,
  updateAchievement,
} from "../controllers/achievementController";

const route = new Hono();

route.use(
  "/insert/*",
  jwt({
    secret: process.env.SECRET || "",
    alg: "HS256",
  }),
);

route.post("/insert", insertAchievement);
route.post("/insert/update", updateAchievement);
route.post("/insert/delete", deleteAchievement);
route.get("/get_achievements", getAchievements);
route.post("/get_achievement", getAchievement);
route.get("/get_achievement_number", getAchievementNumber);
route.get("/get_tags", getAchievementTags);
export default route;
