import type { FlatStatus, LeadSource, LeadStatus, PaymentMethod, PaymentStatus, PaymentType, ProjectStatus, ProjectType } from "@/types";

/** Money is always integer poisha on the wire. 1 BDT = 100 poisha. */
export function formatBDT(minor: number | null | undefined, opts: { decimals?: boolean } = {}): string {
  if (minor === null || minor === undefined) return "–";
  const taka = minor / 100;
  const decimals = opts.decimals ?? !Number.isInteger(taka);
  return "৳ " + taka.toLocaleString("en-IN", { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 });
}

/** Compact Bangladeshi notation for big numbers: 1.98 Cr, 45.5 Lac. */
export function formatBDTShort(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "–";
  const taka = minor / 100;
  if (taka >= 1e7) return `৳ ${(taka / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (taka >= 1e5) return `৳ ${(taka / 1e5).toFixed(2).replace(/\.?0+$/, "")} Lac`;
  return formatBDT(minor, { decimals: false });
}

/** Parses a taka amount typed by a user ("1,20,000.50") into integer poisha without float drift. */
export function takaToMinor(input: string | number): number | null {
  const s = String(input).replace(/[,\s৳]/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

export function minorToTakaInput(minor?: number | null): string {
  if (minor === null || minor === undefined) return "";
  const whole = Math.floor(minor / 100);
  const frac = minor % 100;
  return frac ? `${whole}.${String(frac).padStart(2, "0")}` : String(whole);
}

export function formatDate(d?: string | Date | null, withTime = false): string {
  if (!d) return "–";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "–";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
}

export function toDateInput(d?: string | Date | null): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function relativeTime(d: string | Date): string {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`;
  return formatDate(d);
}

export const sqft = (n?: number | null) => (n ? `${n.toLocaleString("en-IN")} sft` : "–");

const title = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export const projectStatusLabel: Record<ProjectStatus, string> = { upcoming: "Upcoming", ongoing: "Under construction", completed: "Completed" };
export const projectTypeLabel: Record<ProjectType, string> = { residential: "Residential", commercial: "Commercial", "mixed-use": "Mixed-use" };
export const flatStatusLabel: Record<FlatStatus, string> = { available: "Available", reserved: "Reserved", booked: "Booked", sold: "Sold" };
export const leadStatusLabel: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  site_visit_scheduled: "Site visit scheduled",
  negotiation: "Negotiation",
  booked: "Booked",
  converted: "Converted",
  lost: "Lost",
};
export const leadSourceLabel: Record<LeadSource, string> = {
  website: "Website",
  walk_in: "Walk-in",
  phone: "Phone call",
  facebook: "Facebook",
  referral: "Referral",
  whatsapp: "WhatsApp",
  event: "Event / fair",
  other: "Other",
};
export const paymentStatusLabel: Record<PaymentStatus, string> = { pending: "Pending", verified: "Verified", rejected: "Rejected" };
export const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  bkash: "bKash",
  nagad: "Nagad",
  card: "Card",
  other: "Other",
};
export const paymentTypeLabel: Record<PaymentType, string> = {
  booking: "Booking money",
  down_payment: "Down payment",
  installment: "Installment",
  car_parking: "Car parking",
  utility: "Utility connection",
  other: "Other",
};
export const label = title;

export function whatsappLink(number?: string, text?: string) {
  if (!number) return undefined;
  const n = number.replace(/[^\d]/g, "");
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Returns a resized Unsplash URL when applicable; other URLs are returned unchanged. */
export function imgSrc(url?: string, w = 1200) {
  if (!url) return undefined;
  if (url.includes("images.unsplash.com")) {
    const u = new URL(url);
    u.searchParams.set("w", String(w));
    u.searchParams.set("auto", "format");
    u.searchParams.set("q", "75");
    return u.toString();
  }
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) return url.replace("/upload/", `/upload/f_auto,q_auto,w_${w}/`);
  return url;
}
