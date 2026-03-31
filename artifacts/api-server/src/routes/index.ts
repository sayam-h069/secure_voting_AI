import { Router, type IRouter } from "express";
import healthRouter from "./health";
import electionsRouter from "./elections";
import votesRouter from "./votes";
import fraudRouter from "./fraud";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/elections", electionsRouter);
router.use("/votes", votesRouter);
router.use("/fraud", fraudRouter);
router.use("/dashboard", dashboardRouter);

export default router;
