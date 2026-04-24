import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  db,
  incidentsTable,
  usersTable,
  auditTable,
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentType,
} from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { serializeIncident } from "../lib/incident-helpers";

const router: IRouter = Router();

const VALID_TYPES: IncidentType[] = [
  "data_leak",
  "ddos",
  "malware",
  "phishing",
  "unauthorized_access",
  "insider_threat",
  "social_engineering",
  "other",
];
const VALID_SEVERITIES: IncidentSeverity[] = ["low", "medium", "high", "critical"];
const VALID_STATUSES: IncidentStatus[] = ["new", "in_progress", "resolved", "closed"];
const SEVERITY_RANK: Record<IncidentSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

async function loadIncidentWithRelations(id: number) {
  const [incident] = await db
    .select()
    .from(incidentsTable)
    .where(eq(incidentsTable.id, id))
    .limit(1);
  if (!incident) return null;

  const [reporter] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, incident.reporterId))
    .limit(1);

  let assignee = null;
  if (incident.assigneeId != null) {
    const [a] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, incident.assigneeId))
      .limit(1);
    assignee = a ?? null;
  }

  return serializeIncident(incident, reporter ?? null, assignee);
}

router.get("/incidents", requireAuth, async (req, res): Promise<void> => {
  const { status, severity, type, assigneeId, reporterId, mine, search } = req.query;
  const filters = [];

  if (typeof status === "string" && (VALID_STATUSES as string[]).includes(status)) {
    filters.push(eq(incidentsTable.status, status as IncidentStatus));
  }
  if (typeof severity === "string" && (VALID_SEVERITIES as string[]).includes(severity)) {
    filters.push(eq(incidentsTable.severity, severity as IncidentSeverity));
  }
  if (typeof type === "string" && (VALID_TYPES as string[]).includes(type)) {
    filters.push(eq(incidentsTable.type, type as IncidentType));
  }
  if (typeof assigneeId === "string") {
    if (assigneeId === "me") {
      filters.push(eq(incidentsTable.assigneeId, req.user!.id));
    } else {
      const id = Number.parseInt(assigneeId, 10);
      if (Number.isFinite(id)) {
        filters.push(eq(incidentsTable.assigneeId, id));
      }
    }
  }
  if (typeof reporterId === "string") {
    if (reporterId === "me") {
      filters.push(eq(incidentsTable.reporterId, req.user!.id));
    } else {
      const id = Number.parseInt(reporterId, 10);
      if (Number.isFinite(id)) {
        filters.push(eq(incidentsTable.reporterId, id));
      }
    }
  }
  if (mine === "true") {
    filters.push(eq(incidentsTable.reporterId, req.user!.id));
  }
  if (typeof search === "string" && search.trim() !== "") {
    const term = `%${search.trim()}%`;
    filters.push(
      or(ilike(incidentsTable.title, term), ilike(incidentsTable.description, term))!,
    );
  }

  const rows = await db
    .select({
      incident: incidentsTable,
      reporter: usersTable,
    })
    .from(incidentsTable)
    .leftJoin(usersTable, eq(incidentsTable.reporterId, usersTable.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(incidentsTable.createdAt));

  const assigneeIds = Array.from(
    new Set(
      rows.map((r) => r.incident.assigneeId).filter((v): v is number => v != null),
    ),
  );
  const assigneeMap = new Map<number, typeof usersTable.$inferSelect>();
  if (assigneeIds.length > 0) {
    const assignees = await db
      .select()
      .from(usersTable)
      .where(or(...assigneeIds.map((id) => eq(usersTable.id, id)))!);
    for (const a of assignees) assigneeMap.set(a.id, a);
  }

  const result = rows.map((r) =>
    serializeIncident(
      r.incident,
      r.reporter,
      r.incident.assigneeId != null
        ? assigneeMap.get(r.incident.assigneeId) ?? null
        : null,
    ),
  );
  res.json(result);
});

router.post("/incidents", requireAuth, async (req, res): Promise<void> => {
  const { title, description, type, severity, assigneeId, attachmentUrl, attachmentName } = req.body ?? {};

  if (
    typeof title !== "string" ||
    title.trim().length < 3 ||
    typeof description !== "string" ||
    description.trim().length < 5 ||
    typeof type !== "string" ||
    !(VALID_TYPES as string[]).includes(type) ||
    typeof severity !== "string" ||
    !(VALID_SEVERITIES as string[]).includes(severity)
  ) {
    res.status(400).json({ error: "Некорректные данные инцидента" });
    return;
  }

  const [incident] = await db
    .insert(incidentsTable)
    .values({
      title: title.trim(),
      description: description.trim(),
      type: type as IncidentType,
      severity: severity as IncidentSeverity,
      status: "new",
      reporterId: req.user!.id,
      assigneeId: typeof assigneeId === "number" ? assigneeId : null,
      attachmentUrl: typeof attachmentUrl === "string" && attachmentUrl.trim() !== "" ? attachmentUrl : null,
      attachmentName: typeof attachmentName === "string" && attachmentName.trim() !== "" ? attachmentName : null,
    })
    .returning();

  await db.insert(auditTable).values({
    incidentId: incident.id,
    userId: req.user!.id,
    action: "incident.created",
    details: `Создан инцидент: ${incident.title}`,
  });

  if (incident.assigneeId != null) {
    await db.insert(auditTable).values({
      incidentId: incident.id,
      userId: req.user!.id,
      action: "incident.assigned",
      details: `Назначен ответственный (ID ${incident.assigneeId})`,
    });
  }

  const result = await loadIncidentWithRelations(incident.id);
  res.status(201).json(result);
});

router.get("/incidents/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Некорректный id" });
    return;
  }
  const incident = await loadIncidentWithRelations(id);
  if (!incident) {
    res.status(404).json({ error: "Инцидент не найден" });
    return;
  }
  res.json(incident);
});

