const API = import.meta.env.VITE_API_BASE || "http://localhost:1002";

export function getAccess(): string | null {
  return localStorage.getItem("access") || sessionStorage.getItem("access");
}

export function saveAccess(token: string) {
  // “Beni hatırla” ile hangisine yazdın bilmiyorum; ikisine de yazıp
  // biri yoksa diğeri kalsın yaklaşımı:
  if (localStorage.getItem("access")) localStorage.setItem("access", token);
  else if (sessionStorage.getItem("access"))
    sessionStorage.setItem("access", token);
  else localStorage.setItem("access", token); // default
}

export async function refreshAccess(): Promise<string | null> {
  const r = await fetch(`${API}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) return null;
  const d = await r.json().catch(() => ({}));
  if (!d?.access) return null;
  saveAccess(d.access);
  return d.access as string;
}

/**
 * Bearer header ile istek atar. 401 gelirse bir kere refresh dener, tekrar dener.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const token = getAccess();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res = await fetch(input instanceof URL ? input.toString() : input, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    const newToken = await refreshAccess();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(input instanceof URL ? input.toString() : input, {
        ...init,
        headers,
        credentials: "include",
      });
    }
  }
  return res;
}

export const API_BASE = API;
