import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Api from "../../lib/api";
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

  // 2) Varsa api(path, init) kullan  👉 DİKKAT: JSON.stringify YOK
  if (typeof anyApi.api === "function") {
    return anyApi.api("/api/auth/user-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body, // <-- DOĞRUDAN NESNE/OBJE
      // json: body,        // (Wrapper 'json' bekliyorsa bunu açıp 'body'yi kaldırabilirsin)
    });
  }

  // 3) Fallback fetch  👉 burada TEK KEZ string’le
  const res = await fetch("/api/auth/user-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let j: any = {};
    try {
      j = await res.json();
    } catch { }
    throw new Error(j?.error || res.statusText);
  }
  try {
    return await res.json();
  } catch {
    return {};
  }
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

    try {
      setLoading(true);
      const resp: any = await loginRequest({
        emailOrUsername: login.trim(),
        password,
        remember,
      });
      // localStorage.setItem("remember_me", remember ? "1" : "0");
      // token varsa kaydet
      const token = resp?.token || resp?.access || resp?.accessToken;
      if (token) {
        Api.saveAccess(token);   // <-- asıl kritik satır
        localStorage.setItem("token", token); // backward compatibility
      }
      localStorage.setItem("remember_me", remember ? "1" : "0");
      nav("/account", { replace: true }); // istersen "/" yap
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
          />
        </label>

        <div className="auth-row between">
          <label className="auth-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>Beni hatırla</span>
          </label>

          <Link className="auth-link" to="/forgot-password">
            Şifremi unuttum
          </Link>
        </div>

        {err && <div className="auth-error">{err}</div>}

        <button className="auth-btn primary" disabled={loading}>
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
