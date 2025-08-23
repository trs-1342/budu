import React, { useState } from "react";
import { fileToDataURL, getSite, setSite } from "../store";

export default function SiteSettings() {
  const [siteName, setSiteName] = useState(getSite().siteName || "Budu");
  const [logo, setLogo] = useState<string | undefined>(getSite().logoDataUrl);
  const [hero, setHero] = useState<string | undefined>(
    getSite().heroPhotoDataUrl
  );
  const [msg, setMsg] = useState("");

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await fileToDataURL(f);
    setLogo(url);
  }
  async function onPickHero(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await fileToDataURL(f);
    setHero(url);
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSite({
      siteName: siteName.trim() || "Budu",
      logoDataUrl: logo,
      heroPhotoDataUrl: hero,
    });
    setMsg("Kaydedildi ✔ Anasayfa ve header dinamik değeri kullanacak.");
  }

  return (
    <div>
      <h2>Site Ayarları</h2>
      <form className="admin-form" onSubmit={onSave}>
        <label className="admin-label">Site adı</label>
        <input
          className="admin-input"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
        />

        <label className="admin-label">Logo (PNG/JPG/SVG)</label>
        <input
          className="admin-input"
          type="file"
          accept="image/*"
          onChange={onPickLogo}
        />
        {logo && (
          <div style={{ marginTop: 8 }}>
            <img
              src={logo}
              alt="logo preview"
              style={{
                height: 48,
                background: "#111",
                padding: 6,
                borderRadius: 10,
              }}
            />
          </div>
        )}

        <label className="admin-label">
          Anasayfa fotoğrafı (buduPhoto yerine geçer)
        </label>
        <input
          className="admin-input"
          type="file"
          accept="image/*"
          onChange={onPickHero}
        />
        {hero && (
          <div style={{ marginTop: 8 }}>
            <img
              src={hero}
              alt="hero preview"
              style={{
                height: 80,
                background: "#111",
                padding: 6,
                borderRadius: 10,
              }}
            />
          </div>
        )}

        <button className="admin-btn" type="submit">
          Kaydet
        </button>
        {msg && <p className="admin-msg">{msg}</p>}
      </form>
    </div>
  );
}
