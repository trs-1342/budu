// const API = import.meta.env.VITE_API_BASE || "http://72.62.52.200:1002";

// export const API_BASE = API;

// /** access token'ı oku (öncelik local, sonra session) */
// export function getAccess(): string | null {
//   return localStorage.getItem("access") || sessionStorage.getItem("access");
// }

// // ! admin or user token ???
// export function getToken(): string | null {
//   return localStorage.getItem("token");
// }

// /** access token'ı kaydet (hangi storage kullanıldıysa ona yaz) */
// export function saveAccess(token: string) {
//   if (localStorage.getItem("access")) localStorage.setItem("access", token);
//   else if (sessionStorage.getItem("access")) sessionStorage.setItem("access", token);
//   else localStorage.setItem("access", token); // default
// }

// // eski: /api/auth/refresh
// export async function refreshUserAccess(): Promise<string | null> {
//   const r = await fetch(`${API}/api/auth/user-refresh`, {
//     method: "POST",
//     credentials: "include",
//   });
//   if (!r.ok) return null;
//   const d = await r.json().catch(() => ({}));
//   const access = d?.access || d?.token;
//   if (!access) return null;
//   saveAccess(access);
//   return access as string;
// }

// /** refresh endpoint'i: yeni access dönerse sakla */
// export async function refreshAccess(): Promise<string | null> {
//   const r = await fetch(`${API}/api/auth/refresh`, {
//     method: "POST",
//     credentials: "include",
//   });
//   if (!r.ok) return null;
//   const d = await r.json().catch(() => ({}));
//   const access = d?.access || d?.token;
//   if (!access) return null;
//   saveAccess(access);
//   return access as string;
// }

// /** 401'de bir kez refresh deneyip tekrar istek atan wrapper */
// export async function apiFetch(
//   input: RequestInfo | URL,
//   init: RequestInit = {}
// ) {
//   const headers = new Headers(init.headers || {});
//   const t = getAccess();
//   if (t) headers.set("Authorization", `Bearer ${t}`);

//   let res = await fetch(input instanceof URL ? input.toString() : input, {
//     ...init,
//     headers,
//     credentials: "include",
//   });

//   if (res.status === 401) {
//     const newT = await refreshAccess();
//     if (newT) {
//       headers.set("Authorization", `Bearer ${newT}`);
//       res = await fetch(input instanceof URL ? input.toString() : input, {
//         ...init,
//         headers,
//         credentials: "include",
//       });
//     }
//   }
//   return res;
// }

// /** JSON dönen kısa yol (hata mesajını yüzeye çıkarır) */
// export async function api<T = any>(
//   path: string,
//   opts: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: any } = {}
// ): Promise<T> {
//   const headers: Record<string, string> = { "Content-Type": "application/json" };
//   const body =
//     opts.body === undefined || opts.body === null
//       ? undefined
//       : typeof opts.body === "string"
//         ? opts.body
//         : JSON.stringify(opts.body);

//   const res = await apiFetch(`${API}${path}`, {
//     method: opts.method || "GET",
//     headers,
//     body,
//   });

//   let data: any = {};
//   try { data = await res.json(); } catch { data = {}; }

//   if (!res.ok) {
//     throw new Error((data && (data.error || data.message)) || res.statusText);
//   }
//   if (data?.access && !data?.token) data.token = data.access; // uyumluluk
//   return data as T;
// }

// /** Kısa yol endpoints (örnekler) */
// export const AuthApi = {
//   register(body: { email: string; username: string; password: string }) {
//     return api("/api/auth/user-register", { method: "POST", body });
//   },
//   login(body: { email?: string; username?: string; password: string }) {
//     return api("/api/auth/user-login", { method: "POST", body });
//   },
//   logout() {
//     return api("/api/auth/logout", { method: "POST" });
//   },
// };

// export type MeDto = {
//   id: number;
//   email: string;
//   username: string;
//   phone?: string | null;
//   countryDial?: string | null;
//   membershipNotify: boolean;
// };

// export const AccountApi = {
//   me() {
//     return api<MeDto>("/api/account/user-me");
//   },
//   update(body: { username?: string; phone?: string; countryDial?: string }) {
//     return api("/api/account/user-update", { method: "PATCH", body });
//   },
//   changePassword(body: { currentPassword: string; newPassword: string }) {
//     return api("/api/account/user-change-password", { method: "POST", body });
//   },
//   notifyMembership(allow: boolean) {
//     return api("/api/account/user-notify-membership", { method: "POST", body: { allow } });
//   },
//   delete() {
//     return api("/api/account/user-delete", { method: "DELETE" });
//   },
// };
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
export function saveAccess(token: string, remember = true) {
  const store = remember ? localStorage : sessionStorage;
  store.setItem("access", token);
  store.setItem("token", token); // backward compatibility
}

/** Eski kodları kırmamak için alias: getToken = getAccess */
export function getToken(): string | null {
  return getAccess();
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
  saveAccess(access); // remember flag'ine dokunmuyoruz; mevcut storage’da kalır
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

/** JSON kısayol fonksiyonu değişmedi */
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
