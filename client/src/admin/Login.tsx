import type { FormEvent } from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./admin.css";
import { getTempAdmin, isGateOpen, LS_KEYS, sha256 } from "./state";

export default function AdminLogin() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    if (!isGateOpen()) nav("/admin/gate", { replace: true });
    if (!getTempAdmin()) nav("/admin/setup", { replace: true });
  }, [nav]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const fd = new FormData(e.target as HTMLFormElement);
    const username = String(fd.get("username") || "").trim();
    const password = String(fd.get("password") || "").trim();

    const tmp = getTempAdmin();
    if (!tmp) {
      setMsg("Geçici hesap yok. Setup adımına dön.");
      setLoading(false);
      return;
    }
    const passHash = await sha256(password);
    if (username === tmp.username && passHash === tmp.passHash) {
      localStorage.setItem(LS_KEYS.ADMIN_TOKEN, "temp-session");
      setMsg("Giriş başarılı. Panele yönlendiriliyor…");
      setTimeout(() => nav("/admin", { replace: true }), 400);
    } else {
      setMsg("Hatalı kullanıcı adı veya şifre.");
    }
    setLoading(false);
  }

  return (
    <div className="admin-wrap">
      <div className="admin-noise" aria-hidden />
      <section className="admin-card" aria-label="Admin login form">
        <header className="admin-head">
          <h1>Admin Login</h1>
          <p>Geçici hesap ile giriş yap</p>
        </header>

        <form className="admin-form" onSubmit={handleSubmit}>
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

          {msg && <p className="admin-msg">{msg}</p>}
        </form>

        <footer className="admin-foot">
          <span>© {new Date().getFullYear()} Budu | Admin</span>
        </footer>
      </section>
    </div>
  );
}
