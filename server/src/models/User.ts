import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { ROLES } from "../types";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Staff log in with email; customers with a generated username (email optional for them).
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    username: { type: String, required: true, trim: true, lowercase: true, maxlength: 60 },
    phone: { type: String, trim: true, maxlength: 30 },
    role: { type: String, enum: ROLES, required: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    // Incremented on password reset / deactivation so existing JWTs stop working.
    tokenVersion: { type: Number, default: 0 },
    customer: { type: Schema.Types.ObjectId, ref: "Customer" },
    lastLoginAt: Date,
    notificationPrefs: {
      newLeadEmail: { type: Boolean, default: true },
      paymentSubmitted: { type: Boolean, default: true },
      followUpReminders: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });

userSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    delete ret.tokenVersion;
    delete ret.__v;
    return ret;
  },
});

export type UserT = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserT>;
export const User = model("User", userSchema);
