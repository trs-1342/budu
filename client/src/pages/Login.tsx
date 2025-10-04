// src/pages/auth/Login.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Login.css";
import { UserApi, type Me } from "../lib/api";
import { useAuth } from "../lib/auth-context";

export default function Login() {
  const nav = useNavigate();
  const { user, ready, setUser } = useAuth();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (user) nav("/account", { replace: true });
  }, [ready, user, nav]);

  const isEmail = useMemo(
    () => emailOrUsername.includes("@"),
    [emailOrUsername]
  );
  const emailOk = useMemo(
    () =>
      !isEmail
        ? true
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrUsername.trim()),
    [emailOrUsername, isEmail]
  );
  const usernameOk = useMemo(
    () => (isEmail ? true : emailOrUsername.trim().length >= 3),
    [emailOrUsername, isEmail]
  );
  const passwordOk = password.length >= 6;
  const formOk = emailOk && usernameOk && passwordOk;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formOk || loading) return;

    setErr(null);
    setLoading(true);
    try {
      // 1) Giriş
      await UserApi.login({
        emailOrUsername: emailOrUsername.trim(),
        password,
        remember,
      });
      // 2) Kimlik doğrulama
      const me = (await UserApi.me()) as Me | null;
      if (!me) throw new Error("Giriş doğrulanamadı.");

      // 3) Context + yönlendirme
      setUser(me);
      try {
        window.dispatchEvent(new Event("auth-changed"));
      } catch {}
      nav("/account", { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Giriş başarısız. Bilgileri kontrol edin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="login">
      <form onSubmit={handleSubmit} noValidate>
        <h1>Giriş Yap</h1>

        {err && <div className="text-red-400">{err}</div>}

        <div>
          <label htmlFor="id">E-posta veya kullanıcı adı</label>
          <input
            id="id"
            type="text"
            placeholder="ornek@site.com veya kullanıcı adı"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div>
          <label htmlFor="pw">Parola</label>
          <div className="relative">
            <input
              id="pw"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="eye"
              onClick={() => setShowPw((s) => !s)}
              title={showPw ? "Gizle" : "Göster"}
              aria-label={showPw ? "Parolayı gizle" : "Parolayı göster"}
            >
              {showPw ? "🙈" : "👁️"}
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

          <a className="link" href="/forgot">
            Şifremi unuttum
          </a>
        </div>

        <button type="submit" disabled={!formOk || loading}>
          {loading ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>

        <div className="below">
          Henüz hesabın yok mu?
          <a className="link" href="/register">
            Kayıt ol
          </a>
        </div>
      </form>
    </div>
  );
}
