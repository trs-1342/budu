import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./admin.css";
import { isGateOpen } from "./state";

const API_URL = import.meta.env.VITE_SERVER_API_URL || "http://localhost:1002";

export default function SetupTempAccount() {
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isGateOpen()) nav("/admin/gate", { replace: true });
  }, [nav]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    if (!u.trim()) return setMsg("Username boş olamaz.");
    if (p1.length < 6) return setMsg("Şifre en az 6 karakter olmalı.");
    if (p1 !== p2) return setMsg("Şifreler eşleşmiyor.");

    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u.trim(), password: p1 }),
      });

      const data = await r.json().catch(() => ({}));
      if (r.status === 201) {
        setMsg("Kullanıcı oluşturuldu. Giriş sayfasına yönlendiriliyorsun…");
        setTimeout(() => nav("/admin/login", { replace: true }), 700);
      } else if (r.status === 409) {
        setMsg("Bu kullanıcı adı zaten kayıtlı.");
      } else {
        setMsg(data.error || "Kayıt başarısız.");
      }
    } catch {
      setMsg("Sunucuya ulaşılamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-wrap">
      <div className="admin-noise" aria-hidden />
      <section className="admin-card">
        <header className="admin-head">
          <h1>Admin Kullanıcı Oluştur</h1>
          <p>Username & Password belirle (veritabanına kaydedilecek)</p>
        </header>

        <form className="admin-form" onSubmit={onCreate}>
          <label className="admin-label" htmlFor="u">
            Username
          </label>
          <input
            id="u"
            className="admin-input"
            value={u}
            onChange={(e) => setU(e.target.value)}
            placeholder="admin"
            autoComplete="username"
          />

          <label className="admin-label" htmlFor="p1">
            Yeni şifre
          </label>
          <input
            id="p1"
            className="admin-input"
            type="password"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />

          <label className="admin-label" htmlFor="p2">
            Şifre tekrar
          </label>
          <input
            id="p2"
            className="admin-input"
            type="password"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />

          <button className="admin-btn" type="submit" disabled={loading}>
            {loading ? "Oluşturuluyor…" : "Oluştur"}
          </button>
          {msg && <p className="admin-msg">{msg}</p>}
        </form>
      </section>
    </div>
  );
}
