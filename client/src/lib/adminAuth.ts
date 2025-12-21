const API = import.meta.env.VITE_API_BASE || "http://localhost:1002";
export const ADMIN_API_BASE = API;

// Admin için ayrı key'ler
const K_ACCESS = "admin_access";
const K_TOKEN = "admin_token";

export function getAdminAccess(): string | null {
  return (
    localStorage.getItem(K_ACCESS) ||
    sessionStorage.getItem(K_ACCESS) ||
    localStorage.getItem(K_TOKEN) ||
    sessionStorage.getItem(K_TOKEN)
  );
}

export function saveAdminAccess(token: string, remember = true) {
  const store = remember ? localStorage : sessionStorage;
  store.setItem(K_ACCESS, token);
  store.setItem(K_TOKEN, token);
}

export function clearAdminAccess() {
  localStorage.removeItem(K_ACCESS);
  localStorage.removeItem(K_TOKEN);
  sessionStorage.removeItem(K_ACCESS);
  sessionStorage.removeItem(K_TOKEN);
}

// ADMIN refresh endpoint'i kullanır
export async function adminRefreshAccess(): Promise<string | null> {
  const r = await fetch(`${API}/api/auth/admin-refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) return null;
  const d = await r.json().catch(() => ({}));
  const access = d?.access || d?.token;
  if (!access) return null;
  saveAdminAccess(access, true);
  return access as string;
}

export async function adminFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const headers = new Headers(init.headers || {});
  const t = getAdminAccess();
  if (t) headers.set("Authorization", `Bearer ${t}`);

  let res = await fetch(input instanceof URL ? input.toString() : input, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    const nt = await adminRefreshAccess();
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
