import { Types } from "mongoose";
import { Customer, Payment } from "../models";
import { ApiError } from "../utils/http";

export interface FinancialSummary {
  totalPriceMinor: number;
  paidMinor: number; // verified only
  pendingMinor: number;
  remainingMinor: number;
  paidPercent: number; // 0..100, two decimals
  paymentsCount: number;
}

/** All money is integer poisha. Totals are always computed here, never trusted from the client. */
export async function customerSummary(customerId: string | Types.ObjectId): Promise<FinancialSummary> {
  const customer = await Customer.findById(customerId).select("agreedPriceMinor").lean();
  if (!customer) throw ApiError.notFound("Customer");
  const payments = await Payment.find({ customer: customerId, status: { $ne: "rejected" } })
    .select("amountMinor status")
    .lean();
  return buildSummary(customer.agreedPriceMinor ?? 0, payments);
}

export function buildSummary(
  totalPriceMinor: number,
  payments: { amountMinor: number; status: string }[],
): FinancialSummary {
  let paid = 0;
  let pending = 0;
  for (const p of payments) {
    if (p.status === "verified") paid += p.amountMinor;
    else if (p.status === "pending") pending += p.amountMinor;
  }
  const remaining = Math.max(0, totalPriceMinor - paid);
  const pct = totalPriceMinor > 0 ? Math.min(100, Math.round((paid / totalPriceMinor) * 10000) / 100) : 0;
  return {
    totalPriceMinor,
    paidMinor: paid,
    pendingMinor: pending,
    remainingMinor: remaining,
    paidPercent: pct,
    paymentsCount: payments.length,
  };
}

/**
 * Rejects a payment that would push verified + pending payments above the agreed price.
 * `excludePaymentId` lets an edit ignore the payment's own previous amount.
 */
export async function assertWithinBalance(customerId: string, amountMinor: number, excludePaymentId?: string) {
  const customer = await Customer.findById(customerId).select("agreedPriceMinor").lean();
  if (!customer) throw ApiError.notFound("Customer");
  const total = customer.agreedPriceMinor ?? 0;
  if (total <= 0) throw ApiError.badRequest("Set the customer's agreed price before recording payments");
  const filter: Record<string, unknown> = { customer: customerId, status: { $in: ["pending", "verified"] } };
  if (excludePaymentId) filter._id = { $ne: excludePaymentId };
  const existing = await Payment.find(filter).select("amountMinor").lean();
  const committed = existing.reduce((s, p) => s + p.amountMinor, 0);
  if (committed + amountMinor > total) {
    throw ApiError.conflict("Payment exceeds the customer's remaining balance", {
      totalPriceMinor: total,
      committedMinor: committed,
      maxAllowedMinor: Math.max(0, total - committed),
    });
  }
}

export function dedupeKeyFor(method: string, transactionRef?: string | null): string {
  const ref = (transactionRef ?? "").trim().toUpperCase().replace(/\s+/g, "");
  return ref ? `${method}:${ref}` : `noref:${new Types.ObjectId().toHexString()}`;
}

export function formatBDT(minor: number): string {
  const taka = minor / 100;
  return "BDT " + taka.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
