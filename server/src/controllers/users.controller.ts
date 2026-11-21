import type { Request, Response } from "express";
import type { z } from "zod";
import { User } from "../models";
import { generatePassword, hashPassword } from "../services/credentials";
import { logActivity } from "../services/activity";
import { ApiError, created, escapeRegex, ok } from "../utils/http";
import type { createAdminSchema, updateAdminSchema } from "../validators";

/** Staff account management. Super Admin only (enforced in routes). */
export async function listStaff(req: Request, res: Response) {
  const search = String(req.query.search ?? "").trim();
  const filter: Record<string, unknown> = { role: { $in: ["admin", "superadmin"] } };
  if (search) filter.$or = [{ name: new RegExp(escapeRegex(search), "i") }, { email: new RegExp(escapeRegex(search), "i") }];
  const users = await User.find(filter).sort({ createdAt: -1 }).lean();
  return ok(res, users);
}

export async function createStaff(req: Request, res: Response) {
  const body = req.body as z.infer<typeof createAdminSchema>;
  if (await User.exists({ $or: [{ email: body.email }, { username: body.email }] })) {
    throw ApiError.conflict("An account with this email already exists");
  }
  const temporaryPassword = generatePassword();
  const user = await User.create({
    ...body,
    username: body.email,
    passwordHash: await hashPassword(temporaryPassword),
    mustChangePassword: true,
  });
  await logActivity(req, "user.create", "User", user._id, `Created ${body.role} ${body.name}`);
  // The temporary password is returned exactly once and never stored in plain text.
  return created(res, { user: user.toJSON(), credentials: { username: user.email, temporaryPassword } });
}

export async function updateStaff(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updateAdminSchema>;
  const user = await User.findOne({ _id: req.params.id, role: { $in: ["admin", "superadmin"] } }).select("+tokenVersion");
  if (!user) throw ApiError.notFound("Staff user");
  const isSelf = String(user._id) === req.user!.id;
  if (isSelf && (body.isActive === false || (body.role && body.role !== user.role))) {
    throw ApiError.badRequest("You cannot deactivate or change the role of your own account");
  }
  if (user.role === "superadmin" && (body.role === "admin" || body.isActive === false)) {
    const others = await User.countDocuments({ role: "superadmin", isActive: true, _id: { $ne: user._id } });
    if (others === 0) throw ApiError.badRequest("At least one active Super Admin must remain");
  }
  if (body.name) user.name = body.name;
  if (body.phone !== undefined) user.phone = body.phone ?? undefined;
  if (body.role) user.role = body.role;
  if (body.isActive !== undefined && body.isActive !== user.isActive) {
    user.isActive = body.isActive;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  }
  await user.save();
  await logActivity(req, "user.update", "User", user._id, `Updated staff ${user.name}`, body);
  return ok(res, user.toJSON());
}

export async function resetStaffPassword(req: Request, res: Response) {
  const user = await User.findOne({ _id: req.params.id, role: { $in: ["admin", "superadmin"] } }).select("+tokenVersion");
  if (!user) throw ApiError.notFound("Staff user");
  const temporaryPassword = generatePassword();
  user.passwordHash = await hashPassword(temporaryPassword);
  user.mustChangePassword = true;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();
  await logActivity(req, "user.reset_password", "User", user._id, `Reset password for ${user.name}`);
  return ok(res, { credentials: { username: user.email, temporaryPassword } });
}

export async function deleteStaff(req: Request, res: Response) {
  if (req.params.id === req.user!.id) throw ApiError.badRequest("You cannot delete your own account");
  const user = await User.findOne({ _id: req.params.id, role: { $in: ["admin", "superadmin"] } });
  if (!user) throw ApiError.notFound("Staff user");
  if (user.role === "superadmin") {
    const others = await User.countDocuments({ role: "superadmin", _id: { $ne: user._id } });
    if (others === 0) throw ApiError.badRequest("At least one Super Admin must remain");
  }
  await user.deleteOne();
  await logActivity(req, "user.delete", "User", user._id, `Deleted staff ${user.name}`);
  return ok(res, { deleted: true });
}
