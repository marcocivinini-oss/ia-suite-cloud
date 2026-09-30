// Netlify Function: estrazione dati da documenti tramite Claude.
// Gira lato server: la ANTHROPIC_API_KEY non è mai esposta al browser.
import { verifyToken, bearer, json } from "./lib/auth.js";

const PROMPTS = {
  contract: `Sei un assistente che estrae dati da un contratto di consulenza. Rispondi SOLO con un oggetto JSON valido, senza testo o backtick, con i campi: client (ragione sociale del cliente), currency ("EUR" o "USD"), startDate (YYYY-MM-DD o null), endDate (YYYY-MM-DD o null), paymentTermsDays (giorni per il pagamento come numero, null se non chiaro), vatExempt (true se il cliente è in esenzione IVA — es. cliente estero, non imponibile art. 7-ter/art. 8, reverse charge; altrimenti false), vatRate (aliquota IVA numerica quando indicata, null se non specificata o se vatExempt=true), notes (nota breve max 160 caratteri), billingItems (array delle componenti di compenso). Ogni elemento di billingItems ha: type — usa "recurring" per retainer o canoni periodici ricorrenti, "one_shot" per un compenso UNICO da fatturare una sola volta (es. fee fissa forfettaria per un progetto o consulenza spot), "trigger" per importi attivati da un evento specifico (firma, kickoff, milestone, closing, success fee) — label (descrizione breve della voce), amount (importo netto come numero), triggerLabel (solo per type "trigger": l'evento che lo attiva; null altrimenti), date (solo per type "one_shot": data prevista di fatturazione YYYY-MM-DD; null altrimenti). Se il contratto prevede solo un retainer mensile, restituisci un unico elemento con type "recurring". Usa null dove un dato non è presente.`,
  expense: `Estrai il totale da un foglio spese di viaggio. Rispondi SOLO con JSON valido: description (breve, es. "Trasferta Milano-Roma"), amount (totale come numero), currency ("EUR"/"USD"), date (YYYY-MM-DD o null).`,
  invoice: `Estrai i dati da una fattura fornitore. Rispondi SOLO con un oggetto JSON valido, senza testo o backtick, con i campi:
- supplier: ragione sociale del fornitore
- supplierCountry: codice paese ISO-2 del fornitore (es. "IT", "US", "GB", "DE", "CH", "FR"), null se non chiaro
- number: numero fattura (stringa)
- date: data emissione YYYY-MM-DD, null se non chiara
- dueDate: data scadenza pagamento YYYY-MM-DD, null se non presente
- amount: totale documento come numero (SEMPRE positivo, anche per note di credito — usa il campo isCreditNote per distinguerle)
- currency: codice valuta ISO-4217 (es. "EUR", "USD", "GBP", "CHF", "JPY", "SEK", "NOK", "DKK", "PLN", "CAD", "AUD"). Cerca il simbolo (€ $ £ ¥ CHF Fr. kr zł) o codice esplicito nel documento — NON dare per scontato "EUR"
- isCreditNote: true se il documento è una nota di credito / credit note / Gutschrift / NC / TD04, false se è una fattura normale
- vatExempt: true se il documento non presenta IVA/VAT/tax (tipico per fatture UE B2B in reverse charge, fatture extra-UE, fatture US/UK verso l'estero, o italiane non imponibili art. 7-ter/art. 8/art. 41); false se l'IVA è addebitata
- vatRate: aliquota IVA numerica se addebitata (es. 22 per Italia, 19 per Germania, 20 per UK, 7.7 per CH), null se vatExempt=true o non trovata
- category: categoria di spesa più adatta scelta tra "Consulenze", "Viaggi", "Uffici", "Utenze", "Software", "Compensi amministratori", "Altro" (usa "Altro" se non riesci a determinarla)
- notes: eventuale nota breve (max 100 caratteri) sul motivo dell'esenzione IVA o sulla natura del documento`,
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!verifyToken(bearer(event))) return json(401, { error: "Non autorizzato" });
  if (!process.env.ANTHROPIC_API_KEY) return json(500, { error: "ANTHROPIC_API_KEY non configurata" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON non valido" }); }

  const { kind, pdfB64, text } = body;
  const prompt = PROMPTS[kind];
  if (!prompt) return json(400, { error: "kind non valido" });

  const content = pdfB64
    ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfB64 } }, { type: "text", text: prompt }]
    : [{ type: "text", text: prompt + "\n\n--- TESTO DOCUMENTO ---\n" + String(text || "").slice(0, 12000) }];

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
        max_tokens: 1000,
        messages: [{ role: "user", content }],
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      // Non inoltriamo mai lo status code di Anthropic al browser:
      // altrimenti un 401 dell'API Anthropic verrebbe interpretato dal
      // frontend come "sessione IA Suite scaduta" e forzerebbe il logout.
      const msg = data?.error?.message || `Errore API (${r.status})`;
      return json(502, { error: msg });
    }
    const out = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    return json(200, { text: out });
  } catch (e) {
    return json(500, { error: String(e.message || e) });
  }
};
