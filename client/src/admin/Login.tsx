// Login.tsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authStore } from "./auth/store";
import "./admin.css";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const nav = useNavigate();
  const loc = useLocation() as any;
  const { login } = authStore();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusy(true);
      setMsg("");
      await login(identifier, password);
      nav(loc?.state?.from || "/admin", { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg === "no-admin") {
        nav("/admin/setup");
      } else if (msg === "wrong-password") {
        setMsg("Şifre yanlış!");
      } else {
        setMsg("Giriş başarısız.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-wrap">
      <div className="admin-noise" aria-hidden />
      <section className="admin-card">
        <header className="admin-head">
          <h1>Admin Login</h1>
          <p>Güvenli oturum (JWT)</p>
        </header>
        <form className="admin-form" onSubmit={submit}>
          <label className="admin-label">E-posta veya kullanıcı adı</label>
          <input
            className="admin-input"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <label className="admin-label">Şifre</label>
          <input
            className="admin-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="admin-btn" disabled={busy}>
            {busy ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
          {msg && <p className="admin-msg">{msg}</p>}
        </form>
      </section>
    </div>
  );
}
