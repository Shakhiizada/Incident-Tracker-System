import { Router, type IRouter } from "express";
import { desc, eq, sql, isNotNull } from "drizzle-orm";
import {
  db,
  incidentsTable,
  auditTable,
  usersTable,
  type IncidentStatus,
  type IncidentSeverity,
  type IncidentType,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { serializeAudit } from "../lib/incident-helpers";

const router: IRouter = Router();

router.get("/stats/summary", requireAuth, async (_req, res): Promise<void> => {
  const all = await db.select().from(incidentsTable);
  const total = all.length;
  let newCnt = 0;
  let inProgress = 0;
  let resolved = 0;
  let closed = 0;
  let critical = 0;
  let last7Days = 0;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let totalResolutionMs = 0;
  let resolvedCount = 0;
  for (const i of all) {
    if (i.status === "new") newCnt++;
    if (i.status === "in_progress") inProgress++;
    if (i.status === "resolved") resolved++;
    if (i.status === "closed") closed++;
    if (i.severity === "critical") critical++;
    if (i.createdAt.getTime() >= sevenDaysAgo) last7Days++;
    if (i.resolvedAt && (i.status === "resolved" || i.status === "closed")) {
      totalResolutionMs += i.resolvedAt.getTime() - i.createdAt.getTime();
      resolvedCount++;
    }
  }
  const avgResolutionHours =
    resolvedCount > 0 ? totalResolutionMs / resolvedCount / (1000 * 60 * 60) : 0;

  res.json({
    total,
    new: newCnt,
    inProgress,
    resolved,
    closed,
    critical,
    last7Days,
    avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
  });
});

const ALL_TYPES: IncidentType[] = [
  "data_leak",
  "ddos",
  "malware",
  "phishing",
  "unauthorized_access",
  "insider_threat",
  "social_engineering",
  "other",
];
const ALL_SEVERITIES: IncidentSeverity[] = ["low", "medium", "high", "critical"];

router.get("/stats/by-type", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      type: incidentsTable.type,
      count: sql<number>`count(*)::int`,
    })
    .from(incidentsTable)
    .groupBy(incidentsTable.type);
  const map = new Map<IncidentType, number>();
  for (const r of rows) map.set(r.type as IncidentType, r.count);
  const result = ALL_TYPES.map((t) => ({ type: t, count: map.get(t) ?? 0 }));
  res.json(result);
});

router.get(
  "/stats/by-severity",
  requireAuth,
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        severity: incidentsTable.severity,
        count: sql<number>`count(*)::int`,
      })
      .from(incidentsTable)
      .groupBy(incidentsTable.severity);
    const map = new Map<IncidentSeverity, number>();
    for (const r of rows) map.set(r.severity as IncidentSeverity, r.count);
    const result = ALL_SEVERITIES.map((s) => ({
      severity: s,
      count: map.get(s) ?? 0,
    }));
    res.json(result);
  },
);

router.get(
  "/stats/timeline",
  requireAuth,
  async (req, res): Promise<void> => {
    const daysRaw = req.query.days;
    let days = 14;
    if (typeof daysRaw === "string") {
      const parsed = Number.parseInt(daysRaw, 10);
      if (Number.isFinite(parsed) && parsed > 0 && parsed <= 90) days = parsed;
    }
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const rows = await db
      .select({
        date: sql<string>`to_char(${incidentsTable.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(incidentsTable)
      .where(sql`${incidentsTable.createdAt} >= ${since}`)
      .groupBy(sql`to_char(${incidentsTable.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`);

    const map = new Map<string, number>();
    for (const r of rows) map.set(r.date, r.count);

    const result: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, count: map.get(key) ?? 0 });
    }
    res.json(result);

    void isNotNull;
  },
);

router.get(
  "/stats/recent-activity",
  requireAuth,
  async (req, res): Promise<void> => {
    const limitRaw = req.query.limit;
    let limit = 10;
    if (typeof limitRaw === "string") {
      const parsed = Number.parseInt(limitRaw, 10);
      if (Number.isFinite(parsed) && parsed > 0 && parsed <= 100) limit = parsed;
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
