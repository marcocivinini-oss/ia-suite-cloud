// Netlify Function v2 (Web Fetch style): il runtime moderno configura
// automaticamente l'accesso a Netlify Blobs senza bisogno di connectLambda.
import { getStore } from "@netlify/blobs";
import { verifyToken, json } from "./lib/auth.js";

const STORE = "ia-suite";

const respond = (statusCode, obj) =>
  new Response(JSON.stringify(obj), { status: statusCode, headers: { "content-type": "application/json" } });

export default async (req) => {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!verifyToken(token)) return respond(401, { error: "Non autorizzato" });

  const key = new URL(req.url).searchParams.get("key");
  if (!key) return respond(400, { error: "Parametro 'key' mancante" });

  try {
    const store = getStore(STORE);
    if (req.method === "GET") {
      const value = await store.get(key, { type: "json" });
      return respond(200, { value: value ?? null });
    }
    if (req.method === "PUT") {
      const body = await req.json().catch(() => ({}));
      await store.setJSON(key, body.value);
      return respond(200, { ok: true });
    }
    if (req.method === "DELETE") {
      await store.delete(key);
      return respond(200, { ok: true });
    }
    return respond(405, { error: "Method not allowed" });
  } catch (e) {
    console.error("data function error:", e);
    return respond(500, { error: String(e.message || e) });
  }
};
