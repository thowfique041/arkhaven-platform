import { Schema, model, type InferSchemaType } from "mongoose";

const customerSchema = new Schema(
  {
    code: { type: String, required: true, uppercase: true }, // e.g. AKH-260001
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lead: { type: Schema.Types.ObjectId, ref: "Lead" },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    address: { type: String, maxlength: 300 },
    project: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    flat: { type: Schema.Types.ObjectId, ref: "Flat" },
    bookingDate: Date,
    // Agreed sale price for this customer (may differ from list price after negotiation).
    agreedPriceMinor: { type: Number, min: 0, default: 0 },
    notes: { type: String, maxlength: 4000 },
  },
  { timestamps: true },
);

customerSchema.index({ code: 1 }, { unique: true });
customerSchema.index({ user: 1 }, { unique: true });
customerSchema.index({ flat: 1 }, { unique: true, sparse: true });

export type CustomerT = InferSchemaType<typeof customerSchema>;
export const Customer = model("Customer", customerSchema);
