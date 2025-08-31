export const LS_KEYS = {
  GATE_OK: "admin_gate_ok",
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

// SHA256 fonksiyonunu koruyoruz, başka yerlerde kullanılıyor olabilir
export async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", enc);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}
