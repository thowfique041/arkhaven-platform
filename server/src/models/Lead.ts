import { Schema, model, type InferSchemaType } from "mongoose";
import { LEAD_SOURCES, LEAD_STATUSES } from "../types";

const historySchema = new Schema(
  {
    type: { type: String, enum: ["created", "status", "note", "follow_up", "updated", "converted", "account"], required: true },
    from: String,
    to: String,
    note: { type: String, maxlength: 2000 },
    by: { type: Schema.Types.ObjectId, ref: "User" },
    byName: String,
    at: { type: Date, default: Date.now },
  },
  { _id: true },
);

const leadSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    address: { type: String, maxlength: 300 },
    interestedProject: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    interestedFlat: { type: Schema.Types.ObjectId, ref: "Flat" },
    budgetMinor: { type: Number, min: 0 },
    source: { type: String, enum: LEAD_SOURCES, default: "other", index: true },
    status: { type: String, enum: LEAD_STATUSES, default: "new", index: true },
    notes: { type: String, maxlength: 4000 },
    followUpDate: { type: Date, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    customer: { type: Schema.Types.ObjectId, ref: "Customer" },
    inquiry: { type: Schema.Types.ObjectId, ref: "Inquiry" },
    history: [historySchema],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ phone: 1 });

export type LeadT = InferSchemaType<typeof leadSchema>;
export const Lead = model("Lead", leadSchema);
