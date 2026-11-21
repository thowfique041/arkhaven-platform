import type { Types } from "mongoose";

export const ROLES = ["superadmin", "admin", "customer"] as const;
export type Role = (typeof ROLES)[number];
export const STAFF_ROLES: Role[] = ["superadmin", "admin"];

export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  email?: string;
  customerId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export type Id = Types.ObjectId;

export const PROJECT_STATUSES = ["upcoming", "ongoing", "completed"] as const;
export const PROJECT_TYPES = ["residential", "commercial", "mixed-use"] as const;
export const FLAT_STATUSES = ["available", "reserved", "booked", "sold"] as const;
export const LEAD_STATUSES = [
  "new",
  "contacted",
  "interested",
  "site_visit_scheduled",
  "negotiation",
  "booked",
  "converted",
  "lost",
] as const;
export const LEAD_SOURCES = ["website", "walk_in", "phone", "facebook", "referral", "whatsapp", "event", "other"] as const;
export const PAYMENT_STATUSES = ["pending", "verified", "rejected"] as const;
export const PAYMENT_METHODS = ["cash", "bank_transfer", "cheque", "bkash", "nagad", "card", "other"] as const;
export const PAYMENT_TYPES = ["booking", "down_payment", "installment", "car_parking", "utility", "other"] as const;

export const CONSTRUCTION_STAGES = [
  "Booking Confirmed",
  "Land Preparation",
  "Foundation Work",
  "Structural Construction",
  "Brickwork",
  "Plumbing & Electrical",
  "Plastering",
  "Interior Work",
  "Finishing",
  "Completed",
  "Handover",
] as const;
