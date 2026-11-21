import type { Request, Response } from "express";
import type { z } from "zod";
import { Customer, Payment, WebsiteSettings, nextSeq } from "../models";
import { logActivity } from "../services/activity";
import { assertWithinBalance, buildSummary, customerSummary, dedupeKeyFor } from "../services/finance";
import { streamReceipt } from "../services/receipt";
import { uploadBuffer } from "../services/storage";
import { ApiError, created, escapeRegex, ok, pageMeta, paginate } from "../utils/http";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../types";
import type { createPaymentSchema, paymentDecisionSchema, updatePaymentSchema } from "../validators";

const actor = (req: Request) => ({ by: req.user!.id, byName: req.user!.name, at: new Date() });

async function newReceiptNumber() {
  const seq = await nextSeq(`receipt-${new Date().getFullYear()}`);
  return `RCPT-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;
}

export async function listPayments(req: Request, res: Response) {
  const p = paginate(req.query);
  const q = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};
  if (q.customer) filter.customer = q.customer;
  if (q.project) filter.project = q.project;
  if (q.status && (PAYMENT_STATUSES as readonly string[]).includes(q.status)) filter.status = q.status;
  if (q.method && (PAYMENT_METHODS as readonly string[]).includes(q.method)) filter.method = q.method;
  if (q.from || q.to) {
    const range: Record<string, Date> = {};
    if (q.from && !isNaN(Date.parse(q.from))) range.$gte = new Date(q.from);
    if (q.to && !isNaN(Date.parse(q.to))) range.$lte = new Date(new Date(q.to).setHours(23, 59, 59, 999));
    filter.paidAt = range;
  }
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), "i");
    const customers = await Customer.find({ $or: [{ fullName: rx }, { code: rx }, { phone: rx }] }).select("_id").lean();
    filter.$or = [{ transactionRef: rx }, { receiptNumber: rx }, { customer: { $in: customers.map((c) => c._id) } }];
  }
  const [items, total, totalsSrc] = await Promise.all([
    Payment.find(filter)
      .select("-audit -dedupeKey")
      .populate("customer", "code fullName phone")
      .populate("project", "name")
      .populate("flat", "unitNumber")
      .populate("recordedBy", "name")
      .populate("verifiedBy", "name")
      .sort({ paidAt: -1, createdAt: -1 })
      .skip(p.skip)
      .limit(p.limit)
      .lean(),
    Payment.countDocuments(filter),
    Payment.find(filter).select("amountMinor status").lean(),
  ]);
  const totals = { verifiedMinor: 0, pendingMinor: 0, rejectedMinor: 0 };
  for (const t of totalsSrc) totals[`${t.status}Minor` as keyof typeof totals] += t.amountMinor;
  return ok(res, items, { ...pageMeta(p, total), totals });
}

export async function getPayment(req: Request, res: Response) {
  const payment = await Payment.findById(req.params.id)
    .populate("customer", "code fullName phone")
    .populate("project", "name")
    .populate("flat", "unitNumber")
    .populate("recordedBy", "name")
    .populate("verifiedBy", "name")
    .lean();
  if (!payment) throw ApiError.notFound("Payment");
  return ok(res, payment);
}

export async function createPayment(req: Request, res: Response) {
  const body = req.body as z.infer<typeof createPaymentSchema>;
  const customer = await Customer.findById(body.customer).lean();
  if (!customer) throw ApiError.badRequest("Customer does not exist");
  if (!customer.flat) throw ApiError.badRequest("Assign a flat to this customer before recording payments");
  await assertWithinBalance(String(customer._id), body.amountMinor);

  const dedupeKey = dedupeKeyFor(body.method, body.transactionRef);
  if (await Payment.exists({ dedupeKey })) {
    throw ApiError.conflict("A payment with this method and transaction reference already exists");
  }
  const verifyNow = body.status === "verified";
  const payment = await Payment.create({
    ...body,
    transactionRef: body.transactionRef || undefined,
    dedupeKey,
    project: customer.project,
    flat: customer.flat,
    recordedBy: req.user!.id,
    status: verifyNow ? "verified" : "pending",
    ...(verifyNow ? { verifiedBy: req.user!.id, verifiedAt: new Date(), receiptNumber: await newReceiptNumber() } : {}),
    audit: [{ action: "created", ...actor(req), note: verifyNow ? "Recorded and verified" : "Recorded as pending" }],
  });
  await logActivity(req, "payment.create", "Payment", payment._id, `Recorded payment for ${customer.code}`, {
    amountMinor: payment.amountMinor,
    status: payment.status,
  });
  return created(res, { payment, summary: await customerSummary(customer._id) });
}

export async function updatePayment(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updatePaymentSchema>;
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw ApiError.notFound("Payment");
  if (payment.status !== "pending") {
    throw ApiError.conflict("Only pending payments can be edited. Move it back to pending first.");
  }
  if (body.amountMinor !== undefined && body.amountMinor !== payment.amountMinor) {
    await assertWithinBalance(String(payment.customer), body.amountMinor, String(payment._id));
  }
  const method = body.method ?? payment.method;
  const ref = body.transactionRef !== undefined ? body.transactionRef : payment.transactionRef;
  const key = ref ? dedupeKeyFor(method, ref) : payment.transactionRef ? dedupeKeyFor(method, null) : payment.dedupeKey;
  if (key !== payment.dedupeKey && (await Payment.exists({ dedupeKey: key, _id: { $ne: payment._id } }))) {
    throw ApiError.conflict("A payment with this method and transaction reference already exists");
  }
  const changes: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    const prev = payment.get(k);
    if (String(prev) !== String(v)) changes[k] = { from: prev, to: v };
  }
  payment.set({ ...body, transactionRef: ref || undefined, dedupeKey: key });
  payment.audit.push({ action: "updated", ...actor(req), changes });
  await payment.save();
  await logActivity(req, "payment.update", "Payment", payment._id, "Edited pending payment", changes);
  return ok(res, { payment, summary: await customerSummary(payment.customer) });
}

/** Verify, reject, or move back to pending. Every transition is audited. */
export async function decidePayment(req: Request, res: Response) {
  const { status, reason } = req.body as z.infer<typeof paymentDecisionSchema>;
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw ApiError.notFound("Payment");
  if (payment.status === status) throw ApiError.badRequest(`Payment is already ${status}`);
  if (status === "rejected" && !reason) throw ApiError.badRequest("Give a reason for rejecting the payment");

  if (status === "verified") {
    // Re-check balance in case the agreed price changed or other payments were added.
    await assertWithinBalance(String(payment.customer), payment.amountMinor, String(payment._id));
    payment.verifiedBy = req.user!.id as unknown as typeof payment.verifiedBy;
    payment.verifiedAt = new Date();
    payment.receiptNumber = await newReceiptNumber();
    payment.rejectionReason = undefined;
  } else if (status === "rejected") {
    payment.rejectionReason = reason ?? undefined;
    payment.receiptNumber = undefined;
    payment.verifiedAt = undefined;
  } else {
    if (payment.status === "rejected") await assertWithinBalance(String(payment.customer), payment.amountMinor, String(payment._id));
    payment.receiptNumber = undefined;
    payment.verifiedAt = undefined;
  }
  const from = payment.status;
  payment.status = status;
  payment.audit.push({ action: status === "pending" ? "reopened" : status, ...actor(req), note: reason || undefined });
  await payment.save();
  await logActivity(req, `payment.${status}`, "Payment", payment._id, `Payment ${from} → ${status}`, { amountMinor: payment.amountMinor, reason });
  return ok(res, { payment, summary: await customerSummary(payment.customer) });
}

export async function deletePayment(req: Request, res: Response) {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw ApiError.notFound("Payment");
  if (payment.status === "verified") throw ApiError.conflict("Verified payments cannot be deleted. Reject or reopen it first.");
  await payment.deleteOne();
  await logActivity(req, "payment.delete", "Payment", payment._id, "Deleted payment", {
    amountMinor: payment.amountMinor,
    customer: String(payment.customer),
    status: payment.status,
  });
  return ok(res, { deleted: true });
}

export async function attachProof(req: Request, res: Response) {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw ApiError.notFound("Payment");
  if (!req.file) throw ApiError.badRequest("Attach a file");
  payment.attachment = await uploadBuffer(req.file, "payments");
  payment.audit.push({ action: "updated", ...actor(req), note: "Attachment added" });
  await payment.save();
  return ok(res, payment);
}

/** Outstanding balances for every customer with a flat. */
export async function outstanding(req: Request, res: Response) {
  const filter: Record<string, unknown> = { flat: { $ne: null } };
  if (req.query.project) filter.project = String(req.query.project);
  const customers = await Customer.find(filter).populate("project", "name").populate("flat", "unitNumber").select("code fullName phone agreedPriceMinor project flat").lean();
  const pays = await Payment.find({ customer: { $in: customers.map((c) => c._id) }, status: { $ne: "rejected" } }).select("customer amountMinor status").lean();
  const grouped = new Map<string, { amountMinor: number; status: string }[]>();
  for (const p of pays) grouped.set(String(p.customer), [...(grouped.get(String(p.customer)) ?? []), p]);
  const rows = customers
    .map((c) => ({ customer: c, summary: buildSummary(c.agreedPriceMinor ?? 0, grouped.get(String(c._id)) ?? []) }))
    .sort((a, b) => b.summary.remainingMinor - a.summary.remainingMinor);
  return ok(res, rows);
}

/* ---------------- Customer-facing ---------------- */
export async function myPayments(req: Request, res: Response) {
  const customerId = req.user!.customerId;
  if (!customerId) throw ApiError.notFound("Customer profile");
  // Ownership is enforced by the query itself: only this customer's id is ever used.
  const payments = await Payment.find({ customer: customerId })
    .select("amountMinor method type transactionRef paidAt status receiptNumber note rejectionReason verifiedAt createdAt")
    .sort({ paidAt: -1 })
    .lean();
  return ok(res, { payments, summary: await customerSummary(customerId) });
}

export async function receipt(req: Request, res: Response) {
  const payment = await Payment.findById(req.params.id).populate("project", "name location").populate("flat", "unitNumber floor sizeSqft").lean();
  if (!payment) throw ApiError.notFound("Payment");
  if (req.user!.role === "customer" && String(payment.customer) !== req.user!.customerId) {
    // Same response as a missing record: do not reveal that another customer's payment exists.
    throw ApiError.notFound("Payment");
  }
  if (payment.status !== "verified" || !payment.receiptNumber) throw ApiError.badRequest("Receipts are available for verified payments only");
  const [customer, settings, summary] = await Promise.all([
    Customer.findById(payment.customer).lean(),
    WebsiteSettings.findOne({ key: "main" }).lean(),
    customerSummary(payment.customer),
  ]);
  if (!customer) throw ApiError.notFound("Customer");
  const project = payment.project as unknown as { name: string; location?: { address?: string } } | null;
  streamReceipt(res, {
    receiptNumber: payment.receiptNumber,
    paidAt: payment.paidAt,
    verifiedAt: payment.verifiedAt,
    amountMinor: payment.amountMinor,
    method: payment.method,
    type: payment.type ?? "installment",
    transactionRef: payment.transactionRef,
    customer: { code: customer.code, fullName: customer.fullName, phone: customer.phone, email: customer.email, address: customer.address },
    project: project ? { name: project.name, address: project.location?.address } : null,
    flat: payment.flat as unknown as { unitNumber: string; floor: number; sizeSqft: number } | null,
    summary,
    company: {
      name: settings?.companyName ?? "Arkhaven Properties Ltd.",
      address: settings?.contact?.address,
      phone: settings?.contact?.phone,
      email: settings?.contact?.email,
    },
  });
}
