import { createHash } from "node:crypto";

export const SESSION_COOKIE = "what_admin_session";

export function createSessionToken() {
  const email = process.env.ADMIN_EMAIL ?? "";
  const secret = process.env.AUTH_SECRET ?? "";
  return createHash("sha256").update(`${email}:${secret}`).digest("hex");
}
