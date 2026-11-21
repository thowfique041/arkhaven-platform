import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { api } from "./routes";
import { apiLimiter, errorHandler, notFound } from "./middlewares/common";
import "./types";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // behind Vercel / reverse proxy: needed for correct client IPs in rate limiting

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin(origin, cb) {
        // Same-origin requests and server-to-server calls have no Origin header.
        if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => res.json({ success: true, data: { status: "ok", time: new Date().toISOString() } }));

  // Ensure a DB connection before any API work (cached across serverless invocations).
  app.use("/api", async (_req, _res, next) => {
    try {
      await connectDB();
      next();
    } catch (e) {
      next(e);
    }
  });
  app.use("/api", apiLimiter, api);
  app.use("/api", notFound);
  app.use(errorHandler);
  return app;
}
