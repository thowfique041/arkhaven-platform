import bcrypt from "bcrypt";
import crypto from "crypto";
import { env } from "../config/env";

// No look-alike characters (0/O, 1/l/I) so customers can read it off paper.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generatePassword(length = 12): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  // Guarantee at least one digit, one uppercase and one lowercase, at random positions.
  const chars = out.split("");
  const pick = (set: string) => set[crypto.randomInt(set.length)];
  const slots = new Set<number>();
  while (slots.size < 3) slots.add(crypto.randomInt(length));
  const [a, b, c] = [...slots];
  chars[a] = pick("23456789");
  chars[b] = pick("ABCDEFGHJKMNPQRSTUVWXYZ");
  chars[c] = pick("abcdefghjkmnpqrstuvwxyz");
  return chars.join("");
}

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, env.BCRYPT_ROUNDS);
}

export function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

/** A real hash at the configured cost, used to equalize timing when the user does not exist. */
let dummy: Promise<string> | null = null;
export function dummyHash(): Promise<string> {
  if (!dummy) dummy = bcrypt.hash(crypto.randomBytes(16).toString("hex"), env.BCRYPT_ROUNDS);
  return dummy;
}
