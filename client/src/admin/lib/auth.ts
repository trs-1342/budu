// src/admin/lib/auth.ts
const API = import.meta.env.VITE_API_BASE || "http://localhost:1002";

export const API_BASE = API;

export function getAccess(): string | null {
  return localStorage.getItem("access") || sessionStorage.getItem("access");
}

export function saveAccess(token: string) {
  if (localStorage.getItem("access")) localStorage.setItem("access", token);
  else if (sessionStorage.getItem("access")) sessionStorage.setItem("access", token);
  else localStorage.setItem("access", token);
}

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

/** Bearer + 401'de bir kez refresh deneyen fetch wrapper */
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
    const newT = await refreshAccess();
    if (newT) {
      headers.set("Authorization", `Bearer ${newT}`);
      res = await fetch(input instanceof URL ? input.toString() : input, {
        ...init,
        headers,
        credentials: "include",
      });
    }
  }
  return res;
}
