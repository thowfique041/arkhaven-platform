import type { Request, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { env } from "../config/env";
import { Customer, User } from "../models";
import { AUTH_COOKIE, cookieOptions, signToken } from "../middlewares/auth";
import { dummyHash, hashPassword, verifyPassword } from "../services/credentials";
import { logActivity } from "../services/activity";
import { ApiError, ok } from "../utils/http";
import type { bootstrapSchema, changePasswordSchema, loginSchema, profileSchema } from "../validators";
import type { Role } from "../types";

async function sessionPayload(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user) throw ApiError.unauthorized();
  const { passwordHash: _p, tokenVersion: _t, __v: _v, ...safe } = user as typeof user & { passwordHash?: string; tokenVersion?: number; __v?: number };
  let customer = null;
  if (user.role === "customer" && user.customer) {
    customer = await Customer.findById(user.customer).select("code fullName phone email address project flat").lean();
  }
  return { user: safe, customer };
}

export async function login(req: Request, res: Response) {
  const { identifier, password } = req.body as z.infer<typeof loginSchema>;
  const id = identifier.toLowerCase();
  const user = await User.findOne({ $or: [{ email: id }, { username: id }] }).select("+passwordHash +tokenVersion");
  // Always run bcrypt so response time does not reveal whether the account exists.
  const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !valid) throw ApiError.unauthorized("Incorrect email/username or password");
  if (!user.isActive) throw ApiError.forbidden("This account has been deactivated. Please contact Arkhaven support.");

  user.lastLoginAt = new Date();
  await user.save();
  res.cookie(AUTH_COOKIE, signToken(String(user._id), user.role as Role, user.tokenVersion ?? 0), cookieOptions());
  req.user = { id: String(user._id), role: user.role as Role, name: user.name };
  await logActivity(req, "auth.login", "User", user._id, `${user.name} signed in`);
  return ok(res, await sessionPayload(String(user._id)));
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions(), maxAge: undefined });
  return ok(res, { loggedOut: true });
}

export async function me(req: Request, res: Response) {
  return ok(res, await sessionPayload(req.user!.id));
}

/** Returns the current session or null (200 either way) so anonymous visitors don't trigger errors. */
export async function session(req: Request, res: Response) {
  if (!req.user) return ok(res, null);
  return ok(res, await sessionPayload(req.user.id));
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;
  const user = await User.findById(req.user!.id).select("+passwordHash +tokenVersion");
  if (!user) throw ApiError.unauthorized();
  if (!(await verifyPassword(currentPassword, user.passwordHash))) throw ApiError.badRequest("Current password is incorrect");
  if (currentPassword === newPassword) throw ApiError.badRequest("New password must be different from the current one");
  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1; // signs out other sessions
  await user.save();
  res.cookie(AUTH_COOKIE, signToken(String(user._id), user.role as Role, user.tokenVersion), cookieOptions());
  await logActivity(req, "auth.change_password", "User", user._id, "Password changed");
  return ok(res, { changed: true });
}

export async function updateProfile(req: Request, res: Response) {
  const body = req.body as z.infer<typeof profileSchema>;
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.unauthorized();

  if (user.role === "customer") {
    // Customers may only update contact details; name, project, flat and price are admin-controlled.
    const customer = await Customer.findById(user.customer);
    if (!customer) throw ApiError.notFound("Customer profile");
    if (body.phone) {
      customer.phone = body.phone;
      user.phone = body.phone;
    }
    if (body.email !== undefined) customer.email = body.email ?? undefined;
    if (body.address !== undefined) customer.address = body.address ?? undefined;
    await customer.save();
  } else {
    if (body.name) user.name = body.name;
    if (body.phone) user.phone = body.phone;
    if (body.notificationPrefs) {
      user.notificationPrefs = { ...(user.notificationPrefs ?? {}), ...body.notificationPrefs } as typeof user.notificationPrefs;
    }
  }
  await user.save();
  await logActivity(req, "auth.update_profile", "User", user._id, "Profile updated");
  return ok(res, await sessionPayload(String(user._id)));
}

/** Whether first-run setup is still open (no Super Admin yet and a bootstrap token configured). */
export async function setupStatus(_req: Request, res: Response) {
  const hasSuperAdmin = !!(await User.exists({ role: "superadmin" }));
  return ok(res, { needsSetup: !hasSuperAdmin, bootstrapEnabled: !!env.BOOTSTRAP_TOKEN && !hasSuperAdmin });
}

/**
 * One-time Super Admin bootstrap. Works only when BOOTSTRAP_TOKEN is configured
 * AND no super admin exists yet. Remove BOOTSTRAP_TOKEN after use.
 */
export async function bootstrap(req: Request, res: Response) {
  const body = req.body as z.infer<typeof bootstrapSchema>;
  const expected = env.BOOTSTRAP_TOKEN;
  const a = Buffer.from(body.token);
  const b = Buffer.from(expected || "x");
  if (!expected || a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw ApiError.forbidden("Bootstrap is disabled or token is invalid");
  if (await User.exists({ role: "superadmin" })) throw ApiError.conflict("A Super Admin already exists. Bootstrap is closed.");
  const user = await User.create({
    name: body.name,
    email: body.email,
    username: body.email,
    role: "superadmin",
    passwordHash: await hashPassword(body.password),
  });
  req.user = { id: String(user._id), role: "superadmin", name: user.name };
  await logActivity(req, "auth.bootstrap", "User", user._id, "Initial Super Admin created");
  return ok(res, { created: true, email: user.email }, undefined, 201);
}
