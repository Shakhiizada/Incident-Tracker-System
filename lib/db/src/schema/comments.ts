import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull(),
  authorId: integer("author_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Comment = typeof commentsTable.$inferSelect;
export type InsertComment = typeof commentsTable.$inferInsert;
