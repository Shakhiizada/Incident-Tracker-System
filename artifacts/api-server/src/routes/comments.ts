import { Router, type IRouter } from "express";
import { asc, eq, or } from "drizzle-orm";
import {
  db,
  commentsTable,
  usersTable,
  incidentsTable,
  auditTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { serializeComment } from "../lib/incident-helpers";

const router: IRouter = Router();

router.get(
  "/incidents/:id/comments",
  requireAuth,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Некорректный id" });
      return;
    }
    const rows = await db
      .select({ comment: commentsTable, author: usersTable })
      .from(commentsTable)
      .leftJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
      .where(eq(commentsTable.incidentId, id))
      .orderBy(asc(commentsTable.createdAt));
    res.json(rows.map((r) => serializeComment(r.comment, r.author)));
  },
);

router.post(
  "/incidents/:id/comments",
  requireAuth,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Некорректный id" });
      return;
    }
    const body = req.body?.body;
    if (typeof body !== "string" || body.trim().length === 0) {
      res.status(400).json({ error: "Текст комментария обязателен" });
      return;
    }
    const [incident] = await db
      .select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, id))
      .limit(1);
    if (!incident) {
      res.status(404).json({ error: "Инцидент не найден" });
      return;
    }
    const [comment] = await db
      .insert(commentsTable)
      .values({
        incidentId: id,
        authorId: req.user!.id,
        body: body.trim(),
      })
      .returning();
    await db.insert(auditTable).values({
      incidentId: id,
      userId: req.user!.id,
      action: "comment.added",
      details: `Добавлен комментарий`,
    });
    const [author] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id))
      .limit(1);
    res.status(201).json(serializeComment(comment, author ?? null));

    void or;
  },
);

export default router;
