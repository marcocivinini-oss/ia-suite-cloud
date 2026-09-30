# IA Suite — Fatturazione & Riconciliazione (Cloudflare)

Gestionale interno: contratti, fatture attive e passive, scadenze, banca e riconciliazione, conto economico, CRM.

- Frontend: React + Vite (cartella `src`), compilato in `dist`.
- Server: Cloudflare Worker (`worker/index.js`) con dati su R2 ed estrazione documenti tramite Claude.
- Accesso: Cloudflare Access (portale IA Advisors Hub), nessuna password nell'app.

## Installazioni

| Società | Configurazione | Indirizzo | Spazio dati R2 |
|---|---|---|---|
| IA International Advisors S.r.l. | `wrangler.srl.jsonc` | srl-suite.ia-advisors-hub.com | `ia-suite-srl-data` |

## Pubblicazione (Cloudflare, collegato a GitHub)
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy -c wrangler.srl.jsonc`
- Secret da impostare nel Worker: `ANTHROPIC_API_KEY`

## Backup
Impostazioni → Backup dei dati: scarica o ripristina un file JSON con tutti gli archivi.

## Installazione IA International Advisors Inc.
- Configurazione `wrangler.inc.jsonc`, indirizzo inc-suite.ia-advisors-hub.com, spazio dati R2 `ia-suite-inc-data`.
- Deploy command: `npx wrangler deploy -c wrangler.inc.jsonc`.
- L'installazione si riconosce dall'indirizzo (`inc-suite.…` = Inc.): interfaccia in inglese e in USD,
  import estratti conto Chase (PDF o CSV) e fatture emesse da Word/Excel/PDF.
- Testi inglesi nel dizionario `src/en.json` (italiano → inglese), applicato in automatico dal build.
- Prova locale della versione Inc.: aggiungi `?entity=inc` all'indirizzo.
 
