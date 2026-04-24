import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import incidentsRouter from "./incidents";
import commentsRouter from "./comments";
import auditRouter from "./audit";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(incidentsRouter);
router.use(commentsRouter);
router.use(auditRouter);
router.use(statsRouter);

export default router;
