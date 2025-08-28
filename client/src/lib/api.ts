const BASE = import.meta.env.VITE_SERVER_API_URL || "http://192.168.1.120:1002";
const token = () => localStorage.getItem("budu.jwt") || "";

export async function api(path: string, opts: RequestInit = {}) {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    credentials: "omit", // 🔴 BUNU EKLE (ya da tamamen kaldır)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const AuthAPI = {
  login: (u: string, p: string) =>
    api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: u, password: p }),
    }),
  me: () => api("/api/auth/me"),
  updateMe: (payload: any) =>
    api("/api/auth/me", { method: "PUT", body: JSON.stringify(payload) }),
  changePassword: (payload: any) =>
    api("/api/auth/change-password", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};

export const SettingsAPI = {
  get: () => api("/api/settings"),
  update: (payload: any) =>
    api("/api/settings", { method: "PUT", body: JSON.stringify(payload) }),
};

export const UsersAPI = {
  list: (q = "") => api(`/api/users?q=${encodeURIComponent(q)}`),
  get: (id: string) => api(`/api/users/${id}`),
  create: (payload: any) =>
    api("/api/users", { method: "POST", body: JSON.stringify(payload) }),
  update: (id: string, payload: any) =>
    api(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  status: (id: string, status: "active" | "disabled") =>
    api(`/api/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  remove: (id: string) => api(`/api/users/${id}`, { method: "DELETE" }),
};

export const PagesAPI = {
  list: (q = "") => api(`/api/pages?q=${encodeURIComponent(q)}`),
  create: (payload: any) =>
    api("/api/pages", { method: "POST", body: JSON.stringify(payload) }),
  get: (id: string) => api(`/api/pages/${id}`),
  update: (id: string, payload: any) =>
    api(`/api/pages/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  toggleActive: (id: string) =>
    api(`/api/pages/${id}/toggle-active`, { method: "PATCH" }),
  toggleMenu: (id: string) =>
    api(`/api/pages/${id}/toggle-menu`, { method: "PATCH" }),
  remove: (id: string) => api(`/api/pages/${id}`, { method: "DELETE" }),
};

export async function uploadFile(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(BASE + "/api/upload", {
    method: "POST",
    headers: token() ? { Authorization: `Bearer ${token()}` } : {},
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "upload failed");
  return data as { id: number; url: string };
}

export async function uploadSettingSlot(file: File, slot: "logo" | "photo") {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(BASE + `/api/settings/upload?slot=${slot}`, {
    method: "POST",
    headers: token() ? { Authorization: `Bearer ${token()}` } : {},
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "upload failed");
  return data as { url: string };
}

/* PUBLIC */
export const PublicAPI = {
  settings: () => api("/api/public/settings"),
  menu: () => api("/api/public/menu"),
};