router.patch(
  "/incidents/:id",
  requireRole("admin", "analyst"),
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Некорректный id" });
      return;
    }

    const [existing] = await db
      .select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Инцидент не найден" });
      return;
    }

    const patch: Partial<typeof incidentsTable.$inferInsert> = {};
    const events: Array<{ action: string; details: string }> = [];

    const { title, description, type, severity, status, assigneeId } = req.body ?? {};

    if (typeof title === "string" && title.trim().length >= 3 && title !== existing.title) {
      patch.title = title.trim();
      events.push({ action: "incident.updated", details: `Заголовок изменён` });
    }
    if (typeof description === "string" && description.trim().length >= 5 && description !== existing.description) {
      patch.description = description.trim();
      events.push({ action: "incident.updated", details: `Описание обновлено` });
    }
    if (typeof type === "string" && (VALID_TYPES as string[]).includes(type) && type !== existing.type) {
      patch.type = type as IncidentType;
      events.push({ action: "incident.updated", details: `Тип: ${existing.type} → ${type}` });
    }
    if (typeof severity === "string" && (VALID_SEVERITIES as string[]).includes(severity) && severity !== existing.severity) {
      patch.severity = severity as IncidentSeverity;
      events.push({ action: "incident.severity_changed", details: `Критичность: ${existing.severity} → ${severity}` });
    }
    if (typeof status === "string" && (VALID_STATUSES as string[]).includes(status) && status !== existing.status) {
      patch.status = status as IncidentStatus;
      if (status === "resolved" || status === "closed") {
        patch.resolvedAt = new Date();
      }
      events.push({ action: "incident.status_changed", details: `Статус: ${existing.status} → ${status}` });
    }
    if (assigneeId === null && existing.assigneeId !== null) {
      patch.assigneeId = null;
      events.push({ action: "incident.unassigned", details: `Снят ответственный` });
    } else if (typeof assigneeId === "number" && assigneeId !== existing.assigneeId) {
      patch.assigneeId = assigneeId;
      events.push({ action: "incident.assigned", details: `Назначен ответственный (ID ${assigneeId})` });
    }

    if (Object.keys(patch).length === 0) {
      const result = await loadIncidentWithRelations(id);
      res.json(result);
      return;
    }

    await db.update(incidentsTable).set(patch).where(eq(incidentsTable.id, id));

    for (const event of events) {
      await db.insert(auditTable).values({
        incidentId: id,
        userId: req.user!.id,
        action: event.action,
        details: event.details,
      });
    }

    const result = await loadIncidentWithRelations(id);
    res.json(result);
  },
);

router.post(
  "/incidents/:id/escalate",
  requireRole("admin", "analyst"),
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Некорректный id" });
      return;
    }
    const [existing] = await db
      .select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Инцидент не найден" });
      return;
    }
    const currentRank = SEVERITY_RANK[existing.severity];
    if (currentRank >= SEVERITY_RANK.critical) {
      res.status(400).json({ error: "Уже критический уровень" });
      return;
    }
    const next = (Object.keys(SEVERITY_RANK) as IncidentSeverity[]).find(
      (k) => SEVERITY_RANK[k] === currentRank + 1,
    )!;
    await db
      .update(incidentsTable)
      .set({ severity: next })
      .where(eq(incidentsTable.id, id));
    await db.insert(auditTable).values({
      incidentId: id,
      userId: req.user!.id,
      action: "incident.escalated",
      details: `Эскалация: ${existing.severity} → ${next}`,
    });
    const result = await loadIncidentWithRelations(id);
    res.json(result);
  },
);

// Suppress unused warning
void sql;

export default router;
