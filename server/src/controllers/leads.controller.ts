import type { Request, Response } from "express";
import type { z } from "zod";
import { Customer, Flat, Inquiry, Lead, Project } from "../models";
import { logActivity } from "../services/activity";
import { createCustomerAccount } from "../services/customerAccounts";
import { ApiError, created, escapeRegex, ok, pageMeta, paginate } from "../utils/http";
import { LEAD_SOURCES, LEAD_STATUSES } from "../types";
import type { assignFlatSchema, createLeadSchema, leadFollowUpSchema, leadNoteSchema, leadStatusSchema, updateLeadSchema } from "../validators";

const by = (req: Request) => ({ by: req.user!.id, byName: req.user!.name });

async function checkRefs(project?: string | null, flat?: string | null) {
  if (project && !(await Project.exists({ _id: project }))) throw ApiError.badRequest("Interested project does not exist");
  if (flat) {
    const f = await Flat.findById(flat).select("project").lean();
    if (!f) throw ApiError.badRequest("Interested flat does not exist");
    if (project && String(f.project) !== String(project)) throw ApiError.badRequest("Flat does not belong to the selected project");
  }
}

export async function listLeads(req: Request, res: Response) {
  const p = paginate(req.query);
  const q = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};
  if (q.status && (LEAD_STATUSES as readonly string[]).includes(q.status)) filter.status = q.status;
  if (q.source && (LEAD_SOURCES as readonly string[]).includes(q.source)) filter.source = q.source;
  if (q.project) filter.interestedProject = q.project;
  if (q.followUp === "due") filter.followUpDate = { $lte: new Date(new Date().setHours(23, 59, 59, 999)) };
  if (q.followUp === "upcoming") filter.followUpDate = { $gte: new Date() };
  if (q.followUp === "due" && !filter.status) filter.status = { $nin: ["converted", "lost"] };
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), "i");
    filter.$or = [{ fullName: rx }, { phone: rx }, { email: rx }];
  }
  const sortKey: Record<string, 1 | -1> = q.sort === "followUp" ? { followUpDate: 1 } : { createdAt: -1 };
  const [items, total, all] = await Promise.all([
    Lead.find(filter)
      .select("-history")
      .populate("interestedProject", "name slug")
      .populate("interestedFlat", "unitNumber")
      .populate("assignedTo", "name")
      .sort(sortKey)
      .skip(p.skip)
      .limit(p.limit)
      .lean(),
    Lead.countDocuments(filter),
    Lead.find({}).select("status").lean(),
  ]);
  const counts: Record<string, number> = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0]));
  for (const l of all) counts[l.status] = (counts[l.status] ?? 0) + 1;
  return ok(res, items, { ...pageMeta(p, total), counts });
}

export async function getLead(req: Request, res: Response) {
  const lead = await Lead.findById(req.params.id)
    .populate("interestedProject", "name slug")
    .populate("interestedFlat", "unitNumber floor sizeSqft priceMinor status")
    .populate("assignedTo", "name")
    .populate("customer", "code fullName")
    .lean();
  if (!lead) throw ApiError.notFound("Lead");
  lead.history?.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return ok(res, lead);
}

export async function createLead(req: Request, res: Response) {
  const { createAccount, inquiry, ...body } = req.body as z.infer<typeof createLeadSchema>;
  await checkRefs(body.interestedProject, body.interestedFlat);
  const lead = await Lead.create({
    ...body,
    inquiry: inquiry || undefined,
    createdBy: req.user!.id,
    history: [{ type: "created", to: body.status, note: body.notes || undefined, ...by(req) }],
  });
  if (inquiry) await Inquiry.updateOne({ _id: inquiry }, { $set: { status: "converted", lead: lead._id } });
  await logActivity(req, "lead.create", "Lead", lead._id, `Created lead ${lead.fullName}`);

  let credentials = null;
  let customer = null;
  if (createAccount) {
    const r = await createCustomerAccount(req, {
      fullName: lead.fullName,
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      project: body.interestedProject ?? undefined,
      flat: body.interestedFlat ?? undefined,
      lead: String(lead._id),
      flatStatus: "reserved",
    });
    customer = r.customer;
    credentials = r.credentials;
    lead.customer = r.customer._id;
    lead.history.push({ type: "account", note: `Portal account ${r.customer.code} created`, ...by(req) });
    await lead.save();
  }
  return created(res, { lead, customer, credentials });
}

