import type { Request, Response, NextFunction } from "express";
import { findUserBySession, SESSION_COOKIE } from "../lib/auth";

export async function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const sid = req.cookies?.[SESSION_COOKIE];
  if (sid) {
    try {
      const user = await findUserBySession(sid);
      if (user) {
        req.user = user;
      }
    } catch (err) {
      req.log.error({ err }, "Failed to load session user");
    }
  }
  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  next();
}

export function requireRole(...roles: Array<"admin" | "analyst" | "employee">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Не авторизован" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Недостаточно прав" });
      return;
    }
    next();
  };
}
