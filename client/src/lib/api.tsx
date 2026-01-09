// src/lib/api.tsx
const API = import.meta.env.VITE_API_BASE || "http://72.62.52.200:1002";
export const API_BASE = API;

/** access'ı oku (geri uyumluluk: token da kabul) */
export function getAccess(): string | null {
  return (
    localStorage.getItem("access") ||
    sessionStorage.getItem("access") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")
  );
}

/** access kaydet (remember=true → localStorage, false → sessionStorage) */
// export function saveAccess(token: string, remember = true) {
//   const store = remember ? localStorage : sessionStorage;
//   store.setItem("access", token);
//   store.setItem("token", token); // eski kodlarla uyum
// }

export function saveAccess(token: string, remember = true) {
  const store = remember ? localStorage : sessionStorage;
  store.setItem("access", token);
}

/** Eski kodları kırmamak için alias: getToken = getAccess */
export function getToken(): string | null {
  return getAccess();
}

/** JWT decode (hata almamak için try/catch) */
export function parseJwt(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** JWT geçerli mi? (exp/nbf kontrolü) */
export function isJwtValid(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload) return false;

  const now = Math.floor(Date.now() / 1000);

  // not before
  if (typeof payload.nbf === "number" && now < payload.nbf) return false;

  // expiration
  if (typeof payload.exp === "number" && now >= payload.exp) return false;

  return true;
}

/** sadece user refresh */
export async function refreshUserAccess(): Promise<string | null> {
  const r = await fetch(`${API}/api/auth/user-refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) return null;
  const d = await r.json().catch(() => ({}));
  const access = d?.access || d?.token;
  if (!access) return null;
  saveAccess(access); // mevcut storage’da kalır
  return access as string;
}

/** (genel refresh kalsın ama fallback olarak) */
export async function refreshAccess(): Promise<string | null> {
  const r = await fetch(`${API}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) return null;
  const d = await r.json().catch(() => ({}));
  const access = d?.access || d?.token;
  if (!access) return null;
  saveAccess(access);
  return access as string;
}

/** 401'de bir kez refresh deneyip tekrar istek atan wrapper */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const headers = new Headers(init.headers || {});
  const t = getAccess();
  if (t) headers.set("Authorization", `Bearer ${t}`);

  let res = await fetch(input instanceof URL ? input.toString() : input, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    // 1) user-refresh dene
    const ut = await refreshUserAccess();
    let nt = ut;
    // 2) olmadıysa genel refresh (eski kodları kırmamak için)
    if (!nt) nt = await refreshAccess();

    if (nt) {
      headers.set("Authorization", `Bearer ${nt}`);
      res = await fetch(input instanceof URL ? input.toString() : input, {
        ...init,
        headers,
        credentials: "include",
      });
    }
  }
  return res;
}

/** JSON kısayol fonksiyonu */
export async function api<T = any>(
  path: string,
  opts: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: any } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const body =
    opts.body === undefined || opts.body === null
      ? undefined
      : typeof opts.body === "string"
      ? opts.body
      : JSON.stringify(opts.body);

  const res = await apiFetch(`${API}${path}`, {
    method: opts.method || "GET",
    headers,
    body,
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) throw new Error(data?.error || data?.message || res.statusText);
  if (data?.access && !data?.token) data.token = data.access; // uyumluluk
  return data as T;
}
