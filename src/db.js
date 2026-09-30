// Data layer — tutto su Netlify (Functions + Blobs). Nessun servizio esterno.
// L'accesso è protetto da un token firmato ottenuto con la password condivisa.

const TOKEN_KEY = "ia_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function api(path, opts = {}) {
  const token = getToken();
  const res = await fetch(path, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: "Bearer " + token } : {}),
      ...(opts.headers || {}),
    },
  });
  // 401 dalla funzione /data = token della IA Suite non valido → login.
  // 401 da altri endpoint (es. extract) può arrivare per errori API esterni
  // e NON deve forzare il logout.
  if (res.status === 401 && path.includes("/data")) {
    clearToken(); location.reload();
    throw new Error("Sessione scaduta");
  }
  return res;
}

export async function login(password) {
  const res = await fetch("/.netlify/functions/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Accesso non riuscito");
  setToken(data.token);
  return true;
}

const dataUrl = (key) => "/.netlify/functions/data?key=" + encodeURIComponent(key);

export async function kvGet(key, def) {
  const res = await api(dataUrl(key));
  const data = await res.json();
  return data.value != null ? data.value : def;
}

export async function kvSet(key, value) {
  await api(dataUrl(key), { method: "PUT", body: JSON.stringify({ value }) });
  return true;
}

export async function kvDelete(key) {
  await api(dataUrl(key), { method: "DELETE" });
  return true;
}

export async function extractDoc(kind, payload) {
  const res = await api("/.netlify/functions/extract", { method: "POST", body: JSON.stringify({ kind, ...payload }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Estrazione non riuscita");
  return data.text;
}
