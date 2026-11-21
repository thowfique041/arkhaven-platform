import { Schema, model, type InferSchemaType } from "mongoose";
import { FLAT_STATUSES } from "../types";

const flatSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    unitNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
    floor: { type: Number, required: true, min: 0, max: 200 },
    sizeSqft: { type: Number, required: true, min: 1 },
    bedrooms: { type: Number, min: 0, default: 3 },
    bathrooms: { type: Number, min: 0, default: 2 },
    balconies: { type: Number, min: 0, default: 2 },
    facing: { type: String, maxlength: 40 },
    parking: { type: Boolean, default: false },
    priceMinor: { type: Number, required: true, min: 0 }, // poisha (1 BDT = 100)
    status: { type: String, enum: FLAT_STATUSES, default: "available", index: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true },
);

flatSchema.index({ project: 1, unitNumber: 1 }, { unique: true });

export type FlatT = InferSchemaType<typeof flatSchema>;
export const Flat = model("Flat", flatSchema);
