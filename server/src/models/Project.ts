import { Schema, model, type InferSchemaType } from "mongoose";
import { PROJECT_STATUSES, PROJECT_TYPES } from "../types";

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    caption: { type: String, maxlength: 200 },
  },
  { _id: true },
);

const floorPlanSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 120 },
    sizeSqft: Number,
    bedrooms: Number,
    bathrooms: Number,
    image: imageSchema,
  },
  { _id: true },
);

const faqSchema = new Schema({ q: { type: String, required: true }, a: { type: String, required: true } }, { _id: true });

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    tagline: { type: String, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 8000 },
    type: { type: String, enum: PROJECT_TYPES, default: "residential", index: true },
    status: { type: String, enum: PROJECT_STATUSES, default: "upcoming", index: true },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    location: {
      address: { type: String, maxlength: 300 },
      area: { type: String, maxlength: 80, index: true },
      city: { type: String, maxlength: 80, default: "Dhaka" },
      lat: Number,
      lng: Number,
      mapEmbedUrl: { type: String, maxlength: 1000 },
    },
    coverImage: imageSchema,
    gallery: [imageSchema],
    floorPlans: [floorPlanSchema],
    amenities: [{ type: String, maxlength: 80 }],
    facilities: [{ type: String, maxlength: 80 }],
    specs: {
      landArea: String,
      totalFloors: { type: Number, min: 0, max: 200 },
      floorsLabel: String, // e.g. "G+9"
      unitsPerFloor: Number,
      parking: String,
      frontRoad: String,
      structure: String,
      typicalSizeSqft: String,
      bedrooms: Number,
      bathrooms: Number,
    },
    construction: {
      contractor: String,
      architect: String,
      engineer: String,
      startedAt: Date,
      foundation: String,
      materials: String,
    },
    priceFromMinor: { type: Number, min: 0 }, // optional public "from" price in poisha
    expectedCompletion: Date,
    faqs: [faqSchema],
  },
  { timestamps: true },
);

projectSchema.index({ slug: 1 }, { unique: true });
projectSchema.index({ featured: 1, sortOrder: 1 });

export type ProjectT = InferSchemaType<typeof projectSchema>;
export const Project = model("Project", projectSchema);
