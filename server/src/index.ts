import { createApp } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

async function main() {
  await connectDB();
  const app = createApp();
  app.listen(env.PORT, () => console.log(`Arkhaven API listening on http://localhost:${env.PORT}`));
}

main().catch((e) => {
  console.error("Failed to start server", e);
  process.exit(1);
});
