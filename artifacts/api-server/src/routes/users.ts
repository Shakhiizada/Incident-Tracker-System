import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { publicUser } from "../lib/auth";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/users", requireAuth, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.name);
  res.json(users.map(publicUser));
});

export default router;
