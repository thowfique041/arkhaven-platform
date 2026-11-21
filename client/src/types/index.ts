export type Role = "superadmin" | "admin" | "customer";
export type ProjectStatus = "upcoming" | "ongoing" | "completed";
export type ProjectType = "residential" | "commercial" | "mixed-use";
export type FlatStatus = "available" | "reserved" | "booked" | "sold";
export type LeadStatus = "new" | "contacted" | "interested" | "site_visit_scheduled" | "negotiation" | "booked" | "converted" | "lost";
export type LeadSource = "website" | "walk_in" | "phone" | "facebook" | "referral" | "whatsapp" | "event" | "other";
export type PaymentStatus = "pending" | "verified" | "rejected";
export type PaymentMethod = "cash" | "bank_transfer" | "cheque" | "bkash" | "nagad" | "card" | "other";
export type PaymentType = "booking" | "down_payment" | "installment" | "car_parking" | "utility" | "other";

export interface Img {
  _id?: string;
  url: string;
  publicId?: string | null;
  caption?: string | null;
}

export interface User {
  _id: string;
  name: string;
  email?: string;
  username: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  customer?: string;
  notificationPrefs?: { newLeadEmail: boolean; paymentSubmitted: boolean; followUpReminders: boolean };
  createdAt: string;
}

export interface UnitCounts {
  total: number;
  available: number;
  reserved: number;
  booked: number;
  sold: number;
}

export interface ProgressSummary {
  percent: number;
  currentStage: number;
  currentStageName?: string;
  stages?: { key: number; name: string; status: "pending" | "in_progress" | "completed" }[];
  expectedHandover?: string;
  updatedAt?: string;
}

export interface Project {
  _id: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  type: ProjectType;
  status: ProjectStatus;
  featured: boolean;
  published: boolean;
  sortOrder: number;
  location: { address?: string; area?: string; city?: string; lat?: number; lng?: number; mapEmbedUrl?: string };
  coverImage?: Img;
  gallery: Img[];
  floorPlans: { _id?: string; title: string; sizeSqft?: number; bedrooms?: number; bathrooms?: number; image?: Img }[];
  amenities: string[];
  facilities: string[];
  specs: {
    landArea?: string;
    totalFloors?: number;
    floorsLabel?: string;
    unitsPerFloor?: number;
    parking?: string;
    frontRoad?: string;
    structure?: string;
    typicalSizeSqft?: string;
    bedrooms?: number;
    bathrooms?: number;
  };
  construction: { contractor?: string; architect?: string; engineer?: string; startedAt?: string; foundation?: string; materials?: string };
  priceFromMinor?: number;
  expectedCompletion?: string;
  faqs: { q: string; a: string }[];
  units?: UnitCounts;
  progress?: ProgressSummary | null;
  flats?: Flat[];
  createdAt: string;
}

export interface Flat {
  _id: string;
  project: string | Pick<Project, "_id" | "name" | "slug">;
  unitNumber: string;
  floor: number;
  sizeSqft: number;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  facing?: string;
  parking: boolean;
  priceMinor: number | null;
  status: FlatStatus;
  customer?: null | string | { _id: string; fullName: string; code: string; phone: string };
  notes?: string;
}

export interface LeadHistory {
  _id: string;
  type: "created" | "status" | "note" | "follow_up" | "updated" | "converted" | "account";
  from?: string;
  to?: string;
  note?: string;
  byName?: string;
  at: string;
}

