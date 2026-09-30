// Lingua e impostazioni per società.
// La stessa app serve due installazioni: IA S.r.l. (italiano, EUR) e IA Inc. (inglese, USD).
// L'installazione si riconosce dall'indirizzo: inc-suite.… → Inc.
// In locale si può forzare con ?entity=inc per le prove.
import EN from "./en.json";

const forced = typeof location !== "undefined" ? new URLSearchParams(location.search).get("entity") : null;
export const ENTITY = forced === "inc" || forced === "srl"
  ? forced
  : (typeof location !== "undefined" && location.hostname.startsWith("inc-") ? "inc" : "srl");

export const IS_INC = ENTITY === "inc";
export const HOME_CUR = IS_INC ? "USD" : "EUR";

// Traduzione: usata automaticamente dal build (vedi vite.config.js) su tutti i testi di App.jsx.
export function __t(s) {
  if (!IS_INC || typeof s !== "string") return s;
  const core = s.trim();
  const tr = EN[core];
  if (tr == null) return s;
  const lead = s.slice(0, s.length - s.trimStart().length);
  const trail = s.slice(s.trimEnd().length);
  return lead + tr + trail;
}
