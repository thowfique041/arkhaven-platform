import type { Request, Response } from "express";
import { ActivityLog, Customer, Flat, Inquiry, Lead, Payment, Project } from "../models";
import { LEAD_SOURCES, LEAD_STATUSES } from "../types";
import { ok, pageMeta, paginate } from "../utils/http";

/**
 * Admin overview. Uses plain finds + in-process sums (data volumes for a developer
 * are small) so it runs on any MongoDB-compatible server without aggregation features.
 */
export async function stats(_req: Request, res: Response) {
  const [projects, flats, leads, customers, payments, newInquiries, dueFollowUps, pendingPayments] = await Promise.all([
    Project.find().select("status name").lean(),
    Flat.find().select("status priceMinor project").lean(),
    Lead.find().select("status source createdAt").lean(),
    Customer.find().select("agreedPriceMinor flat").lean(),
    Payment.find({ status: { $ne: "rejected" } }).select("amountMinor status paidAt project").lean(),
    Inquiry.countDocuments({ status: "new" }),
    Lead.find({ followUpDate: { $lte: new Date(new Date().setHours(23, 59, 59, 999)) }, status: { $nin: ["converted", "lost"] } })
      .select("fullName phone followUpDate status")
      .sort({ followUpDate: 1 })
      .limit(8)
      .lean(),
    Payment.find({ status: "pending" }).populate("customer", "code fullName").select("amountMinor paidAt method customer").sort({ createdAt: -1 }).limit(8).lean(),
  ]);

  const flatsBy = { available: 0, reserved: 0, booked: 0, sold: 0 };
  for (const f of flats) flatsBy[f.status as keyof typeof flatsBy]++;

  const leadsByStatus = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<string, number>;
  const leadsBySource = Object.fromEntries(LEAD_SOURCES.map((s) => [s, 0])) as Record<string, number>;
  for (const l of leads) {
    leadsByStatus[l.status]++;
    leadsBySource[l.source ?? "other"]++;
  }

  const expectedRevenue = customers.filter((c) => c.flat).reduce((s, c) => s + (c.agreedPriceMinor ?? 0), 0);
  const received = payments.filter((p) => p.status === "verified").reduce((s, p) => s + p.amountMinor, 0);
  const pendingAmount = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amountMinor, 0);
  const inventoryValue = flats.filter((f) => f.status === "available").reduce((s, f) => s + f.priceMinor, 0);

  // Verified collections, last 12 months.
  const months: { key: string; label: string; amountMinor: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en-US", { month: "short", year: "2-digit" }), amountMinor: 0 });
  }
  const idx = new Map(months.map((m, i) => [m.key, i]));
  for (const p of payments) {
    if (p.status !== "verified") continue;
    const d = new Date(p.paidAt);
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) months[i].amountMinor += p.amountMinor;
  }

  // New leads per month, last 6 months.
  const leadMonths = months.slice(-6).map((m) => ({ ...m, count: 0 }));
  const lidx = new Map(leadMonths.map((m, i) => [m.key, i]));
  for (const l of leads) {
    const d = new Date(l.createdAt);
    const i = lidx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) leadMonths[i].count++;
  }

  // Inventory per project.
  const byProject = projects.map((p) => {
    const fs = flats.filter((f) => String(f.project) === String(p._id));
    return {
      name: p.name,
      available: fs.filter((f) => f.status === "available").length,
      reserved: fs.filter((f) => f.status === "reserved").length,
      booked: fs.filter((f) => f.status === "booked").length,
      sold: fs.filter((f) => f.status === "sold").length,
    };
  });

  return ok(res, {
    projects: {
      total: projects.length,
      ongoing: projects.filter((p) => p.status === "ongoing").length,
      completed: projects.filter((p) => p.status === "completed").length,
      upcoming: projects.filter((p) => p.status === "upcoming").length,
    },
    customers: customers.length,
    leads: { total: leads.length, new: leadsByStatus.new, converted: leadsByStatus.converted, byStatus: leadsByStatus, bySource: leadsBySource },
    flats: { total: flats.length, ...flatsBy, bookedOrSold: flatsBy.booked + flatsBy.sold },
    revenue: {
      expectedMinor: expectedRevenue,
      receivedMinor: received,
      pendingMinor: pendingAmount,
      outstandingMinor: Math.max(0, expectedRevenue - received),
      inventoryValueMinor: inventoryValue,
    },
    newInquiries,
    charts: { collections: months, leads: leadMonths, inventoryByProject: byProject },
    dueFollowUps,
    pendingPayments,
  });
}

export async function activity(req: Request, res: Response) {
  const p = paginate(req.query, 100);
  const filter: Record<string, unknown> = {};
  if (req.query.entity) filter.entity = String(req.query.entity);
  if (req.query.entityId) filter.entityId = String(req.query.entityId);
  const [items, total] = await Promise.all([
    ActivityLog.find(filter).select("-ip").sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(),
    ActivityLog.countDocuments(filter),
  ]);
  return ok(res, items, pageMeta(p, total));
}