export interface Lead {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  interestedProject?: { _id: string; name: string; slug: string } | null;
  interestedFlat?: { _id: string; unitNumber: string; floor?: number; sizeSqft?: number; priceMinor?: number; status?: FlatStatus } | null;
  budgetMinor?: number;
  source: LeadSource;
  status: LeadStatus;
  notes?: string;
  followUpDate?: string;
  assignedTo?: { _id: string; name: string } | null;
  customer?: { _id: string; code: string; fullName: string } | string | null;
  history?: LeadHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSummary {
  totalPriceMinor: number;
  paidMinor: number;
  pendingMinor: number;
  remainingMinor: number;
  paidPercent: number;
  paymentsCount: number;
}

export interface Payment {
  _id: string;
  customer: string | { _id: string; code: string; fullName: string; phone: string };
  project?: string | { _id: string; name: string };
  flat?: string | { _id: string; unitNumber: string };
  amountMinor: number;
  method: PaymentMethod;
  type: PaymentType;
  transactionRef?: string;
  paidAt: string;
  status: PaymentStatus;
  receiptNumber?: string;
  note?: string;
  rejectionReason?: string;
  recordedBy?: { name: string };
  verifiedBy?: { name: string };
  verifiedAt?: string;
  attachment?: { url: string };
  audit?: { action: string; byName?: string; note?: string; at: string; changes?: Record<string, { from: unknown; to: unknown }> }[];
  createdAt: string;
}

export interface ProgressUpdate {
  _id: string;
  title: string;
  description?: string;
  stageKey?: number;
  percent?: number;
  photos: { url: string; caption?: string; publicId?: string }[];
  createdAt: string;
}

export interface ConstructionProgress {
  _id: string;
  project: string | { _id: string; name: string; slug: string; status: ProjectStatus; expectedCompletion?: string };
  currentStage: number;
  percent: number;
  stages: { key: number; name: string; status: "pending" | "in_progress" | "completed"; startedAt?: string; completedAt?: string; note?: string }[];
  expectedHandover?: string;
  updates: ProgressUpdate[];
  updatedAt: string;
}

export interface Customer {
  _id: string;
  code: string;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  project?: Project | null;
  flat?: Flat | null;
  bookingDate?: string;
  agreedPriceMinor: number;
  notes?: string;
  lead?: string;
  user?: { _id: string; isActive: boolean; lastLoginAt?: string; username: string; email?: string; mustChangePassword: boolean };
  summary?: FinancialSummary;
  progress?: ConstructionProgress | null;
  payments?: Payment[];
  announcements?: Announcement[];
  createdAt: string;
}

export interface Announcement {
  _id: string;
  title: string;
  body: string;
  project?: { _id: string; name: string } | null;
  published: boolean;
  pinned: boolean;
  createdBy?: { name: string };
  createdAt: string;
}

export interface Testimonial {
  _id: string;
  name: string;
  role?: string;
  quote: string;
  rating: number;
  photo?: Img | null;
  project?: { _id: string; name: string; slug?: string } | null;
  published: boolean;
  sortOrder: number;
}

export interface Inquiry {
  _id: string;
  kind: "general" | "project" | "landowner";
  name: string;
  phone: string;
  email?: string;
  message?: string;
  project?: { _id: string; name: string } | null;
  landDetails?: { location?: string; sizeKatha?: number; roadWidth?: string };
  status: "new" | "reviewed" | "converted" | "spam";
  lead?: string;
  createdAt: string;
}

export interface WebsiteSettings {
  companyName?: string;
  announcementBar?: string;
  hero?: { eyebrow?: string; title?: string; subtitle?: string; image?: Img | null; primaryCtaLabel?: string; secondaryCtaLabel?: string };
  about?: { eyebrow?: string; title?: string; body?: string; image?: Img | null; mission?: string; vision?: string; points?: string[] };
  values?: { title: string; body: string }[];
  whyUs?: { title: string; body: string }[];
  stats?: { label: string; value: string }[];
  team?: { name: string; role: string; bio?: string; photo?: Img | null }[];
  milestones?: { year: string; title: string; body?: string }[];
  featuredProjectIds?: ({ _id: string; name: string; slug: string } | string)[];
  contact?: { phone?: string; email?: string; whatsapp?: string; address?: string; officeHours?: string; mapEmbedUrl?: string };
  social?: { facebook?: string; instagram?: string; linkedin?: string; youtube?: string };
  seo?: { title?: string; description?: string };
}

export interface ActivityItem {
  _id: string;
  actorName?: string;
  actorRole?: Role;
  action: string;
  entity: string;
  entityId?: string;
  summary?: string;
  createdAt: string;
}

export interface Credentials {
  username: string;
  temporaryPassword: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  [k: string]: unknown;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: PageMeta;
}
