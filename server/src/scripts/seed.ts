/**
 * Seeds website content (idempotent). No users, customers or payments are created.
 *   npm run seed            # insert what is missing
 *   npm run seed -- --force # overwrite settings and re-create seeded projects' content
 */
import { connectDB, disconnectDB } from "../config/db";
import { seedContent } from "../services/seedContent";

(async () => {
  try {
    await connectDB();
    const log = await seedContent(process.argv.includes("--force"));
    log.forEach((l) => console.log(l));
    console.log("Seed complete.");
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await disconnectDB().catch(() => undefined);
  }
})();
