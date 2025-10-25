import { useState } from "react";
import "../css/admin-scoped.css"; // GENEL admin tema (scoped)
import "../css/login-scoped.css"; // Sadece login (scoped)
import { BiHide, BiSolidShow } from "react-icons/bi";

export default function AdminLogin() {
  const API = import.meta.env.VITE_API_BASE || "http://localhost:1002";
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
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emailOrUsername, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Giriş başarısız.");
      (remember ? localStorage : sessionStorage).setItem("access", data.access);
      window.location.href = "/admin";
    } catch (e: any) {
      setErr(e.message || "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-scope">
      {" "}
      {/* <-- SCOPED */}
      <div className="admin-auth">
        {" "}
        {/* tam ekran ortalama */}
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
              placeholder="admin veya admin@budu.local"
              autoComplete="username"
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
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="toggle-btn"
                aria-label={show ? "Parolayı gizle" : "Parolayı göster"}
                onClick={() => setShow((s) => !s)}
                title={show ? "Gizle" : "Göster"}
              >
                {show ? <BiHide size={20} /> : <BiSolidShow size={20} />}
              </button>
            </div>
          </div>

          <div className="row">
            <label className="checkbox">
              <input
                type="checkbox"
                name="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={loading}
              />
              Beni hatırla
            </label>
            <a className="forgot" href="/admin/forgot">
              Parolamı unuttum
            </a>
          </div>

          {err && (
            <div className="error" role="alert">
              {err}
            </div>
          )}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>

          <button
            className="btn secondary"
            type="button"
            onClick={() => (window.location.href = "/")}
            disabled={loading}
            style={{ marginTop: 10 }}
          >
            Anasayfaya Dön
          </button>
        </form>
      </div>
    </div>
  );
}
