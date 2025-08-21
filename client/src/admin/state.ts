export const LS_KEYS = {
  GATE_OK: "admin_gate_ok",
  TEMP_ADMIN: "temp_admin", // {username, passHash}
  ADMIN_TOKEN: "admin_token", // normal login sonrası
} as const;

export function isGateOpen() {
  return localStorage.getItem(LS_KEYS.GATE_OK) === "1";
}
export function openGate() {
  localStorage.setItem(LS_KEYS.GATE_OK, "1");
}
export function closeGate() {
  localStorage.removeItem(LS_KEYS.GATE_OK);
}

export async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", enc);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type TempAdmin = { username: string; passHash: string };

export function getTempAdmin(): TempAdmin | null {
  const raw = localStorage.getItem(LS_KEYS.TEMP_ADMIN);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TempAdmin;
  } catch {
    return null;
  }
}
export function setTempAdmin(t: TempAdmin) {
  localStorage.setItem(LS_KEYS.TEMP_ADMIN, JSON.stringify(t));
}
export function clearTempAdmin() {
  localStorage.removeItem(LS_KEYS.TEMP_ADMIN);
}
