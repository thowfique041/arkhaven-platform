import type { Request, Response } from "express";
import type { z } from "zod";
import { Announcement, Customer, Inquiry, Lead, Project, Testimonial, WebsiteSettings } from "../models";
import { logActivity } from "../services/activity";
import { uploadBuffer } from "../services/storage";
import { ApiError, created, escapeRegex, ok, pageMeta, paginate } from "../utils/http";
import type { announcementSchema, inquirySchema, settingsSchema, testimonialSchema } from "../validators";

/* ---------------- Announcements ---------------- */
export async function listAnnouncements(req: Request, res: Response) {
  const filter: Record<string, unknown> = {};
  if (req.query.project) filter.project = String(req.query.project);
  const items = await Announcement.find(filter).populate("project", "name").populate("createdBy", "name").sort({ pinned: -1, createdAt: -1 }).lean();
  return ok(res, items);
}
export async function createAnnouncement(req: Request, res: Response) {
  const body = req.body as z.infer<typeof announcementSchema>;
  if (body.project && !(await Project.exists({ _id: body.project }))) throw ApiError.badRequest("Project does not exist");
  const a = await Announcement.create({ ...body, createdBy: req.user!.id });
  await logActivity(req, "announcement.create", "Announcement", a._id, a.title);
  return created(res, a);
}
export async function updateAnnouncement(req: Request, res: Response) {
  const a = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!a) throw ApiError.notFound("Announcement");
  await logActivity(req, "announcement.update", "Announcement", a._id, a.title);
  return ok(res, a);
}
export async function deleteAnnouncement(req: Request, res: Response) {
  const a = await Announcement.findByIdAndDelete(req.params.id);
  if (!a) throw ApiError.notFound("Announcement");
  await logActivity(req, "announcement.delete", "Announcement", a._id, a.title);
  return ok(res, { deleted: true });
}
export async function myAnnouncements(req: Request, res: Response) {
  const customer = await Customer.findById(req.user!.customerId).select("project").lean();
  const items = await Announcement.find({
    published: true,
    $or: [{ project: null }, ...(customer?.project ? [{ project: customer.project }] : [])],
  })
    .select("-createdBy")
    .populate("project", "name")
    .sort({ pinned: -1, createdAt: -1 })
    .lean();
  return ok(res, items);
}

/* ---------------- Testimonials ---------------- */
export async function publicTestimonials(_req: Request, res: Response) {
  return ok(res, await Testimonial.find({ published: true }).populate("project", "name slug").sort({ sortOrder: 1, createdAt: -1 }).limit(24).lean());
}
export async function listTestimonials(_req: Request, res: Response) {
  return ok(res, await Testimonial.find().populate("project", "name").sort({ sortOrder: 1, createdAt: -1 }).lean());
}
export async function createTestimonial(req: Request, res: Response) {
  const t = await Testimonial.create(req.body as z.infer<typeof testimonialSchema>);
  await logActivity(req, "testimonial.create", "Testimonial", t._id, t.name);
  return created(res, t);
}
export async function updateTestimonial(req: Request, res: Response) {
  const t = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!t) throw ApiError.notFound("Testimonial");
  await logActivity(req, "testimonial.update", "Testimonial", t._id, t.name);
  return ok(res, t);
}
export async function deleteTestimonial(req: Request, res: Response) {
  const t = await Testimonial.findByIdAndDelete(req.params.id);
  if (!t) throw ApiError.notFound("Testimonial");
  await logActivity(req, "testimonial.delete", "Testimonial", t._id, t.name);
  return ok(res, { deleted: true });
}

