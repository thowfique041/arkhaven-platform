import type { Request, Response } from "express";
import type { z } from "zod";
import { Flat, Project } from "../models";
import { logActivity } from "../services/activity";
import { ApiError, created, escapeRegex, ok, pageMeta, paginate } from "../utils/http";
import type { bulkFlatsSchema, createFlatSchema, updateFlatSchema } from "../validators";
import { FLAT_STATUSES } from "../types";

export async function listFlats(req: Request, res: Response) {
  const p = paginate(req.query, 500);
  const filter: Record<string, unknown> = {};
  if (req.query.project) filter.project = String(req.query.project);
  if (req.query.status && (FLAT_STATUSES as readonly string[]).includes(String(req.query.status))) filter.status = req.query.status;
  if (req.query.search) filter.unitNumber = new RegExp(escapeRegex(String(req.query.search)), "i");
  const [items, total] = await Promise.all([
    Flat.find(filter)
      .populate("project", "name slug")
      .populate("customer", "fullName code phone")
      .sort({ project: 1, floor: 1, unitNumber: 1 })
      .skip(p.skip)
      .limit(p.limit)
      .lean(),
    Flat.countDocuments(filter),
  ]);
  return ok(res, items, pageMeta(p, total));
}

export async function getFlat(req: Request, res: Response) {
  const flat = await Flat.findById(req.params.id).populate("project", "name slug").populate("customer", "fullName code phone").lean();
  if (!flat) throw ApiError.notFound("Flat");
  return ok(res, flat);
}

export async function createFlat(req: Request, res: Response) {
  const body = req.body as z.infer<typeof createFlatSchema>;
  if (!(await Project.exists({ _id: body.project }))) throw ApiError.badRequest("Project does not exist");
  if (body.status !== "available") throw ApiError.badRequest("New flats start as available. Assign a customer to book them.");
  const flat = await Flat.create(body);
  await logActivity(req, "flat.create", "Flat", flat._id, `Added unit ${flat.unitNumber}`);
  return created(res, flat);
}

export async function bulkCreateFlats(req: Request, res: Response) {
  const body = req.body as z.infer<typeof bulkFlatsSchema>;
  if (body.floors.to < body.floors.from) throw ApiError.badRequest("'to' floor must be ≥ 'from' floor");
  if (!(await Project.exists({ _id: body.project }))) throw ApiError.badRequest("Project does not exist");
  const docs = [];
  for (let floor = body.floors.from; floor <= body.floors.to; floor++) {
    for (const u of body.units) {
      docs.push({ project: body.project, unitNumber: `${floor}${u.suffix}`.toUpperCase(), floor, ...u, status: "available" });
    }
  }
  if (docs.length > 600) throw ApiError.badRequest("Too many units in one batch (max 600)");
  const existing = await Flat.find({ project: body.project, unitNumber: { $in: docs.map((d) => d.unitNumber) } }).select("unitNumber").lean();
  if (existing.length) throw ApiError.conflict(`Units already exist: ${existing.map((e) => e.unitNumber).join(", ")}`);
  const inserted = await Flat.insertMany(docs);
  await logActivity(req, "flat.bulk_create", "Project", body.project, `Generated ${inserted.length} units`);
  return created(res, { count: inserted.length });
}

export async function updateFlat(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updateFlatSchema>;
  const flat = await Flat.findById(req.params.id);
  if (!flat) throw ApiError.notFound("Flat");
  if (body.status && body.status !== flat.status) {
    if (flat.customer && body.status === "available") {
      throw ApiError.conflict("This unit is assigned to a customer. Unassign the customer before marking it available.");
    }
    if (!flat.customer && body.status !== "available" && body.status !== "reserved") {
      throw ApiError.conflict("Assign a customer to mark a unit as booked or sold");
    }
  }
  const before = { status: flat.status, priceMinor: flat.priceMinor };
  flat.set(body);
  await flat.save();
  await logActivity(req, "flat.update", "Flat", flat._id, `Updated unit ${flat.unitNumber}`, { before, after: body });
  return ok(res, flat);
}

export async function deleteFlat(req: Request, res: Response) {
  const flat = await Flat.findById(req.params.id);
  if (!flat) throw ApiError.notFound("Flat");
  if (flat.customer) throw ApiError.conflict("This unit is assigned to a customer and cannot be deleted");
  await flat.deleteOne();
  await logActivity(req, "flat.delete", "Flat", flat._id, `Deleted unit ${flat.unitNumber}`);
  return ok(res, { deleted: true });
}
