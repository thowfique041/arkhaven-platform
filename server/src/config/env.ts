import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGINS: z.string().default("http://localhost:5173"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  BOOTSTRAP_TOKEN: z.string().optional().default(""),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  CLOUDINARY_FOLDER: z.string().optional().default("arkhaven"),
});

const parsed = schema.safeParse(process.env);
/**
 * Missing/invalid configuration does not crash the process (that would hide the reason
 * behind a generic platform error). Instead every API call except /api/health answers
 * 503 with this message, and no request is served with an unsafe default.
 */
export const configError = parsed.success
  ? null
  : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
if (configError) console.error(`Invalid environment configuration: ${configError}`);
const data = parsed.success ? parsed.data : schema.partial().parse({}) as z.infer<typeof schema>;

export const env = {
  ...data,
  isProd: data.NODE_ENV === "production",
  clientOrigins: (data.CLIENT_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  cloudinaryEnabled: Boolean(
    data.CLOUDINARY_CLOUD_NAME && data.CLOUDINARY_API_KEY && data.CLOUDINARY_API_SECRET,
  ),
};
