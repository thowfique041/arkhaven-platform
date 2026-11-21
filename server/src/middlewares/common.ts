import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { ApiError } from "../utils/http";
import { env } from "../config/env";

/* ---------- Validation ---------- */
type Part = "body" | "query" | "params";
export const validate =
  <S extends ZodTypeAny>(schema: S, part: Part = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const r = schema.safeParse(req[part]);
    if (!r.success) return next(r.error);
    if (part === "query") {
      // req.query is a getter in some Express versions; store parsed copy separately.
      (req as Request & { q?: z.infer<S> }).q = r.data;
    } else {
      (req as unknown as Record<string, unknown>)[part] = r.data;
    }
    next();
  };

export const validId =
  (...names: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    for (const n of names) {
      if (!mongoose.isValidObjectId(req.params[n])) return next(ApiError.badRequest(`Invalid ${n}`));
    }
    next();
  };

/* ---------- Rate limits ---------- */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many login attempts. Try again in 15 minutes." } },
});

export const publicFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many submissions. Please try again later." } },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

/* ---------- Uploads (memory storage, images/PDF only, 8 MB) ---------- */
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf"]);
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new ApiError(415, "Only JPG, PNG, WebP, AVIF images or PDF files are allowed", "UNSUPPORTED_MEDIA"));
  },
});

/* ---------- Errors ---------- */
export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound("Endpoint"));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong. Please try again.";
  let details: unknown;

  if (err instanceof ApiError) {
    ({ status, code, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 422;
    code = "VALIDATION_ERROR";
    message = err.issues[0] ? `${err.issues[0].path.join(".") || "input"}: ${err.issues[0].message}` : "Invalid input";
    details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  } else if (err instanceof multer.MulterError) {
    status = 400;
    code = "UPLOAD_ERROR";
    message = err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 8 MB)" : err.message;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 422;
    code = "VALIDATION_ERROR";
    message = Object.values(err.errors)[0]?.message ?? "Invalid data";
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = "BAD_REQUEST";
    message = `Invalid ${err.path}`;
  } else if (typeof err === "object" && err && (err as { code?: number }).code === 11000) {
    status = 409;
    code = "DUPLICATE";
    const keys = Object.keys((err as { keyValue?: object }).keyValue ?? {});
    message = keys.includes("dedupeKey")
      ? "A payment with this transaction reference has already been recorded"
      : `A record with this ${keys.join(", ") || "value"} already exists`;
  } else if (err instanceof SyntaxError && "body" in (err as object)) {
    status = 400;
    code = "BAD_JSON";
    message = "Malformed JSON body";
  }

  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(status).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}), ...(status >= 500 && !env.isProd && err instanceof Error ? { stack: err.stack } : {}) },
  });
}
