import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../models";
import { ApiError } from "../utils/http";
import type { Role } from "../types";

export const AUTH_COOKIE = "akh_token";

interface TokenPayload {
  sub: string;
  role: Role;
  tv: number;
}

export function signToken(userId: string, role: Role, tokenVersion: number): string {
  return jwt.sign({ sub: userId, role, tv: tokenVersion } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    issuer: "arkhaven",
  });
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const c = (req as Request & { cookies?: Record<string, string> }).cookies?.[AUTH_COOKIE];
  return c || null;
}

/**
 * Verifies the JWT AND re-checks the user in the database on every request,
 * so deactivated accounts and reset passwords take effect immediately.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readToken(req);
    if (!token) throw ApiError.unauthorized();
    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET, { issuer: "arkhaven" }) as unknown as TokenPayload;
    } catch {
      throw ApiError.unauthorized("Session expired. Please sign in again.");
    }
    const user = await User.findById(payload.sub).select("+tokenVersion").lean();
    if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
      throw ApiError.unauthorized("Session is no longer valid. Please sign in again.");
    }
    req.user = {
      id: String(user._id),
      role: user.role as Role,
      name: user.name,
      email: user.email ?? undefined,
      customerId: user.customer ? String(user.customer) : undefined,
    };
    next();
  } catch (e) {
    next(e);
  }
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };

export const requireStaff = requireRole("superadmin", "admin");
export const requireSuperAdmin = requireRole("superadmin");
export const requireCustomer = requireRole("customer");
