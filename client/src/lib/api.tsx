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

export async function api<T = any>(
  path: string,
  opts: ApiOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.auth !== false) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${API}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "include", // refresh cookie vs.
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data && (data.error || data.message)) || "İstek başarısız"
    );
  }

  // Backend login eski "access" döndürürse normalize et
  if ((data as any).access && !(data as any).token) {
    (data as any).token = (data as any).access;
  }

  return data as T;
}
