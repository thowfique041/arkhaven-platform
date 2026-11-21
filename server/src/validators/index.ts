import { z } from "zod";
import mongoose from "mongoose";
import {
  FLAT_STATUSES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  CONSTRUCTION_STAGES,
} from "../types";

/* ---------- primitives ---------- */
export const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid id");
const optId = objectId.optional().nullable().or(z.literal("").transform(() => null));
const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional().nullable();
const phone = z.string().trim().min(6, "Phone is too short").max(30).regex(/^[+\d][\d\s-]{5,}$/, "Invalid phone number");
const email = z.string().trim().toLowerCase().email().max(160);
const optEmail = email.optional().nullable().or(z.literal("").transform(() => null));
/** Money is always integer poisha (1 BDT = 100). */
const minor = z.number().int("Amount must be in whole poisha").min(0).max(1e13);
const posMinor = z.number().int("Amount must be in whole poisha").min(1, "Amount must be greater than zero").max(1e13);
const date = z.coerce.date();
/** Optional date: "" and null both mean "no date". (z.coerce.date() would turn null into 1970-01-01.) */
const optDate = z.preprocess((v) => (v === "" || v === null ? null : v), z.coerce.date().nullable()).optional();
const url = z.string().trim().url().max(1000);
const image = z.object({ url, publicId: optStr(300), caption: optStr(200) });
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

/* ---------- auth ---------- */
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username").max(160),
  password: z.string().min(1, "Enter your password").max(128),
});
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password });
export const bootstrapSchema = z.object({
  token: z.string().min(16),
  name: str(120).min(2),
  email,
  password: password.and(z.string().min(12, "Super Admin password must be at least 12 characters")),
});
export const profileSchema = z.object({
  name: str(120).min(2).optional(),
  phone: phone.optional(),
  email: optEmail,
  address: optStr(300),
  notificationPrefs: z
    .object({ newLeadEmail: z.boolean(), paymentSubmitted: z.boolean(), followUpReminders: z.boolean() })
    .partial()
    .optional(),
});

/* ---------- users (admins) ---------- */
export const createAdminSchema = z.object({
  name: str(120).min(2),
  email,
  phone: phone.optional(),
  role: z.enum(["admin", "superadmin"]).default("admin"),
});
export const updateAdminSchema = z.object({
  name: str(120).min(2).optional(),
  phone: phone.optional().nullable(),
  role: z.enum(["admin", "superadmin"]).optional(),
  isActive: z.boolean().optional(),
});

