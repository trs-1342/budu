import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getUserAccess,
  saveUserAccess,
  clearUserAccess,
} from "../../lib/userAuth";
import { clearAdminAccess } from "../../lib/adminAuth";
import "../../css/Login.css";

type LoginBody = {
  emailOrUsername: string;
  password: string;
  remember?: boolean;
};

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:1002";

async function loginRequest(body: LoginBody) {
  const res = await fetch(`${API_BASE}/api/auth/user-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || "Giriş başarısız.");
  }

  return data;
}

export default function Login() {
  const nav = useNavigate();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!login.trim() || !password.trim()) {
      setErr("Lütfen bilgileri doldurun.");
      return;
    }

    // 🔒 tek oturum kuralı
    clearAdminAccess();
    clearUserAccess();

    try {
      setLoading(true);

      const resp: any = await loginRequest({
        emailOrUsername: login.trim(),
        password,
        remember,
      });

      const token = resp?.access || resp?.token;
      if (!token) {
        throw new Error("Sunucu token döndürmedi.");
      }

      saveUserAccess(token, remember);
      localStorage.setItem("remember_me", remember ? "1" : "0");

      // ❗ redirect YOK
      setLoggedIn(true);
    } catch (e: any) {
      setErr(e?.message || "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ REDIRECT SADECE BURADA
  useEffect(() => {
    if (loggedIn && getUserAccess()) {
      nav("/account", { replace: true });
    }
  }, [loggedIn, nav]);

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
            autoComplete="username"
            disabled={loading}
            required
          />
        </label>

        <label className="auth-field">
          <span>Şifre</span>
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
            required
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
          <Link className="auth-link" to="/">
            Anasayfa
          </Link>
        </div>
      </form>
    </div>
  );
}
