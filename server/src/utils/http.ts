import type { NextFunction, Request, Response, RequestHandler } from "express";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "ERROR",
    public details?: unknown,
  ) {
    super(message);
  }
  static badRequest(msg: string, details?: unknown) {
    return new ApiError(400, msg, "BAD_REQUEST", details);
  }
  static unauthorized(msg = "Authentication required") {
    return new ApiError(401, msg, "UNAUTHORIZED");
  }
  static forbidden(msg = "You do not have permission to perform this action") {
    return new ApiError(403, msg, "FORBIDDEN");
  }
  static notFound(what = "Resource") {
    return new ApiError(404, `${what} not found`, "NOT_FOUND");
  }
  static conflict(msg: string, details?: unknown) {
    return new ApiError(409, msg, "CONFLICT", details);
  }
}

/** Wraps an async route so rejected promises reach the error middleware. */
export const ah =
  <R extends Request = Request>(fn: (req: R, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req as R, res, next).catch(next);
  };

export function ok<T>(res: Response, data: T, meta?: Record<string, unknown>, status = 200) {
  return res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function created<T>(res: Response, data: T) {
  return ok(res, data, undefined, 201);
}

export interface PageQuery {
  page: number;
  limit: number;
  skip: number;
}

export function paginate(q: Record<string, unknown>, maxLimit = 100): PageQuery {
  const page = Math.max(1, parseInt(String(q.page ?? "1"), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(q.limit ?? "20"), 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function pageMeta(p: PageQuery, total: number) {
  return { page: p.page, limit: p.limit, total, pages: Math.max(1, Math.ceil(total / p.limit)) };
}

/** Escape user input before using it inside a RegExp. */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
