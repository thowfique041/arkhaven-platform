import type { Request } from "express";
import { ActivityLog } from "../models";

export async function logActivity(
  req: Request,
  action: string,
  entity: string,
  entityId: unknown,
  summary?: string,
  meta?: Record<string, unknown>,
) {
  try {
    await ActivityLog.create({
      actor: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      summary,
      meta,
      ip: req.ip,
    });
  } catch (e) {
    // Logging must never break the business operation.
    console.warn("activity log failed", e);
  }
}
