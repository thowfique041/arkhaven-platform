import { Schema, model, type InferSchemaType } from "mongoose";
import { PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_TYPES } from "../types";

const auditSchema = new Schema(
  {
    action: { type: String, required: true }, // created | updated | verified | rejected | reopened
    by: { type: Schema.Types.ObjectId, ref: "User" },
    byName: String,
    note: String,
    changes: Schema.Types.Mixed,
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const paymentSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    flat: { type: Schema.Types.ObjectId, ref: "Flat" },
    amountMinor: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: "amountMinor must be an integer (poisha)" },
    },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    type: { type: String, enum: PAYMENT_TYPES, default: "installment" },
    transactionRef: { type: String, trim: true, maxlength: 80 },
    // Always set. method+ref for referenced payments, otherwise a random id.
    // A unique index on it blocks double entry of the same bank/MFS transaction.
    dedupeKey: { type: String, required: true },
    paidAt: { type: Date, required: true, index: true },
    status: { type: String, enum: PAYMENT_STATUSES, default: "pending", index: true },
    receiptNumber: { type: String },
    note: { type: String, maxlength: 1000 },
    attachment: { url: String, publicId: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
    rejectionReason: String,
    audit: [auditSchema],
  },
  { timestamps: true },
);

paymentSchema.index({ dedupeKey: 1 }, { unique: true });
paymentSchema.index({ receiptNumber: 1 }, { unique: true, sparse: true });

export type PaymentT = InferSchemaType<typeof paymentSchema>;
export const Payment = model("Payment", paymentSchema);
