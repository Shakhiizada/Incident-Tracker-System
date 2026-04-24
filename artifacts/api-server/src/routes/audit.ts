import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, auditTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { serializeAudit } from "../lib/incident-helpers";

const router: IRouter = Router();

router.get(
  "/incidents/:id/audit",
  requireAuth,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Некорректный id" });
      return;
    }
    const rows = await db
      .select({ entry: auditTable, user: usersTable })
      .from(auditTable)
      .leftJoin(usersTable, eq(auditTable.userId, usersTable.id))
      .where(eq(auditTable.incidentId, id))
      .orderBy(desc(auditTable.createdAt));
    res.json(rows.map((r) => serializeAudit(r.entry, r.user)));
  },
);

router.get(
  "/audit",
  requireRole("admin", "analyst"),
  async (req, res): Promise<void> => {
    const limitRaw = req.query.limit;
    let limit = 50;
    if (typeof limitRaw === "string") {
      const parsed = Number.parseInt(limitRaw, 10);
      if (Number.isFinite(parsed) && parsed > 0 && parsed <= 500) limit = parsed;
    }
    const rows = await db
      .select({ entry: auditTable, user: usersTable })
      .from(auditTable)
      .leftJoin(usersTable, eq(auditTable.userId, usersTable.id))
      .orderBy(desc(auditTable.createdAt))
      .limit(limit);
    res.json(rows.map((r) => serializeAudit(r.entry, r.user)));
  },
);

export default router;
