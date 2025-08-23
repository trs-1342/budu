export type SiteSettings = {
  siteName: string;
  logoDataUrl?: string; // uploaded site logo (DataURL)
  heroPhotoDataUrl?: string; // overrides buduPhoto on home page
};

export type Role = "admin" | "editor" | "viewer";
export type UserRow = {
  id: string;
  username: string;
  role: Role;
  createdAt: string; // ISO
  active: boolean;
};

export type PageRow = {
  id: string;
  title: string;
  path: string; // e.g. "/about"
  published: boolean;
  createdAt: string;
  updatedAt?: string;
};

export const STORE_KEYS = {
  SITE: "app.site.settings",
  USERS: "app.users",
  PAGES: "app.pages",
  ADMIN_AVATAR: "app.admin.avatar",
} as const;

// ---- helpers ----
export function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
export function writeLS<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

// ---- Site ----
export function getSite(): SiteSettings {
  return readLS<SiteSettings>(STORE_KEYS.SITE, { siteName: "Budu" });
}
export function setSite(next: SiteSettings) {
  writeLS(STORE_KEYS.SITE, next);
}

// ---- Users (mock) ----
export function getUsers(): UserRow[] {
  const seed: UserRow[] = [
    {
      id: "u-1",
      username: "admin",
      role: "admin",
      createdAt: new Date().toISOString(),
      active: true,
    },
  ];
  return readLS<UserRow[]>(STORE_KEYS.USERS, seed);
}
export function saveUsers(list: UserRow[]) {
  writeLS(STORE_KEYS.USERS, list);
}

// ---- Pages (mock) ----
export function getPages(): PageRow[] {
  return readLS<PageRow[]>(STORE_KEYS.PAGES, []);
}
export function savePages(list: PageRow[]) {
  writeLS(STORE_KEYS.PAGES, list);
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