export async function updateLead(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updateLeadSchema>;
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw ApiError.notFound("Lead");
  await checkRefs(body.interestedProject ?? (lead.interestedProject ? String(lead.interestedProject) : null), body.interestedFlat);
  const changed = Object.keys(body).filter((k) => k !== "status");
  if (body.status && body.status !== lead.status) {
    lead.history.push({ type: "status", from: lead.status, to: body.status, ...by(req) });
  }
  lead.set(body);
  if (changed.length) lead.history.push({ type: "updated", note: `Updated: ${changed.join(", ")}`, ...by(req) });
  await lead.save();
  await logActivity(req, "lead.update", "Lead", lead._id, `Updated lead ${lead.fullName}`);
  return ok(res, lead);
}

export async function setLeadStatus(req: Request, res: Response) {
  const { status, note } = req.body as z.infer<typeof leadStatusSchema>;
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw ApiError.notFound("Lead");
  if (status === "converted" && !lead.customer) {
    throw ApiError.badRequest("Use 'Convert to customer' to create the portal account; a lead is marked converted automatically");
  }
  if (lead.status !== status) {
    lead.history.push({ type: "status", from: lead.status, to: status, note: note || undefined, ...by(req) });
    lead.status = status;
    await lead.save();
    await logActivity(req, "lead.status", "Lead", lead._id, `${lead.fullName}: ${status}`);
  }
  return ok(res, lead);
}

export async function addLeadNote(req: Request, res: Response) {
  const { note } = req.body as z.infer<typeof leadNoteSchema>;
  const lead = await Lead.findByIdAndUpdate(
    req.params.id,
    { $push: { history: { type: "note", note, ...by(req), at: new Date() } } },
    { new: true },
  );
  if (!lead) throw ApiError.notFound("Lead");
  return ok(res, lead);
}

export async function scheduleFollowUp(req: Request, res: Response) {
  const { followUpDate, note } = req.body as z.infer<typeof leadFollowUpSchema>;
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw ApiError.notFound("Lead");
  lead.followUpDate = followUpDate;
  lead.history.push({
    type: "follow_up",
    to: followUpDate.toISOString(),
    note: note || `Follow-up scheduled for ${followUpDate.toDateString()}`,
    ...by(req),
  });
  await lead.save();
  await logActivity(req, "lead.follow_up", "Lead", lead._id, `Follow-up for ${lead.fullName}`);
  return ok(res, lead);
}

/** Lead → customer: creates portal account, books the unit, returns one-time credentials. */
export async function convertLead(req: Request, res: Response) {
  const body = req.body as Partial<z.infer<typeof assignFlatSchema>>;
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw ApiError.notFound("Lead");
  if (lead.customer || (await Customer.exists({ lead: lead._id }))) throw ApiError.conflict("This lead already has a customer account");
  const project = body.project ?? (lead.interestedProject ? String(lead.interestedProject) : undefined);
  const flat = body.flat ?? (lead.interestedFlat ? String(lead.interestedFlat) : undefined);
  const r = await createCustomerAccount(req, {
    fullName: lead.fullName,
    phone: lead.phone,
    email: lead.email,
    address: lead.address,
    project,
    flat,
    agreedPriceMinor: body.agreedPriceMinor,
    bookingDate: body.bookingDate ?? undefined,
    lead: String(lead._id),
    flatStatus: body.flatStatus ?? "booked",
  });
  lead.history.push({ type: "converted", from: lead.status, to: "converted", note: `Customer ${r.customer.code} created`, ...by(req) });
  lead.status = "converted";
  lead.customer = r.customer._id;
  await lead.save();
  await logActivity(req, "lead.convert", "Lead", lead._id, `Converted ${lead.fullName} to ${r.customer.code}`);
  return created(res, { lead, customer: r.customer, credentials: r.credentials });
}

export async function deleteLead(req: Request, res: Response) {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw ApiError.notFound("Lead");
  if (lead.customer) throw ApiError.conflict("This lead has a customer account. Delete or keep the customer first.");
  await lead.deleteOne();
  await logActivity(req, "lead.delete", "Lead", lead._id, `Deleted lead ${lead.fullName}`);
  return ok(res, { deleted: true });
}
