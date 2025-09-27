// src/lib/api.tsx
// Merkez API yardımcıları + Auth uçları
const API = import.meta.env.VITE_API_BASE || "http://localhost:1002";

// Hem eski hem yeni anahtarlarla uyum
const KEYS = ["token", "access"];

// === Token Yardımcıları ===
export function getToken(): string | null {
  for (const k of KEYS) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

function removeAllTokens() {
  for (const k of KEYS) {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  }
}

export function setToken(tok: string | null, remember = true, emit = true) {
  const prev = getToken(); // önceki değer
  if (tok === null) {
    removeAllTokens();
    if (prev && emit) window.dispatchEvent(new Event("auth-changed"));
    return;
  }
  // yaz
  removeAllTokens();
  const store = remember ? localStorage : sessionStorage;
  store.setItem("token", tok); // yeni standart
  store.setItem("access", tok); // geriye dönük uyum
  // değişiklik olduysa event fırlat
  if (tok !== prev && emit) window.dispatchEvent(new Event("auth-changed"));
}

/** Token’ı temizler; emit=false ise auth-changed olayı fırlatmaz. */
export function clearToken(opts?: { emit?: boolean }) {
  const emit = opts?.emit ?? true;
  const had = !!getToken();
  if (!had) {
    // zaten temiz; yeni event fırlatma
    return;
  }
  removeAllTokens();
  if (emit) window.dispatchEvent(new Event("auth-changed"));
}

// === JWT Yardımcıları ===
function base64UrlDecode(s: string): string {
  try {
    const b64 =
      s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
    return atob(b64);
  } catch {
    return "";
  }
}

export function parseJwt<T = any>(token: string): T | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = base64UrlDecode(payload);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** Küçük saat kaymalarına dayanıklı exp kontrolü */
export function isJwtValid(token: string, skewSeconds = 30): boolean {
  const p: any = parseJwt(token);
  const exp = typeof p?.exp === "number" ? p.exp : 0;
  if (!exp) return false;
  const now = Math.floor(Date.now() / 1000) - Math.max(0, skewSeconds);
  return exp > now;
}

// === Genel fetch sarmalayıcı ===
type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: any;
  auth?: boolean;
};

export async function api<T = any>(
  path: string,
  opts: ApiOptions = {}
): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const init: RequestInit = { method, headers, credentials: "include" };

  const t = getToken();
  if (auth && t) headers["Authorization"] = `Bearer ${t}`;
  if (body !== undefined)
    init.body = typeof body === "string" ? body : JSON.stringify(body);

  const res = await fetch(`${API}${path}`, init);
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : undefined;

  if (!res.ok) {
    if (res.status === 401) clearToken({ emit: true });
    throw new Error((data && (data.error || data.message)) || res.statusText);
  }
  return (data as T) ?? ({} as T);
}

// === Auth API ===
export type Me = { id: number; username: string; email: string };

export const AuthApi = {
  register(body: {
    fname?: string;
    sname?: string;
    username: string;
    email: string;
    phone?: string;
    countryDial?: string;
    password: string;
  }) {
    return api("/api/auth/user-register", { method: "POST", body });
  },

  async login(payload: {
    emailOrUsername?: string;
    email?: string;
    username?: string;
    password: string;
    remember?: boolean;
  }) {
    const data = await api<{ token?: string; user?: any }>(
      "/api/auth/user-login",
      { method: "POST", body: payload, auth: false }
    );
    if (data?.token) setToken(data.token, !!payload.remember, true);
    return data;
  },

  // Sunucu: GET /api/account/user-me → doğrudan user objesi döndürüyor
  me() {
    return api<Me>("/api/account/user-me");
  },

  async logout() {
    // Token’ı sil ve olayı biz fırlatalım
    clearToken({ emit: true });
    try {
      await api("/api/auth/user-logout", { method: "POST" });
    } catch {}
  },
};
