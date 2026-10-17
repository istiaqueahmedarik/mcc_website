import { Hono } from "hono"
import { getAllContests } from "../controllers/generalContestController"

const contestRoutes = new Hono()

contestRoutes.get("/all", getAllContests)

export default contestRoutes