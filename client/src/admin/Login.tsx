import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../admin/admin.css";
import { AuthAPI } from "../lib/api";

export default function AdminLogin() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const redirectTo = loc.state?.from || "/admin";
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const fd = new FormData(e.target as HTMLFormElement);
    const username = String(fd.get("username") || "").trim();
    const password = String(fd.get("password") || "").trim();
    try {
      const { token } = await AuthAPI.login(username, password);
      localStorage.setItem("budu.jwt", token);
      nav(redirectTo, { replace: true });
    } catch (err: any) {
      setMsg(err.message || "Giriş hatası");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-wrap">
      <div className="admin-noise" aria-hidden />
      <section className="admin-card" aria-label="Admin login form">
        <header className="admin-head">
          <h1>Admin Login</h1>
          <p>Yetkili kullanıcı girişi</p>
        </header>
        <form className="admin-form" onSubmit={onSubmit}>
          <label className="admin-label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            name="username"
            className="admin-input"
            placeholder="admin"
            autoComplete="username"
          />
          <div className="admin-row">
            <label className="admin-label" htmlFor="password">
              Password
            </label>
            <button
              type="button"
              className="admin-link"
              onClick={() => setShow((s) => !s)}
            >
              {show ? "Gizle" : "Göster"}
            </button>
          </div>
          <input
            id="password"
            name="password"
            className="admin-input"
            placeholder="••••••••"
            type={show ? "text" : "password"}
            autoComplete="current-password"
          />
          <button className="admin-btn" type="submit" disabled={loading}>
            {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
          <button
            className="admin-btn"
            type="submit"
            onClick={() => {
              nav("/");
            }}
          >
            Anasayfa
          </button>
          {msg && <p className="admin-msg">{msg}</p>}
        </form>
        <footer className="admin-foot">
          <span>© {new Date().getFullYear()} Budu | Admin</span>
        </footer>
      </section>
    </div>
  );
}
