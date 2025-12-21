// const API = import.meta.env.VITE_API_BASE || "http://localhost:1002";
// export const USER_API_BASE = API;

// // Normal kullanıcı için tamamen ayrı key'ler
// const K_ACCESS = "user_access";
// const K_TOKEN = "user_token";

// export function getUserAccess(): string | null {
//   return (
//     localStorage.getItem(K_ACCESS) ||
//     sessionStorage.getItem(K_ACCESS) ||
//     localStorage.getItem(K_TOKEN) ||
//     sessionStorage.getItem(K_TOKEN)
//   );
// }

// export function saveUserAccess(token: string, remember = true) {
//   const store = remember ? localStorage : sessionStorage;
//   store.setItem(K_ACCESS, token);
//   store.setItem(K_TOKEN, token); // uyumluluk
// }

// export function clearUserAccess() {
//   localStorage.removeItem(K_ACCESS);
//   localStorage.removeItem(K_TOKEN);
//   sessionStorage.removeItem(K_ACCESS);
//   sessionStorage.removeItem(K_TOKEN);
// }

// // USER refresh endpoint'i kullanır
// export async function userRefreshAccess(): Promise<string | null> {
//   const r = await fetch(`${API}/api/auth/user-refresh`, {
//     method: "POST",
//     credentials: "include",
//   });
//   if (!r.ok) return null;
//   const d = await r.json().catch(() => ({}));
//   const access = d?.access || d?.token;
//   if (!access) return null;
//   saveUserAccess(access, true);
//   return access as string;
// }

// export async function userFetch(
//   input: RequestInfo | URL,
//   init: RequestInit = {}
// ) {
//   const headers = new Headers(init.headers || {});
//   const t = getUserAccess();
//   if (t) headers.set("Authorization", `Bearer ${t}`);

//   let res = await fetch(input instanceof URL ? input.toString() : input, {
//     ...init,
//     headers,
//     credentials: "include",
//   });

//   if (res.status === 401) {
//     const nt = await userRefreshAccess();
//     if (nt) {
//       headers.set("Authorization", `Bearer ${nt}`);
//       res = await fetch(input instanceof URL ? input.toString() : input, {
//         ...init,
//         headers,
//         credentials: "include",
//       });
//     }
//   }
//   return res;
// }

const K_ACCESS = "user_access";

export function getUserAccess(): string | null {
  return localStorage.getItem(K_ACCESS) || sessionStorage.getItem(K_ACCESS);
}

export function saveUserAccess(token: string, remember = true) {
  const store = remember ? localStorage : sessionStorage;
  store.setItem(K_ACCESS, token);
}

export function clearUserAccess() {
  localStorage.removeItem(K_ACCESS);
  sessionStorage.removeItem(K_ACCESS);
}
