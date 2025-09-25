// // src/lib/api.ts
// const API = import.meta.env.VITE_API_BASE || "http://localhost:1002";

// export function getToken(): string | null {
//   return localStorage.getItem("token");
// }

// type ApiOptions = {
//   method?: "GET" | "POST" | "PATCH" | "DELETE";
//   body?: any;
//   auth?: boolean; // Authorization ekle
// };

// export async function api<T = any>(
//   path: string,
//   opts: ApiOptions = {}
// ): Promise<T> {
//   const headers: Record<string, string> = {
//     "Content-Type": "application/json",
//   };
//   if (opts.auth !== false) {
//     const t = getToken();
//     if (t) headers.Authorization = `Bearer ${t}`;
//   }
//   const res = await fetch(`${API}${path}`, {
//     method: opts.method || "GET",
//     headers,
//     body: opts.body ? JSON.stringify(opts.body) : undefined,
//     credentials: "include", // refresh cookie vs.
//   });

//   const data = await res.json().catch(() => ({}));
//   if (!res.ok) {
//     throw new Error(
//       (data && (data.error || data.message)) || "İstek başarısız"
//     );
//   }

//   // Backend login eski "access" döndürürse normalize et
//   if ((data as any).access && !(data as any).token) {
//     (data as any).token = (data as any).access;
//   }

//   return data as T;
// }

// // src/lib/api.tsx
// export type ApiError = { error?: string };

// // export async function api<T = any>(
// //   path: string,
// //   init: RequestInit = {}
// // ): Promise<T> {
// //   const res = await fetch(path, {
// //     credentials: "include", // çerezleri gönder
// //     headers: {
// //       "Content-Type": "application/json",
// //       ...(init.headers || {}),
// //     },
// //     ...init,
// //   });

// //   // JSON olmayan yanıtlar için de deneyelim
// //   const tryJson = async () => {
// //     try { return await res.json(); } catch { return {}; }
// //   };

// //   if (!res.ok) {
// //     const j = (await tryJson()) as ApiError;
// //     throw new Error(j?.error || res.statusText);
// //   }
// //   return (await tryJson()) as T;
// // }

// // Kısa yol helpers
// // ! HATALI
// // export const AuthApi = {
// //   register(body: { email: string; username: string; password: string }) {
// //     return api("/api/auth/user-register", {
// //       method: "POST",
// //       body: JSON.stringify(body),
// //     });
// //   },
// //   login(body: { email?: string; username?: string; password: string }) {
// //     return api("/api/auth/user-login", {
// //       method: "POST",
// //       body: JSON.stringify(body),
// //     });
// //   },
// //   logout() {
// //     return api("/api/auth/logout", { method: "POST" });
// //   },
// // };

// export const AuthApi = {
//   register(body: { email: string; username: string; password: string }) {
//     return api("/api/auth/user-register", {
//       method: "POST",
//       body, // ✅ DÜZ OBJE (wrapper string'ler)
//     });
//   },
//   login(body: {
//     emailOrUsername?: string;
//     email?: string;
//     username?: string;
//     password: string;
//     remember?: boolean;
//   }) {
//     return api("/api/auth/user-login", {
//       method: "POST",
//       body, // ✅ DÜZ OBJE
//     });
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
//     return api("/api/account/user-update", {
//       method: "PATCH",
//       body: JSON.stringify(body),
//     });
//   },
//   changePassword(body: { currentPassword: string; newPassword: string }) {
//     return api("/api/account/user-change-password", {
//       method: "POST",
//       body: JSON.stringify(body),
//     });
//   },
//   notifyMembership(allow: boolean) {
//     return api("/api/account/user-notify-membership", {
//       method: "POST",
//       body: JSON.stringify({ allow }),
//     });
//   },
//   delete() {
//     return api("/api/account/user-delete", { method: "DELETE" });
//   },
// };

// src/lib/api.ts
const API = import.meta.env.VITE_API_BASE || "http://localhost:1002";

export function getToken(): string | null {
  return localStorage.getItem("token");
}

type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: any; // object | string | FormData
  auth?: boolean; // Authorization ekle
  timeoutMs?: number; // isteğe özel timeout
};

export async function api<T = any>(
  path: string,
  opts: ApiOptions = {}
): Promise<T> {
  const isForm =
    typeof FormData !== "undefined" && opts.body instanceof FormData;

  const headers: Record<string, string> = {};
  if (!isForm) headers["Content-Type"] = "application/json";

  if (opts.auth !== false) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  // —— timeout ——
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), opts.timeoutMs ?? 15000);

  let payload: BodyInit | undefined = undefined;
  if (typeof opts.body === "string" || isForm) {
    payload = opts.body as any;
  } else if (opts.body && typeof opts.body === "object") {
    payload = JSON.stringify(opts.body); // stringify YALNIZCA burada
  }

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method: opts.method || "GET",
      headers,
      body: payload,
      credentials: "include",
      signal: ac.signal,
    });
  } catch (e: any) {
    clearTimeout(timeout);
    if (e?.name === "AbortError") throw new Error("İstek zaman aşımına uğradı");
    throw new Error("Ağ hatası: " + (e?.message || "bağlantı sağlanamadı"));
  }
  clearTimeout(timeout);

  let data: any = {};
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  // Eski login formatlarını normalize et
  if (data?.access && !data?.token) data.token = data.access;

  return data as T;
}

// Yardımcılar — stringify ETME; wrapper halleder
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
  login(body: {
    emailOrUsername?: string;
    email?: string;
    username?: string;
    password: string;
    remember?: boolean;
  }) {
    return api("/api/auth/user-login", { method: "POST", body });
  },
  logout() {
    return api("/api/auth/logout", { method: "POST" });
  },
};
