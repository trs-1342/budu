import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./admin.css";
import { getTempAdmin, isGateOpen, setTempAdmin, sha256 } from "./state";

export default function SetupTempAccount() {
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!isGateOpen()) nav("/admin/gate", { replace: true });
    const exists = getTempAdmin();
    if (exists) {
      setU(exists.username);
      setMsg("Geçici hesap zaten var. İstersen güncelleyebilirsin.");
    }
  }, [nav]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!u.trim()) return setMsg("Username boş olamaz.");
    if (p1.length < 6) return setMsg("Şifre en az 6 karakter olmalı.");
    if (p1 !== p2) return setMsg("Şifreler eşleşmiyor.");
    const passHash = await sha256(p1);
    setTempAdmin({ username: u.trim(), passHash });
    setMsg("Geçici hesap oluşturuldu. Giriş sayfasına yönlendiriliyorsun…");
    setTimeout(() => nav("/admin/login", { replace: true }), 600);
  };

  return (
    <div className="admin-wrap">
      <div className="admin-noise" aria-hidden />
      <section className="admin-card">
        <header className="admin-head">
          <h1>Geçici Hesap</h1>
          <p>Username & Password belirle</p>
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
          />

          <button className="admin-btn" type="submit">
            Oluştur
          </button>
          {msg && <p className="admin-msg">{msg}</p>}
        </form>
      </section>
    </div>
  );
}
