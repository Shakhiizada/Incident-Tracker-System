import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, sessionsTable, usersTable } from "@workspace/db";
import type { User } from "@workspace/db";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE = "st_sid";

export function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: number): Promise<string> {
  const id = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({ id, userId, expiresAt });
  return id;
}

export async function findUserBySession(
  sessionId: string,
): Promise<User | null> {
  const [row] = await db
    .select({
      session: sessionsTable,
      user: usersTable,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

  if (!row) return null;
  if (row.session.expiresAt.getTime() < Date.now()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
    return null;
  }
  return row.user;
}

export async function destroySession(sessionId: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
