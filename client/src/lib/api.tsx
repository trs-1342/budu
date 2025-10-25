// src/lib/api.ts
const API = import.meta.env.VITE_API_BASE || "http://localhost:1002";

export function getToken(): string | null {
  return localStorage.getItem("token");
}

type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: any;
  auth?: boolean; // Authorization ekle
};

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


// src/lib/api.tsx

export async function api<T = any>(
  path: string,
  opts: ApiOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // Authorization header (opsiyonel)
  if (opts.auth !== false) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  const body =
    opts.body === undefined || opts.body === null
      ? undefined
      : typeof opts.body === "string"
        ? opts.body
        : JSON.stringify(opts.body);

  const res = await fetch(`${API}${path}`, {
    method: opts.method || "GET",
    headers,
    body,
    credentials: "include",
  });

  // Güvenli JSON parse
  const tryJson = async () => {
    try {
      return (await res.json()) as any;
    } catch {
      return {} as any;
    }
  };

  const data = await tryJson();

  if (!res.ok) {
    throw new Error((data && (data.error || data.message)) || res.statusText);
  }

  // Bazı backend’lerde access → token eşlemesi
  if ((data as any)?.access && !(data as any)?.token) {
    (data as any).token = (data as any).access;
  }

  return data as T;
}

export type ApiError = { error?: string };

// export async function api<T = any>(
//   path: string,
//   init: RequestInit = {}
// ): Promise<T> {
//   const res = await fetch(path, {
//     credentials: "include", // çerezleri gönder
//     headers: {
//       "Content-Type": "application/json",
//       ...(init.headers || {}),
//     },
//     ...init,
//   });

//   // JSON olmayan yanıtlar için de deneyelim
//   const tryJson = async () => {
//     try { return await res.json(); } catch { return {}; }
//   };

//   if (!res.ok) {
//     const j = (await tryJson()) as ApiError;
//     throw new Error(j?.error || res.statusText);
//   }
//   return (await tryJson()) as T;
// }

// Kısa yol helpers
export const AuthApi = {
  register(body: { email: string; username: string; password: string }) {
    return api("/api/auth/user-register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  login(body: { email?: string; username?: string; password: string }) {
    return api("/api/auth/user-login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  logout() {
    return api("/api/auth/logout", { method: "POST" });
  },
};

export type MeDto = {
  id: number;
  email: string;
  username: string;
  phone?: string | null;
  countryDial?: string | null;
  membershipNotify: boolean;
};

export const AccountApi = {
  me() {
    return api<MeDto>("/api/account/user-me");
  },
  update(body: { username?: string; phone?: string; countryDial?: string }) {
    return api("/api/account/user-update", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  changePassword(body: { currentPassword: string; newPassword: string }) {
    return api("/api/account/user-change-password", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  notifyMembership(allow: boolean) {
    return api("/api/account/user-notify-membership", {
      method: "POST",
      body: JSON.stringify({ allow }),
    });
  },
  delete() {
    return api("/api/account/user-delete", { method: "DELETE" });
  },
};
