const ENDPOINT = {
  // Admin
  adminLogin: "/api/auth/login",
  adminMe: "/api/auth/me",
  adminRefresh: "/api/auth/refresh",
  adminLogout: "/api/auth/logout",

  // User (customers)
  userRegister: "/api/customers/register",
  userLogin: "/api/customers/login",
  userMe: "/api/customers/user-me",
  userProfile: "/api/customers/profile",
  userLogout: "/api/customers/logout",
} as const;

export const API_BASE: string =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:1002";

/** Eski projelerde kullanılan local/session storage anahtarları */
const LEGACY_KEYS = ["access", "token"] as const;

export const AdminApi = {
  async login(payload: {
    emailOrUsername?: string;
    email?: string;
    username?: string;
    password: string;
    remember?: boolean;
  }): Promise<{ user?: Me }> {
    const r = await apiFetch(ENDPOINT.adminLogin, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body?.error || "Giriş başarısız");
    // admin akışında token beklemiyoruz (httpOnly cookie)
    return { user: body?.user };
  },

  async me(): Promise<Me | null> {
    const r = await apiFetch(ENDPOINT.adminMe);
    if (!r.ok) return null;
    const d = await r.json().catch(() => null);
    return d?.user ?? null;
  },

  async refresh(): Promise<boolean> {
    try {
      const r = await apiFetch(ENDPOINT.adminRefresh, { method: "POST" });
      if (!r.ok) return false;
      const d = await r.json().catch(() => ({}));
      if (d?.token) setToken(d.token, { remember: true });
      return true;
    } catch {
      return false;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiFetch(ENDPOINT.adminLogout, { method: "POST" });
    } catch {}
  },
};

// --- USER API (customers) ---
export const UserApi = {
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
    return api(ENDPOINT.userRegister, { method: "POST", body: payload });
  },

  async login(payload: {
    emailOrUsername?: string;
    email?: string;
    username?: string;
    password: string;
    remember?: boolean;
  }): Promise<{ token?: string; user?: Me }> {
    const r = await apiFetch(ENDPOINT.userLogin, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body?.error || "Giriş başarısız");

    // user akışında token dönebilir → storage'a yaz
    if (body?.token) setToken(body.token, { remember: !!payload.remember });
    return { token: body?.token, user: body?.user };
  },

  async me(): Promise<Me | null> {
    // user-me, wrapper'sız user döndürür; Bearer gerekli
    try {
      const d = await api<Me>(ENDPOINT.userMe, { auth: true });
      return d ?? null;
    } catch {
      return null;
    }
  },

  async updateProfile(payload: {
    fname?: string;
    sname?: string;
    username?: string;
    email?: string;
    country_dial?: string; // phone boşsa "" gönder → NULL
    phone?: string; // "" → NULL
    password?: string; // opsiyonel değişim
  }): Promise<{ ok: boolean; user: Me }> {
    return api(ENDPOINT.userProfile, {
      method: "PATCH",
      body: payload,
      auth: true, // Bearer ekle
    });
  },

  async logout(): Promise<void> {
    clearToken({ emit: true });
    try {
      await apiFetch(ENDPOINT.userLogout, { method: "POST" });
    } catch {}
  },
};

// --- Evrensel "kimim" (context için): önce admin, sonra user dene ---
// export async function whoAmI(): Promise<Me | null> {
//   const t = getToken();
//   if (isJwtValid(t)) {
//     // Geçerli JWT → kesin user akışı
//     return await UserApi.me();
//   }
//   // JWT yok/geçersiz → admin çerezi olabilir
//   const admin = await AdminApi.me();
//   if (admin) return admin;

//   // Nadir durum: JWT var ama decode edilemedi → son bir user denemesi
//   if (t) {
//     try {
//       return await UserApi.me();
//     } catch {
//       /* ignore */
//     }
//   }
//   return null;
// }

export async function whoAmI(): Promise<Me | null> {
  const t = getToken();
  if (isJwtValid(t)) return await UserApi.me();

  // token var ama geçersizse temizle
  if (t) clearToken();

  const admin = await AdminApi.me();
  if (admin) return admin;
  return null;
}

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
// export async function apiFetch(
//   input: string,
//   init: RequestInit & { retry?: boolean } = {}
// ) {
//   const url = input.startsWith("http") ? input : `${API_BASE}${input}`;
//   const res = await fetch(url, {
//     credentials: "include",
//     ...init,
//   });

//   // 401 değilse veya zaten retry yapmışsak direkt dön
//   if (res.status !== 401 || init.retry) return res;

//   // 401 → refresh dene
//   const ok = await tryRefresh();
//   if (!ok) return res;

//   // yenilendiyse isteği bir kez daha dene
//   return fetch(url, {
//     credentials: "include",
//     ...init,
//     retry: true,
//   } as any);
// }

export async function apiFetch(
  input: string,
  init: RequestInit & { retry?: boolean } = {}
) {
  const url = input.startsWith("http") ? input : `${API_BASE}${input}`;
  const res = await fetch(url, { credentials: "include", ...init });

  if (res.status !== 401 || init.retry) return res;

  // CUSTOMER rotaları için refresh denemesi yapma
  const isCustomerRoute = url.includes("/api/customers/");
  if (isCustomerRoute) return res;

  // Admin cookie akışı: refresh dene
  const ok = await tryRefresh();
  if (!ok) return res;
  return fetch(url, { credentials: "include", ...init, retry: true } as any);
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
  fname?: string;
  sname?: string;
  phone?: string;
  countryDial?: string;
  role?: "admin" | "editor" | "user";
  is_active?: 0 | 1;
  create_at?: string; // DATETIME
};

/** Auth uçları – hem cookie hem legacy token akışı ile uyumlu */
export const AuthApi = {
  async login(payload: {
    emailOrUsername?: string;
    email?: string;
    username?: string;
    password: string;
    remember?: boolean;
  }): Promise<{ user?: Me }> {
    // 1) Admin girişi dene
    let r = await apiFetch(`/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // 2) Admin başarısızsa (404/401) → user-login dene
    if (r.status === 404 || r.status === 401) {
      r = await apiFetch(`/api/auth/user-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body?.error || "Giriş başarısız");

    // token dönerse sakla (user-login döndürür)
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
        const d = await api<Me>(`/api/customers/user-me`);
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
