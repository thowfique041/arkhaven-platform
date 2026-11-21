import mongoose from "mongoose";
import { env } from "./env";

/**
 * Connection is cached on the global object so serverless invocations
 * (Vercel) reuse one connection per warm instance.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = g.__mongoose ?? (g.__mongoose = { conn: null, promise: null });

mongoose.set("strictQuery", true);

export async function connectDB(uri = env.MONGODB_URI): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 10 })
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}
