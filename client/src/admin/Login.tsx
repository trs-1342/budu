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

    // Validation
    if (!username || !password) {
      setMsg("Kullanıcı adı ve şifre gerekli");
      setLoading(false);
      return;
    }

    try {
      console.log("Login attempt:", { username, redirectTo }); // Debug log

      const response = await AuthAPI.login(username, password);

      console.log("Login response:", response); // Debug log

      if (response.success && response.user) {
        console.log("Login successful, redirecting to:", redirectTo);

        // Başarılı giriş - yönlendirme yap
        nav(redirectTo, { replace: true });
      } else {
        setMsg("Giriş başarısız - Kullanıcı bilgileri alınamadı");
      }
    } catch (err: any) {
      console.error("Login error:", err); // Debug log

      // Hata mesajlarını daha anlaşılır yap
      if (err.message.includes("401")) {
        setMsg("Kullanıcı adı veya şifre hatalı");
      } else if (err.message.includes("403")) {
        setMsg("Hesabınız devre dışı bırakılmış");
      } else if (err.message.includes("400")) {
        setMsg("Geçersiz bilgiler");
      } else if (err.message.includes("500")) {
        setMsg("Sunucu hatası, lütfen tekrar deneyin");
      } else {
        setMsg(err.message || "Giriş hatası");
      }
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
            required
            disabled={loading}
          />
          <div className="admin-row">
            <label className="admin-label" htmlFor="password">
              Password
            </label>
            <button
              type="button"
              className="admin-link"
              onClick={() => setShow((s) => !s)}
              disabled={loading}
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
            required
            disabled={loading}
          />
          <button className="admin-btn" type="submit" disabled={loading}>
            {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
          <button
            className="admin-btn"
            type="button"
            onClick={() => nav("/")}
            disabled={loading}
          >
            Anasayfa
          </button>
          {msg && (
            <p
              className="admin-msg"
              style={{ color: msg.includes("başarılı") ? "green" : "red" }}
            >
              {msg}
            </p>
          )}
        </form>
        <footer className="admin-foot">
          <span>© {new Date().getFullYear()} Budu | Admin</span>
        </footer>
      </section>
    </div>
  );
}
