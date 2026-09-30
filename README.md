# IA Suite — Fatturazione & Riconciliazione

Gestionale interno per contratti, fatturazione, scadenze e riconciliazione bancaria.
**Tutto su Netlify**, nessun altro servizio: hosting + Functions + Netlify Blobs (dati). Accesso con **password condivisa**, uguale per i due soci.

## Cosa fa
- Contratti con **retainer ricorrenti** e **compensi a evento** (firma, milestone, closing…), estratti dai PDF/Word.
- **Fatture da emettere** (pianificate dai contratti) e import elenco **ATTIVA**.
- **Fatture da ricevere**: import elenco **PASSIVA** e da PDF fornitori.
- **Scadenze manuali** (F24, IVA, contributi…).
- Import **estratto conto CSV Banco BPM** e **riconciliazione** incassi/pagamenti.
- **Cruscotto a finestra mobile** (ancorato a oggi): aggregati attivo/passivo, proiezione di cassa a 6 mesi e calendario scadenze.

---

## 1) Requisiti
- Node.js 18+
- Un account [Netlify](https://netlify.com)
- Netlify CLI: `npm i -g netlify-cli`
- Una API key Anthropic (per l'estrazione automatica dai PDF)

## 2) Variabili d'ambiente
Copia `.env.example` in `.env` e compila:
```
APP_PASSWORD=...     # la password condivisa per accedere all'app
AUTH_SECRET=...      # stringa lunga e casuale (firma i token di sessione)
ANTHROPIC_API_KEY=...# solo lato server, per l'estrazione PDF
ANTHROPIC_MODEL=claude-sonnet-5   # opzionale
```
Genera un buon `AUTH_SECRET`, ad es.: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 3) Avvio locale
```
npm install
netlify link      # collega la cartella al sito Netlify (serve per i Blobs)
netlify dev
```
Apri l'URL indicato (di norma http://localhost:8888). `netlify dev` avvia insieme il frontend, le Functions e l'archivio Blobs locale.
> `npm run dev` avvia solo Vite: senza Functions non funzionano né l'accesso né l'estrazione. Usa `netlify dev`.

## 4) Deploy su Netlify
1. Metti il progetto su un repo Git e collegalo a Netlify (**Add new site → Import**), oppure `netlify deploy --build --prod`.
2. Netlify legge `netlify.toml` (build `npm run build`, publish `dist`, functions in `netlify/functions`).
3. In **Site configuration → Environment variables** inserisci `APP_PASSWORD`, `AUTH_SECRET`, `ANTHROPIC_API_KEY` (e opzionale `ANTHROPIC_MODEL`).
4. Deploy. I Netlify Blobs si attivano da soli, senza configurazione.

---

## Cambiare la password
Aggiorna la variabile `APP_PASSWORD` in **Site configuration → Environment variables** e rilancia un deploy. La nuova password vale per entrambi.

## Note di funzionamento
- **Dati**: ogni collezione (contratti, fatture, movimenti, scadenze) è un documento JSON in **Netlify Blobs** (store `ia-suite`), condiviso tra i due soci. Le Functions leggono/scrivono i Blobs; il browser non accede mai direttamente ai dati.
- **Accesso**: la Function `login` verifica la password e rilascia un token firmato (HMAC, valido 30 giorni) salvato nel browser; ogni chiamata ai dati e all'estrazione lo richiede.
- **Termini di pagamento**: se una fattura importata non ha scadenza, la proiezione stima **30 giorni** dalla data documento. Valore nelle costanti `RECV_DAYS` / `PAY_DAYS` in `src/App.jsx`.
- **Estrazione PDF**: gira nella Function `extract` (chiave API mai esposta). Word convertito in testo lato client; CSV/Excel banca e ATTIVA/PASSIVA letti lato client.

## Struttura
```
netlify/functions/login.js     accesso: verifica password → token
netlify/functions/data.js      dati: CRUD su Netlify Blobs (protetto da token)
netlify/functions/extract.js   estrazione PDF/Word con Claude (protetto da token)
netlify/functions/lib/auth.js  firma/verifica token condiviso
src/App.jsx                    applicazione (schermate + logica)
src/db.js                      accesso dati + login verso le Functions
src/main.jsx                   entry React
netlify.toml, vite.config.js   build e hosting
```
