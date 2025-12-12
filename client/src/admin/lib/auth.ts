// src/admin/lib/auth.ts
// Admin tarafında ortak auth & api helper'larını ana lib'den re-export ederiz.
// Bu dosyada başka export TANIMI olmayacak, sadece re-export.

export {
  API_BASE,
  getAccess,
  saveAccess,
  refreshAccess,
  refreshUserAccess,
  apiFetch,
  api,
  getToken,
  // parseJwt ve isJwtValid'i kullanıyorsan,
  // bunları da ekleyebilirsin (aşağıda api.tsx kodunu güncelliyorum).
  // parseJwt,
  // isJwtValid,
} from "../../lib/api";
