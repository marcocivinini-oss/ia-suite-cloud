import { makeToken, json } from "./lib/auth.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!process.env.APP_PASSWORD || !process.env.AUTH_SECRET) {
    return json(500, { error: "Configurazione mancante: imposta APP_PASSWORD e AUTH_SECRET" });
  }
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Richiesta non valida" }); }
  if (String(body.password || "") !== String(process.env.APP_PASSWORD)) {
    return json(401, { error: "Password non corretta" });
  }
  return json(200, { token: makeToken() });
};
