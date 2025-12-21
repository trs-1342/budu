import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Api from "../../lib/api";
import { saveUserAccess, clearUserAccess } from "../../lib/userAuth";
import { clearAdminAccess } from "../../lib/adminAuth";
import "../../css/Login.css";

type LoginBody = {
  emailOrUsername: string;
  password: string;
  remember?: boolean;
};

async function loginRequest(body: LoginBody) {
  const anyApi: any = Api as any;

  // 1) Varsa AuthApi.login kullan
  if (anyApi.AuthApi?.login) {
    return anyApi.AuthApi.login(body);
  }

  // 2) Varsa api(path, init) kullan
  // ÖNEMLİ: bizim lib/api.tsx wrapper'ı body'yi JSON.stringify yapıyor.
  // O yüzden burada body'yi obje göndermek DOĞRU.
  if (typeof anyApi.api === "function") {
    return anyApi.api("/api/auth/user-login", {
      method: "POST",
      body, // ✅ wrapper stringify ediyor
    });
  }

  // 3) Fallback fetch
  const base = (anyApi.API_BASE as string) || "";
  const res = await fetch(`${base}/api/auth/user-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Giriş başarısız.");
  return data;
}

export default function Login() {
  const nav = useNavigate();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!login.trim() || !password.trim()) {
      setErr("Lütfen bilgileri doldurun.");
      return;
    }

    // ✅ "Tek 1 tane olacak": user login olunca admin oturumunu kapat
    clearAdminAccess();
    // clearUserAccess yoksa userAuth'a ekle veya bu satırı kaldır
    clearUserAccess?.();

    try {
      setLoading(true);

      const resp: any = await loginRequest({
        emailOrUsername: login.trim(),
        password,
        remember,
      });

      // token varsa kaydet
      const token = resp?.token || resp?.access || resp?.accessToken;

      // ✅ Token yoksa sessiz geçme, hata ver
      if (!token) {
        throw new Error("Giriş başarısız: Sunucu token döndürmedi.");
      }

      saveUserAccess(token, remember);
      localStorage.setItem("remember_me", remember ? "1" : "0");

      nav("/account", { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <h1 className="auth-title">Giriş Yap</h1>

        <label className="auth-field">
          <span>Kullanıcı adı / E-posta</span>
          <input
            className="auth-input"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="user@site.com veya trs"
            autoComplete="username"
            autoFocus
            required
            disabled={loading}
          />
        </label>

        <label className="auth-field">
          <span>Şifre</span>
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            disabled={loading}
          />
        </label>

        <div className="auth-row between">
          <label className="auth-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={loading}
            />
            <span>Beni hatırla</span>
          </label>

          <Link className="auth-link" to="/forgot-password">
            Şifremi unuttum
          </Link>
        </div>

        {err && <div className="auth-error">{err}</div>}

        <button className="auth-btn primary" type="submit" disabled={loading}>
          {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
        </button>

        <div className="auth-row">
          <span>Hesabın yok mu?</span>
          <Link className="auth-link" to="/register">
            Kayıt ol
          </Link>
        </div>
      </form>
    </div>
  );
}
