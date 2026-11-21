import { Schema, model, type InferSchemaType } from "mongoose";

/* ---------------- Announcement ---------------- */
const announcementSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 160 },
    body: { type: String, required: true, maxlength: 5000 },
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null, index: true }, // null = all customers
    published: { type: Boolean, default: true },
    pinned: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);
export type AnnouncementT = InferSchemaType<typeof announcementSchema>;
export const Announcement = model("Announcement", announcementSchema);

/* ---------------- Testimonial ---------------- */
const testimonialSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 120 },
    role: { type: String, maxlength: 120 },
    quote: { type: String, required: true, maxlength: 800 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    photo: { url: String, publicId: String },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    published: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export const Testimonial = model("Testimonial", testimonialSchema);

/* ---------------- Inquiry (public form submissions) ----------------
 * Visitors can send inquiries, but cannot create leads or accounts.
 * Staff review inquiries and convert relevant ones into leads.
 */
const inquirySchema = new Schema(
  {
    kind: { type: String, enum: ["general", "project", "landowner"], default: "general", index: true },
    name: { type: String, required: true, maxlength: 120 },
    phone: { type: String, required: true, maxlength: 30 },
    email: { type: String, maxlength: 160 },
    message: { type: String, maxlength: 3000 },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    landDetails: { location: String, sizeKatha: Number, roadWidth: String },
    status: { type: String, enum: ["new", "reviewed", "converted", "spam"], default: "new", index: true },
    lead: { type: Schema.Types.ObjectId, ref: "Lead" },
    ip: String,
  },
  { timestamps: true },
);
export const Inquiry = model("Inquiry", inquirySchema);

/* ---------------- WebsiteSettings (singleton) ---------------- */
const img = { url: String, publicId: String };
const websiteSettingsSchema = new Schema(
  {
    key: { type: String, default: "main", unique: true },
    companyName: { type: String, default: "Arkhaven Properties Ltd." },
    hero: {
      eyebrow: String,
      title: String,
      subtitle: String,
      image: img,
      primaryCtaLabel: String,
      secondaryCtaLabel: String,
    },
    about: {
      eyebrow: String,
      title: String,
      body: String,
      image: img,
      mission: String,
      vision: String,
      points: [String],
    },
    values: [{ title: String, body: String }],
    whyUs: [{ title: String, body: String }],
    stats: [{ label: String, value: String }],
    team: [{ name: String, role: String, bio: String, photo: img }],
    milestones: [{ year: String, title: String, body: String }],
    featuredProjectIds: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    contact: {
      phone: String,
      email: String,
      whatsapp: String,
      address: String,
      officeHours: String,
      mapEmbedUrl: String,
    },
    social: { facebook: String, instagram: String, linkedin: String, youtube: String },
    seo: { title: String, description: String },
    announcementBar: String,
  },
  { timestamps: true },
);
export type WebsiteSettingsT = InferSchemaType<typeof websiteSettingsSchema>;
export const WebsiteSettings = model("WebsiteSettings", websiteSettingsSchema);

/* ---------------- ActivityLog ---------------- */
const activitySchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorName: String,
    actorRole: String,
    action: { type: String, required: true }, // e.g. "payment.verify"
    entity: { type: String, required: true }, // e.g. "Payment"
    entityId: String,
    summary: String,
    meta: Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
activitySchema.index({ createdAt: -1 });
activitySchema.index({ entity: 1, entityId: 1 });
export const ActivityLog = model("ActivityLog", activitySchema);

/* ---------------- Counter (sequential codes / receipt numbers) ---------------- */
const counterSchema = new Schema({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } });
export const Counter = model("Counter", counterSchema);

export async function nextSeq(name: string): Promise<number> {
  const doc = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return doc!.seq;
}
