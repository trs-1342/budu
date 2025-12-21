import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/admin-scoped.css";
import "../css/login-scoped.css";
import { BiHide, BiSolidShow } from "react-icons/bi";
import {
  saveAdminAccess,
  ADMIN_API_BASE,
  clearAdminAccess,
} from "../../lib/adminAuth";

export default function AdminLogin() {
  const nav = useNavigate();
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const emailOrUsername = String(fd.get("username") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    if (!emailOrUsername || !password)
      return setErr("Lütfen tüm alanları doldurun.");

    setLoading(true);
    setErr(null);
    clearAdminAccess();

    try {
      const res = await fetch(`${ADMIN_API_BASE}/api/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emailOrUsername, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Giriş başarısız.");

      if (!data?.access) {
        throw new Error("Sunucu access token döndürmedi.");
      }
      saveAdminAccess(data.access, remember);
      window.location.href = "/admin";
    } catch (e: any) {
      setErr(e?.message || "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-scope">
      <div className="admin-auth">
        <form className="login-card" onSubmit={handleSubmit} noValidate>
          <header className="login-head">
            <h1 className="login-title">BUDU • Admin</h1>
            <p className="login-sub">Sadece yetkili kullanıcılar</p>
          </header>

          <div className="form-group">
            <label htmlFor="username" className="label">
              Kullanıcı adı veya e-posta
            </label>
            <input
              id="username"
              name="username"
              className="input"
              type="text"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="label">
              Parola
            </label>
            <div className="password-row">
              <input
                id="password"
                name="password"
                className="input"
                type={show ? "text" : "password"}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShow((s) => !s)}
              >
                {show ? <BiHide size={20} /> : <BiSolidShow size={20} />}
              </button>
            </div>
          </div>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Beni hatırla
          </label>

          {err && <div className="error">{err}</div>}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
