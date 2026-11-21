import type { Request, Response } from "express";
import type { z } from "zod";
import { Announcement, ConstructionProgress, Customer, Flat, Lead, Payment, User } from "../models";
import { logActivity } from "../services/activity";
import { claimFlat, createCustomerAccount, releaseFlat } from "../services/customerAccounts";
import { generatePassword, hashPassword } from "../services/credentials";
import { buildSummary, customerSummary } from "../services/finance";
import { ApiError, created, escapeRegex, ok, pageMeta, paginate } from "../utils/http";
import type { assignFlatSchema, createCustomerSchema, updateCustomerSchema } from "../validators";

export async function listCustomers(req: Request, res: Response) {
  const p = paginate(req.query);
  const filter: Record<string, unknown> = {};
  if (req.query.project) filter.project = String(req.query.project);
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search)), "i");
    filter.$or = [{ fullName: rx }, { phone: rx }, { email: rx }, { code: rx }];
  }
  const [items, total] = await Promise.all([
    Customer.find(filter)
      .populate("project", "name slug")
      .populate("flat", "unitNumber floor sizeSqft status")
      .populate("user", "isActive lastLoginAt username mustChangePassword")
      .sort({ createdAt: -1 })
      .skip(p.skip)
      .limit(p.limit)
      .lean(),
    Customer.countDocuments(filter),
  ]);
  const ids = items.map((c) => c._id);
  const payments = await Payment.find({ customer: { $in: ids }, status: { $ne: "rejected" } }).select("customer amountMinor status").lean();
  const byCustomer = new Map<string, { amountMinor: number; status: string }[]>();
  for (const pay of payments) {
    const k = String(pay.customer);
    byCustomer.set(k, [...(byCustomer.get(k) ?? []), pay]);
  }
  const data = items.map((c) => ({ ...c, summary: buildSummary(c.agreedPriceMinor ?? 0, byCustomer.get(String(c._id)) ?? []) }));
  return ok(res, data, pageMeta(p, total));
}

/** Full customer view used by admin detail page and (scoped) by the customer portal. */
async function customerView(customerId: string, forCustomer: boolean) {
  const customer = await Customer.findById(customerId)
    .populate("project", "name slug status location coverImage expectedCompletion specs")
    .populate("flat", "unitNumber floor sizeSqft bedrooms bathrooms balconies facing parking status")
    .populate("user", "isActive lastLoginAt username email mustChangePassword")
    .lean();
  if (!customer) throw ApiError.notFound("Customer");
  const projectId = (customer.project as { _id?: unknown } | null)?._id;
  const [summary, progress, payments] = await Promise.all([
    customerSummary(customerId),
    projectId ? ConstructionProgress.findOne({ project: projectId }).lean() : null,
    Payment.find({ customer: customerId }).sort({ paidAt: -1 }).select(forCustomer ? "-audit -recordedBy -verifiedBy -dedupeKey" : "").lean(),
  ]);
  const result: Record<string, unknown> = { ...customer, summary, progress, payments };
  if (forCustomer) {
    delete result.notes;
    delete result.lead;
  }
  return result;
}

export async function getCustomer(req: Request, res: Response) {
  return ok(res, await customerView(req.params.id, false));
}

export async function getMyAccount(req: Request, res: Response) {
  if (!req.user!.customerId) throw ApiError.notFound("Customer profile");
  const view = await customerView(req.user!.customerId, true);
  const projectId = (view.project as { _id?: unknown } | null)?._id;
  const announcements = await Announcement.find({
    published: true,
    $or: [{ project: null }, ...(projectId ? [{ project: projectId }] : [])],
  })
    .sort({ pinned: -1, createdAt: -1 })
    .limit(5)
    .lean();
  return ok(res, { ...view, announcements });
}

export async function createCustomer(req: Request, res: Response) {
  const body = req.body as z.infer<typeof createCustomerSchema>;
  const result = await createCustomerAccount(req, body);
  if (body.lead) {
    await Lead.updateOne(
      { _id: body.lead },
      {
        $set: { status: "converted", customer: result.customer._id },
        $push: { history: { type: "converted", to: "converted", note: `Customer account ${result.customer.code} created`, by: req.user!.id, byName: req.user!.name } },
      },
    );
  }
  return created(res, { customer: result.customer, credentials: result.credentials });
}

