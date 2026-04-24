import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export type IncidentType =
  | "data_leak"
  | "ddos"
  | "malware"
  | "phishing"
  | "unauthorized_access"
  | "insider_threat"
  | "social_engineering"
  | "other";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type IncidentStatus = "new" | "in_progress" | "resolved" | "closed";

export const incidentsTable = pgTable("incidents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().$type<IncidentType>(),
  severity: text("severity").notNull().$type<IncidentSeverity>(),
  status: text("status").notNull().$type<IncidentStatus>().default("new"),
  reporterId: integer("reporter_id").notNull(),
  assigneeId: integer("assignee_id"),
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export type Incident = typeof incidentsTable.$inferSelect;
export type InsertIncident = typeof incidentsTable.$inferInsert;
