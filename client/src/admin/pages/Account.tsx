import React, { useState } from "react";
import { fileToDataURL, STORE_KEYS } from "../store";
import { getTempAdmin, setTempAdmin, sha256 } from "../state"; // mevcut yardımcılar

export default function Account() {
  const temp = getTempAdmin();
  const [username, setUsername] = useState(temp?.username || "");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [avatar, setAvatar] = useState<string | undefined>(
    localStorage.getItem(STORE_KEYS.ADMIN_AVATAR) || undefined
  );
  const [msg, setMsg] = useState("");

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return setMsg("Username boş olamaz.");
    if (p1 && p1.length < 6) return setMsg("Şifre en az 6 karakter olmalı.");
    if (p1 && p1 !== p2) return setMsg("Şifreler eşleşmiyor.");

    const passHash = p1 ? await sha256(p1) : temp?.passHash || "";
    setTempAdmin({ username: username.trim(), passHash });
    setMsg("Hesap güncellendi ✔");
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await fileToDataURL(f);
    setAvatar(url);
    localStorage.setItem(STORE_KEYS.ADMIN_AVATAR, url);
  }

  return (
    <div>
      <h2>Hesabım</h2>
      <form className="admin-form" onSubmit={onSave}>
        <label className="admin-label">Avatar</label>
        <input
          className="admin-input"
          type="file"
          accept="image/*"
          onChange={onPickAvatar}
        />
        {avatar && (
          <div style={{ marginTop: 8 }}>
            <img
              src={avatar}
              alt="avatar"
              style={{ height: 64, width: 64, borderRadius: 12 }}
            />
          </div>
        )}

        <label className="admin-label">Username</label>
        <input
          className="admin-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label className="admin-label">Yeni şifre</label>
        <input
          className="admin-input"
          type="password"
          value={p1}
          onChange={(e) => setP1(e.target.value)}
        />

        <label className="admin-label">Şifre tekrar</label>
        <input
          className="admin-input"
          type="password"
          value={p2}
          onChange={(e) => setP2(e.target.value)}
        />

        <button className="admin-btn" type="submit">
          Kaydet
        </button>
        {msg && <p className="admin-msg">{msg}</p>}
      </form>
    </div>
  );
}