/* ---------------- Website settings ---------------- */
export async function getSettings(_req: Request, res: Response) {
  const s = await WebsiteSettings.findOne({ key: "main" }).populate("featuredProjectIds", "name slug").lean();
  return ok(res, s ?? {});
}
export async function updateSettings(req: Request, res: Response) {
  const body = req.body as z.infer<typeof settingsSchema>;
  const s = (await WebsiteSettings.findOne({ key: "main" })) ?? new WebsiteSettings({ key: "main" });
  // Merge nested objects so partial saves from different admin tabs do not wipe each other.
  for (const [k, v] of Object.entries(body)) {
    const cur = s.get(k);
    if (v && typeof v === "object" && !Array.isArray(v) && cur && typeof cur === "object") {
      s.set(k, { ...(cur.toObject?.() ?? cur), ...v });
    } else {
      s.set(k, v);
    }
  }
  await s.save();
  await logActivity(req, "settings.update", "WebsiteSettings", s._id, "Website content updated", { sections: Object.keys(body) });
  return ok(res, s);
}

/* ---------------- Inquiries ---------------- */
export async function submitInquiry(req: Request, res: Response) {
  const { website, ...body } = req.body as z.infer<typeof inquirySchema>;
  if (website) return created(res, { received: true }); // honeypot: pretend success, store nothing
  if (body.project && !(await Project.exists({ _id: body.project, published: true }))) body.project = null;
  const i = await Inquiry.create({ ...body, ip: req.ip });
  return created(res, { received: true, id: i._id });
}
export async function listInquiries(req: Request, res: Response) {
  const p = paginate(req.query);
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.kind) filter.kind = String(req.query.kind);
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search)), "i");
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }];
  }
  const [items, total, newCount] = await Promise.all([
    Inquiry.find(filter).select("-ip").populate("project", "name").sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(),
    Inquiry.countDocuments(filter),
    Inquiry.countDocuments({ status: "new" }),
  ]);
  return ok(res, items, { ...pageMeta(p, total), newCount });
}
export async function updateInquiry(req: Request, res: Response) {
  const status = String(req.body?.status ?? "");
  if (!["new", "reviewed", "spam"].includes(status)) throw ApiError.badRequest("Invalid status");
  const i = await Inquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!i) throw ApiError.notFound("Inquiry");
  return ok(res, i);
}
export async function convertInquiry(req: Request, res: Response) {
  const i = await Inquiry.findById(req.params.id);
  if (!i) throw ApiError.notFound("Inquiry");
  if (i.lead) throw ApiError.conflict("Inquiry was already converted to a lead");
  const lead = await Lead.create({
    fullName: i.name,
    phone: i.phone,
    email: i.email || undefined,
    interestedProject: i.project,
    source: "website",
    status: "new",
    notes: [i.kind === "landowner" ? `Landowner inquiry. Land: ${i.landDetails?.location ?? "-"}, ${i.landDetails?.sizeKatha ?? "?"} katha, road ${i.landDetails?.roadWidth ?? "-"}` : null, i.message]
      .filter(Boolean)
      .join("\n\n"),
    inquiry: i._id,
    createdBy: req.user!.id,
    history: [{ type: "created", to: "new", note: "Created from website inquiry", by: req.user!.id, byName: req.user!.name }],
  });
  i.status = "converted";
  i.lead = lead._id;
  await i.save();
  await logActivity(req, "inquiry.convert", "Lead", lead._id, `Inquiry from ${i.name} converted to lead`);
  return created(res, lead);
}
export async function deleteInquiry(req: Request, res: Response) {
  const i = await Inquiry.findByIdAndDelete(req.params.id);
  if (!i) throw ApiError.notFound("Inquiry");
  return ok(res, { deleted: true });
}

/* ---------------- Generic image upload (staff) ---------------- */
export async function uploadImages(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) throw ApiError.badRequest("Attach at least one file");
  const folder = String(req.body?.folder ?? "general").replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "general";
  const stored = await Promise.all(files.map((f) => uploadBuffer(f, folder)));
  await logActivity(req, "upload", "Media", null, `Uploaded ${stored.length} file(s) to ${folder}`);
  return created(res, stored);
}
