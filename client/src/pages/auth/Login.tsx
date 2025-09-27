// src/pages/auth/Login.tsx
import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { AuthApi } from "../../lib/api";
import "../../css/Login.css";

export default function Login() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = emailOrUsername.trim().length >= 3 && password.length >= 6;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setErr(null);
    setLoading(true);
    try {
      await AuthApi.login({
        emailOrUsername: emailOrUsername.trim(),
        password,
        remember,
      });
      // setToken() zaten "auth-changed" event'ini fırlatıyor → Header re-render
      const next = sp.get("next") || "/account";
      nav(next, { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="login" className="min-h-screen">
      <form onSubmit={onSubmit}>
        <h1>Giriş Yap</h1>

        <div>
          <label>Kullanıcı adı veya E-posta</label>
          <input
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            required
            minLength={3}
            type="text"
            placeholder="kullanici123 veya mail@ornek.com"
            className="mt-1 w-full rounded-xl"
            autoComplete="username"
          />
        </div>

        <div>
          <label>Şifre</label>
          <div className="mt-1 relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••"
              className="w-full rounded-xl pr-12"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="eye"
              aria-label="Şifreyi göster/gizle"
            >
              {showPass ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <div className="row between">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Beni hatırla
          </label>
          <Link to="/reset-password" className="link">
            Şifreyi sıfırla
          </Link>
        </div>

        {err && <div className="text-red-400">{err}</div>}

        <button type="submit" disabled={!canSubmit || loading}>
          {loading ? "Gönderiliyor..." : "Giriş Yap"}
        </button>

        <div className="below">
          Hesabın yok mu?{" "}
          <Link to="/register" className="link">
            Kayıt ol
          </Link>
        </div>
      </form>
    </div>
  );
}
