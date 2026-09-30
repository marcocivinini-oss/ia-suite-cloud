import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 giorni

const secret = () => process.env.AUTH_SECRET || "";

function sign(payload) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function makeToken() {
  const exp = String(Date.now() + TTL_MS);
  return exp + "." + sign(exp);
}

export function verifyToken(token) {
  if (!token || !secret()) return false;
  const [exp, sig] = String(token).split(".");
  if (!exp || !sig) return false;
  const expected = sign(exp);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(exp) > Date.now();
}

export function bearer(event) {
  const h = event.headers?.authorization || event.headers?.Authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}

export function json(statusCode, obj) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) };
}
