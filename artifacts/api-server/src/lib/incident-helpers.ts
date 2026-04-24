import type { Incident, User, Comment, AuditEntry } from "@workspace/db";
import { publicUser } from "./auth";

export function serializeIncident(
  incident: Incident,
  reporter: User | null,
  assignee: User | null,
) {
  return {
    id: incident.id,
    title: incident.title,
    description: incident.description,
    type: incident.type,
    severity: incident.severity,
    status: incident.status,
    reporterId: incident.reporterId,
    reporter: reporter ? publicUser(reporter) : undefined,
    assigneeId: incident.assigneeId,
    assignee: assignee ? publicUser(assignee) : null,
    attachmentUrl: incident.attachmentUrl,
    attachmentName: incident.attachmentName,
    createdAt: incident.createdAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
  };
}

export function serializeComment(comment: Comment, author: User | null) {
  return {
    id: comment.id,
    incidentId: comment.incidentId,
    authorId: comment.authorId,
    author: author ? publicUser(author) : undefined,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}

export function serializeAudit(entry: AuditEntry, user: User | null) {
  return {
    id: entry.id,
    incidentId: entry.incidentId,
    userId: entry.userId,
    user: user ? publicUser(user) : null,
    action: entry.action,
    details: entry.details,
    createdAt: entry.createdAt.toISOString(),
  };
}
