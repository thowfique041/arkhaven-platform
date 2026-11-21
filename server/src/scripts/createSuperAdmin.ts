/**
 * Creates (or promotes) the first Super Admin.
 *
 *   SUPERADMIN_EMAIL=you@company.com SUPERADMIN_NAME="Your Name" npm run create-super-admin
 *
 * The password is read from SUPERADMIN_PASSWORD if set, otherwise prompted for (input hidden).
 * Nothing is printed or written to disk except the account email.
 */
import readline from "readline";
import { connectDB, disconnectDB } from "../config/db";
import { User } from "../models";
import { hashPassword } from "../services/credentials";

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
      out._writeToOutput = (s: string) => {
        if (s.includes(question)) out.output.write(s);
        else out.output.write("*");
      };
    }
    rl.question(question, (a) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(a.trim());
    });
  });
}

async function main() {
  const email = (process.env.SUPERADMIN_EMAIL || (await ask("Super Admin email: "))).toLowerCase();
  const name = process.env.SUPERADMIN_NAME || (await ask("Full name: "));
  let password = process.env.SUPERADMIN_PASSWORD || "";
  if (!password) {
    password = await ask("Password (min 12 chars): ", true);
    const confirm = await ask("Confirm password: ", true);
    if (password !== confirm) throw new Error("Passwords do not match");
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Invalid email");
  if (password.length < 12 || !/\d/.test(password) || !/[A-Za-z]/.test(password)) {
    throw new Error("Password must be at least 12 characters and contain letters and numbers");
  }

  await connectDB();
  const existing = await User.findOne({ email }).select("+tokenVersion");
  if (existing) {
    existing.role = "superadmin";
    existing.isActive = true;
    existing.passwordHash = await hashPassword(password);
    existing.mustChangePassword = false;
    existing.tokenVersion = (existing.tokenVersion ?? 0) + 1;
    await existing.save();
    console.log(`Updated existing account ${email} to Super Admin.`);
  } else {
    await User.create({ name, email, username: email, role: "superadmin", passwordHash: await hashPassword(password) });
    console.log(`Created Super Admin ${email}.`);
  }
  await disconnectDB();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await disconnectDB().catch(() => undefined);
  process.exit(1);
});
