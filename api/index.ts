/**
 * Vercel serverless entry. Every /api/* request is rewritten here (see vercel.json)
 * and handled by the same Express app used in local development.
 */
import { createApp } from "../server/src/app";

const app = createApp();
export default app;
