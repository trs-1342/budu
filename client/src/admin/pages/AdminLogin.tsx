// src/admin/pages/AdminLogin.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// import { AuthApi, type Me } from "../../lib/api";
import { AdminApi, type Me } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import "../css/login-scoped.css";

export default function AdminLogin() {
  const nav = useNavigate();
  const { user, ready, setUser } = useAuth();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Zaten admin olarak girişliyse direkt panele yolla
  useEffect(() => {
    if (!ready) return;
    if (user && (user.role === "admin" || user.role === "editor")) {
      nav("/admin", { replace: true });
    }
  }, [ready, user, nav]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setErr(null);
    setLoading(true);
    try {
      // 1) Giriş isteği (cookie veya token – backend hangisini veriyorsa)
      await AdminApi.login({
        emailOrUsername: emailOrUsername.trim(),
        password,
        remember,
      });
      // 2) Kimim?
      const me = (await AdminApi.me()) as Me | null;

      // 3) Admin değilse içeri alma
      if (!me || !["admin", "editor"].includes(String(me.role || ""))) {
        setUser(null);
        setErr("Yetkisiz hesap: Bu panele sadece admin/editor girebilir.");
        return;
      }

      // 4) Context’i güncelle, event’i fırlat, panele yönlendir
      setUser(me);
      try {
        window.dispatchEvent(new Event("auth-changed"));
      } catch {}
      nav("/admin", { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Giriş başarısız. Bilgileri kontrol edin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="admin-scope"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "#000",
      }}
    >
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-head">
          <h1 className="login-title">Yönetim Paneli</h1>
          <p className="login-sub">Devam etmek için admin girişi yapın.</p>
        </div>

        {err && <div className="error">{err}</div>}

        <div className="form-group">
          <label className="label" htmlFor="emailOrUsername">
            E-posta veya kullanıcı adı
          </label>
          <input
            id="emailOrUsername"
            className="input"
            placeholder="admin@budu.local veya admin"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="form-group">
          <label className="label" htmlFor="password">
            Parola
          </label>
          <div className="password-row">
            <input
              id="password"
              className="input"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="toggle-btn"
              onClick={() => setShowPw((x) => !x)}
              title={showPw ? "Gizle" : "Göster"}
            >
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <div className="row">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Beni hatırla
          </label>

          <a className="forgot" href="#" onClick={(e) => e.preventDefault()}>
            Parolamı unuttum
          </a>
        </div>

        <button
          className="btn"
          type="submit"
          disabled={
            loading ||
            emailOrUsername.trim().length < 2 ||
            password.trim().length < 4
          }
          title="Giriş"
        >
          {loading ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>

        {/* Opsiyonel: ikinci buton seti – örn. dev kolaylığı */}
        {/* <button className="btn secondary" type="button" onClick={() => { setEmailOrUsername("admin"); setPassword("admin1234"); }}>
          Admin (demo)
        </button> */}
      </form>
    </div>
  );
}