export async function updateCustomer(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updateCustomerSchema>;
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound("Customer");
  if (body.agreedPriceMinor !== undefined) {
    const s = await customerSummary(customer._id);
    if (body.agreedPriceMinor < s.paidMinor + s.pendingMinor) {
      throw ApiError.conflict("Agreed price cannot be lower than the amount already paid or pending");
    }
  }
  const before = { agreedPriceMinor: customer.agreedPriceMinor };
  customer.set(body);
  await customer.save();
  const userUpdate: Record<string, unknown> = {};
  if (body.fullName) userUpdate.name = body.fullName;
  if (body.phone) userUpdate.phone = body.phone;
  if (body.email !== undefined) {
    if (body.email && (await User.exists({ email: body.email, _id: { $ne: customer.user } }))) {
      throw ApiError.conflict("Another login already uses this email");
    }
    userUpdate.email = body.email || undefined;
  }
  if (Object.keys(userUpdate).length) await User.updateOne({ _id: customer.user }, { $set: userUpdate });
  await logActivity(req, "customer.update", "Customer", customer._id, `Updated customer ${customer.code}`, { before, after: body });
  return ok(res, customer);
}

export async function assignFlat(req: Request, res: Response) {
  const body = req.body as z.infer<typeof assignFlatSchema>;
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound("Customer");
  const oldFlat = customer.flat;
  const flat = await claimFlat(body.project, body.flat, String(customer._id), body.flatStatus, String(customer._id));
  if (oldFlat && String(oldFlat) !== String(flat._id)) await releaseFlat(oldFlat);
  customer.project = flat.project;
  customer.flat = flat._id;
  if (body.agreedPriceMinor !== undefined) customer.agreedPriceMinor = body.agreedPriceMinor;
  else if (!customer.agreedPriceMinor) customer.agreedPriceMinor = flat.priceMinor;
  customer.bookingDate = body.bookingDate ?? customer.bookingDate ?? new Date();
  await customer.save();
  // Keep project on existing payments consistent for reporting.
  await Payment.updateMany({ customer: customer._id }, { $set: { project: flat.project, flat: flat._id } });
  await logActivity(req, "customer.assign_flat", "Customer", customer._id, `Assigned unit ${flat.unitNumber} to ${customer.code}`);
  return ok(res, await customerView(String(customer._id), false));
}

export async function unassignFlat(req: Request, res: Response) {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound("Customer");
  if (!customer.flat) throw ApiError.badRequest("Customer has no assigned flat");
  const verified = await Payment.countDocuments({ customer: customer._id, status: "verified" });
  if (verified > 0) throw ApiError.conflict("Customer has verified payments. Reassign to another unit instead of unassigning.");
  await releaseFlat(customer.flat);
  customer.flat = undefined;
  await customer.save();
  await logActivity(req, "customer.unassign_flat", "Customer", customer._id, `Released unit for ${customer.code}`);
  return ok(res, { unassigned: true });
}

export async function setActive(req: Request, res: Response) {
  const active = Boolean(req.body?.isActive);
  const customer = await Customer.findById(req.params.id).lean();
  if (!customer) throw ApiError.notFound("Customer");
  await User.updateOne({ _id: customer.user }, { $set: { isActive: active }, $inc: { tokenVersion: 1 } });
  await logActivity(req, active ? "customer.activate" : "customer.deactivate", "Customer", customer._id, `${active ? "Activated" : "Deactivated"} ${customer.code}`);
  return ok(res, { isActive: active });
}

export async function resetPassword(req: Request, res: Response) {
  const customer = await Customer.findById(req.params.id).lean();
  if (!customer) throw ApiError.notFound("Customer");
  const user = await User.findById(customer.user).select("+tokenVersion");
  if (!user) throw ApiError.notFound("Customer login");
  const temporaryPassword = generatePassword();
  user.passwordHash = await hashPassword(temporaryPassword);
  user.mustChangePassword = true;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();
  await logActivity(req, "customer.reset_password", "Customer", customer._id, `Reset password for ${customer.code}`);
  return ok(res, { credentials: { username: user.username, temporaryPassword } });
}

export async function deleteCustomer(req: Request, res: Response) {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound("Customer");
  const payments = await Payment.countDocuments({ customer: customer._id, status: { $ne: "rejected" } });
  if (payments > 0) throw ApiError.conflict("Customer has payment records. Deactivate the account instead of deleting it.");
  await releaseFlat(customer.flat);
  await Payment.deleteMany({ customer: customer._id });
  await User.deleteOne({ _id: customer.user });
  if (customer.lead) await Lead.updateOne({ _id: customer.lead }, { $unset: { customer: 1 } });
  await customer.deleteOne();
  await logActivity(req, "customer.delete", "Customer", customer._id, `Deleted customer ${customer.code}`);
  return ok(res, { deleted: true });
}

/** Flats a customer can be assigned to (available + their current one). */
export async function assignableFlats(req: Request, res: Response) {
  const project = String(req.query.project ?? "");
  if (!project) throw ApiError.badRequest("project is required");
  const flats = await Flat.find({ project, $or: [{ status: { $in: ["available", "reserved"] }, customer: null }, { customer: req.params.id }] })
    .select("unitNumber floor sizeSqft priceMinor status")
    .sort({ floor: 1, unitNumber: 1 })
    .lean();
  return ok(res, flats);
}
