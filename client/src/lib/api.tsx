export const API_BASE: string =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:1002";

/** Eski projelerde kullanılan local/session storage anahtarları */
const LEGACY_KEYS = ["access", "token"] as const;

/** Backward-compat: storage’tan token oku (cookie akışında null dönebilir) */
export function getToken(): string | null {
  for (const k of LEGACY_KEYS) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

/** Backward-compat: token yaz (sadece eski kodlar için; cookie akışında şart değil) */
export function setToken(token: string, opts?: { remember?: boolean }) {
  try {
    if (opts?.remember) localStorage.setItem("access", token);
    else sessionStorage.setItem("access", token);
  } catch {}
}

/** Backward-compat: token sil + opsiyonel event yayınla */
export function clearToken(opts?: { emit?: boolean }) {
  try {
    for (const k of LEGACY_KEYS) {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    }
    if (opts?.emit) {
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }
  } catch {}
}

/** Basit JWT decode (doğrulama yapmaz, sadece exp okur) */
function decodeJwt<T = any>(jwt?: string | null): T | null {
  if (!jwt) return null;
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    try {
      return JSON.parse(atob(parts[1]));
    } catch {
      return null;
    }
  }
}

/** Backward-compat: eldeki JWT geçerli mi? (cookie akışında hep false olabilir) */
export function isJwtValid(token?: string | null): boolean {
  const t = token ?? getToken();
  const payload: any = decodeJwt(t);
  if (!payload || typeof payload.exp !== "number") return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
}

/** İç: refresh çağrısı (cookie akışında access’ı yeniler) */
async function tryRefresh(): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!r.ok) return false;

    // Bazı backend’ler yeni token da döndürebilir:
    try {
      const d = await r.json();
      if (d?.token) setToken(d.token, { remember: true });
    } catch {}
    return true;
  } catch {
    return false;
  }
}

/** Genel fetch – 401’de bir kez refresh dener ve isteği yeniden yapar. */
export async function apiFetch(
  input: string,
  init: RequestInit & { retry?: boolean } = {}
) {
  const url = input.startsWith("http") ? input : `${API_BASE}${input}`;
  const res = await fetch(url, {
    credentials: "include",
    ...init,
  });

  // 401 değilse veya zaten retry yapmışsak direkt dön
  if (res.status !== 401 || init.retry) return res;

  // 401 → refresh dene
  const ok = await tryRefresh();
  if (!ok) return res;

  // yenilendiyse isteği bir kez daha dene
  return fetch(url, {
    credentials: "include",
    ...init,
    retry: true,
  } as any);
}

/** Eski kodlar için: JSON gövde/başlık sarmalayıcı */
export async function api<T = any>(
  path: string,
  opts: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    auth?: boolean; // legacy: Authorization ekle (cookie akışında gereksiz)
  } = {}
): Promise<T> {
  const headers = new Headers(opts.headers || {});
  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  // Legacy destek: istenirse Authorization ekle
  if (opts.auth) {
    const t = getToken();
    if (t) headers.set("Authorization", `Bearer ${t}`);
  }

  const res = await apiFetch(path, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as T) : ({} as T);
  if (!res.ok) {
    const err = (data as any)?.error || res.statusText || "İstek başarısız";
    throw new Error(err);
  }
  return data;
}

/** Sunucunun döndürdüğü kullanıcı tipi */
export type Me = {
  id: number;
  username: string;
  email: string;
  role?: "admin" | "editor" | "user";
  is_active?: 0 | 1;
  create_at?: string; // DATETIME
};

/** Auth uçları – hem cookie hem legacy token akışı ile uyumlu */
export const AuthApi = {
  /** Login – cookie akışında çerez set edilir; token dönerse kaydederiz. */
  async login(payload: {
    emailOrUsername?: string;
    email?: string;
    username?: string;
    password: string;
    remember?: boolean;
  }): Promise<{ user?: Me }> {
    // Yeni akış
    const r = await apiFetch(`/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Eski backend adlarını da deneyelim (geriye dönük destek)
    if (r.status === 404) {
      try {
        const d = await api(`/api/auth/user-login`, {
          method: "POST",
          body: payload,
          auth: false,
        });
        // legacy token dönebilir
        const token = (d as any)?.token;
        if (token) setToken(token, { remember: !!payload.remember });
        return { user: (d as any)?.user };
      } catch (e: any) {
        throw new Error(e?.message || "Giriş başarısız");
      }
    }

    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body?.error || "Giriş başarısız");

    // token dönerse (bazı sürümler) saklayalım:
    if (body?.token) setToken(body.token, { remember: !!payload.remember });

    return { user: body?.user };
  },

  /** Çıkış – çerezleri server temizler; local token’ı da silelim */
  async logout(): Promise<void> {
    clearToken({ emit: true });
    try {
      await apiFetch(`/api/auth/logout`, { method: "POST" });
    } catch {}
  },

  /** Ben kimim? – yoksa null */
  async me(): Promise<Me | null> {
    // Yeni akış
    let r = await apiFetch(`/api/auth/me`);
    if (r.status === 401) {
      // legacy route
      try {
        const d = await api<Me>(`/api/account/user-me`);
        return d;
      } catch {
        return null;
      }
    }
    if (!r.ok) return null;
    const d = await r.json().catch(() => null);
    return d?.user ?? null;
  },
};

// kullanici kayit
export const CustomersApi = {
  async register(payload: {
    username: string;
    email: string;
    password: string;
    fname?: string;
    sname?: string;
    country_dial?: string;
    phone?: string;
  }): Promise<{
    ok: boolean;
    customer?: { id: number; username: string; email: string };
  }> {
    return api(`/api/customers/register`, {
      method: "POST",
      body: payload,
    });
  },
};
