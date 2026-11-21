import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { configError, env } from "./config/env";
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

  app.get("/api/health", (_req, res) =>
    res.status(configError ? 503 : 200).json({
      success: !configError,
      data: { status: configError ? "misconfigured" : "ok", time: new Date().toISOString(), uploads: env.cloudinaryEnabled ? "cloudinary" : "disabled" },
      ...(configError ? { error: { code: "SERVER_NOT_CONFIGURED", message: configError } } : {}),
    }),
  );

  app.use("/api", (_req, res, next) => {
    if (!configError) return next();
    res.status(503).json({ success: false, error: { code: "SERVER_NOT_CONFIGURED", message: "The server is not fully configured yet. An administrator needs to set its environment variables." } });
  });

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
