import { Schema, model, type InferSchemaType } from "mongoose";
import { CONSTRUCTION_STAGES } from "../types";

const stageSchema = new Schema(
  {
    key: { type: Number, required: true }, // index into CONSTRUCTION_STAGES
    name: { type: String, required: true },
    status: { type: String, enum: ["pending", "in_progress", "completed"], default: "pending" },
    startedAt: Date,
    completedAt: Date,
    note: String,
  },
  { _id: false },
);

const updateSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, maxlength: 4000 },
    stageKey: Number,
    percent: Number,
    photos: [{ url: String, publicId: String, caption: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const progressSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    currentStage: { type: Number, default: 0, min: 0, max: CONSTRUCTION_STAGES.length - 1 },
    percent: { type: Number, default: 0, min: 0, max: 100 },
    stages: [stageSchema],
    expectedHandover: Date,
    updates: [updateSchema],
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

progressSchema.index({ project: 1 }, { unique: true });

export function defaultStages() {
  return CONSTRUCTION_STAGES.map((name, key) => ({ key, name, status: key === 0 ? "completed" : "pending" }));
}

export type ProgressT = InferSchemaType<typeof progressSchema>;
export const ConstructionProgress = model("ConstructionProgress", progressSchema);
