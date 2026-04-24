import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const auditTable = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id"),
  userId: integer("user_id"),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AuditEntry = typeof auditTable.$inferSelect;
export type InsertAuditEntry = typeof auditTable.$inferInsert;