/* ---------- projects ---------- */
const projectBase = z.object({
  name: str(120).min(2),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Slug may only contain a-z, 0-9 and -").max(80).optional(),
  tagline: optStr(200),
  description: optStr(8000),
  type: z.enum(PROJECT_TYPES).default("residential"),
  status: z.enum(PROJECT_STATUSES).default("upcoming"),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  location: z
    .object({
      address: optStr(300),
      area: optStr(80),
      city: optStr(80),
      lat: z.number().min(-90).max(90).optional().nullable(),
      lng: z.number().min(-180).max(180).optional().nullable(),
      mapEmbedUrl: z
        .string()
        .trim()
        .max(1000)
        .refine((v) => !v || /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/.test(v), "Map must be a Google Maps embed URL")
        .optional()
        .nullable(),
    })
    .default({}),
  coverImage: image.optional().nullable(),
  gallery: z.array(image).max(60).default([]),
  floorPlans: z
    .array(
      z.object({
        title: str(120).min(1),
        sizeSqft: z.number().positive().optional().nullable(),
        bedrooms: z.number().int().min(0).optional().nullable(),
        bathrooms: z.number().int().min(0).optional().nullable(),
        image: image.optional().nullable(),
      }),
    )
    .max(30)
    .default([]),
  amenities: z.array(str(80).min(1)).max(60).default([]),
  facilities: z.array(str(80).min(1)).max(60).default([]),
  specs: z
    .object({
      landArea: optStr(60),
      totalFloors: z.number().int().min(0).max(200).optional().nullable(),
      floorsLabel: optStr(20),
      unitsPerFloor: z.number().int().min(0).max(50).optional().nullable(),
      parking: optStr(80),
      frontRoad: optStr(60),
      structure: optStr(120),
      typicalSizeSqft: optStr(60),
      bedrooms: z.number().int().min(0).max(20).optional().nullable(),
      bathrooms: z.number().int().min(0).max(20).optional().nullable(),
    })
    .default({}),
  construction: z
    .object({
      contractor: optStr(120),
      architect: optStr(120),
      engineer: optStr(120),
      startedAt: optDate,
      foundation: optStr(200),
      materials: optStr(400),
    })
    .default({}),
  priceFromMinor: minor.optional().nullable(),
  expectedCompletion: optDate,
  faqs: z.array(z.object({ q: str(300).min(1), a: str(2000).min(1) })).max(30).default([]),
});
export const createProjectSchema = projectBase;
export const updateProjectSchema = projectBase.partial();
export const projectQuerySchema = z.object({
  status: z.enum(PROJECT_STATUSES).optional(),
  type: z.enum(PROJECT_TYPES).optional(),
  area: z.string().trim().max(80).optional(),
  search: z.string().trim().max(80).optional(),
  featured: z.enum(["true", "false"]).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

/* ---------- flats ---------- */
const flatBase = z.object({
  project: objectId,
  unitNumber: str(20).min(1),
  floor: z.number().int().min(0).max(200),
  sizeSqft: z.number().positive().max(100000),
  bedrooms: z.number().int().min(0).max(20).default(3),
  bathrooms: z.number().int().min(0).max(20).default(2),
  balconies: z.number().int().min(0).max(20).default(2),
  facing: optStr(40),
  parking: z.boolean().default(false),
  priceMinor: minor,
  status: z.enum(FLAT_STATUSES).default("available"),
  notes: optStr(1000),
});
export const createFlatSchema = flatBase;
export const updateFlatSchema = flatBase.partial().omit({ project: true });
export const bulkFlatsSchema = z.object({
  project: objectId,
  floors: z.object({ from: z.number().int().min(0), to: z.number().int().min(0).max(200) }),
  units: z
    .array(
      z.object({
        suffix: str(4).min(1),
        sizeSqft: z.number().positive(),
        bedrooms: z.number().int().min(0).default(3),
        bathrooms: z.number().int().min(0).default(2),
        balconies: z.number().int().min(0).default(2),
        facing: optStr(40),
        priceMinor: minor,
      }),
    )
    .min(1)
    .max(12),
});

/* ---------- leads ---------- */
const leadBase = z.object({
  fullName: str(120).min(2),
  phone,
  email: optEmail,
  address: optStr(300),
  interestedProject: optId,
  interestedFlat: optId,
  budgetMinor: minor.optional().nullable(),
  source: z.enum(LEAD_SOURCES).default("other"),
  status: z.enum(LEAD_STATUSES).default("new"),
  notes: optStr(4000),
  followUpDate: optDate,
  assignedTo: optId,
});
export const createLeadSchema = leadBase.extend({
  createAccount: z.boolean().default(false),
  inquiry: optId,
});
export const updateLeadSchema = leadBase.partial();
export const leadStatusSchema = z.object({ status: z.enum(LEAD_STATUSES), note: optStr(2000) });
export const leadNoteSchema = z.object({ note: str(2000).min(1) });
export const leadFollowUpSchema = z.object({ followUpDate: date, note: optStr(2000) });

/* ---------- customers ---------- */
export const createCustomerSchema = z.object({
  lead: optId,
  fullName: str(120).min(2),
  phone,
  email: optEmail,
  address: optStr(300),
  project: optId,
  flat: optId,
  bookingDate: optDate,
  agreedPriceMinor: minor.optional().nullable(),
  notes: optStr(4000),
  flatStatus: z.enum(["reserved", "booked", "sold"]).default("booked"),
});
export const updateCustomerSchema = z.object({
  fullName: str(120).min(2).optional(),
  phone: phone.optional(),
  email: optEmail,
  address: optStr(300),
  bookingDate: optDate,
  agreedPriceMinor: minor.optional(),
  notes: optStr(4000),
});
export const assignFlatSchema = z.object({
  project: objectId,
  flat: objectId,
  agreedPriceMinor: minor.optional(),
  bookingDate: optDate,
  flatStatus: z.enum(["reserved", "booked", "sold"]).default("booked"),
});
export const customerSelfSchema = z.object({ phone: phone.optional(), email: optEmail, address: optStr(300) });

/* ---------- payments ---------- */
export const createPaymentSchema = z.object({
  customer: objectId,
  amountMinor: posMinor,
  method: z.enum(PAYMENT_METHODS),
  type: z.enum(PAYMENT_TYPES).default("installment"),
  transactionRef: optStr(80),
  paidAt: date.refine((d) => d.getTime() <= Date.now() + 24 * 3600 * 1000, "Payment date cannot be in the future"),
  note: optStr(1000),
  status: z.enum(["pending", "verified"]).default("pending"),
});
export const updatePaymentSchema = z.object({
  amountMinor: posMinor.optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  type: z.enum(PAYMENT_TYPES).optional(),
  transactionRef: optStr(80),
  paidAt: date.optional(),
  note: optStr(1000),
});
export const paymentDecisionSchema = z.object({
  status: z.enum(PAYMENT_STATUSES),
  reason: optStr(500),
});

/* ---------- progress ---------- */
export const progressUpdateSchema = z.object({
  currentStage: z.number().int().min(0).max(CONSTRUCTION_STAGES.length - 1).optional(),
  percent: z.number().min(0).max(100).optional(),
  expectedHandover: optDate,
  stageNote: optStr(500),
});
export const progressPostSchema = z.object({
  title: str(160).min(2),
  description: optStr(4000),
  photos: z.array(z.object({ url, publicId: optStr(300), caption: optStr(200) })).max(20).default([]),
});

/* ---------- announcements, testimonials ---------- */
export const announcementSchema = z.object({
  title: str(160).min(2),
  body: str(5000).min(2),
  project: optId,
  published: z.boolean().default(true),
  pinned: z.boolean().default(false),
});
export const testimonialSchema = z.object({
  name: str(120).min(2),
  role: optStr(120),
  quote: str(800).min(5),
  rating: z.number().int().min(1).max(5).default(5),
  photo: z.object({ url, publicId: optStr(300) }).optional().nullable(),
  project: optId,
  published: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

/* ---------- inquiries (public) ---------- */
export const inquirySchema = z.object({
  kind: z.enum(["general", "project", "landowner"]).default("general"),
  name: str(120).min(2),
  phone,
  email: optEmail,
  message: optStr(3000),
  project: optId,
  landDetails: z
    .object({ location: optStr(200), sizeKatha: z.number().min(0).max(10000).optional().nullable(), roadWidth: optStr(40) })
    .optional(),
  // Honeypot: real users never fill this hidden field.
  website: z.string().max(0).optional(),
});

/* ---------- settings ---------- */
const optImage = z.object({ url, publicId: optStr(300) }).optional().nullable();
export const settingsSchema = z
  .object({
    companyName: optStr(120),
    announcementBar: optStr(200),
    hero: z
      .object({
        eyebrow: optStr(80),
        title: optStr(160),
        subtitle: optStr(400),
        image: optImage,
        primaryCtaLabel: optStr(40),
        secondaryCtaLabel: optStr(40),
      })
      .partial(),
    about: z
      .object({
        eyebrow: optStr(80),
        title: optStr(200),
        body: optStr(4000),
        image: optImage,
        mission: optStr(1000),
        vision: optStr(1000),
        points: z.array(str(200)).max(10),
      })
      .partial(),
    values: z.array(z.object({ title: str(80), body: str(400) })).max(8),
    whyUs: z.array(z.object({ title: str(80), body: str(400) })).max(8),
    stats: z.array(z.object({ label: str(60), value: str(30) })).max(8),
    team: z.array(z.object({ name: str(80), role: str(80), bio: optStr(500), photo: optImage })).max(16),
    milestones: z.array(z.object({ year: str(10), title: str(120), body: optStr(400) })).max(20),
    featuredProjectIds: z.array(objectId).max(12),
    contact: z
      .object({
        phone: optStr(40),
        email: optEmail,
        whatsapp: optStr(30),
        address: optStr(300),
        officeHours: optStr(120),
        mapEmbedUrl: optStr(1000),
      })
      .partial(),
    social: z
      .object({
        facebook: url.optional().nullable().or(z.literal("")),
        instagram: url.optional().nullable().or(z.literal("")),
        linkedin: url.optional().nullable().or(z.literal("")),
        youtube: url.optional().nullable().or(z.literal("")),
      })
      .partial(),
    seo: z.object({ title: optStr(120), description: optStr(300) }).partial(),
  })
  .partial();
