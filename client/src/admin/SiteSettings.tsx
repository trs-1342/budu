import { useEffect, useState } from "react";
import { SettingsAPI, uploadSettingSlot } from "../lib/api";

type Settings = { site_name: string; logo_url: string; home_photo_url: string };
const EMPTY: Settings = { site_name: "", logo_url: "", home_photo_url: "" };

function broadcast(s: Partial<Settings>) {
  // title + favicon
  if (s.site_name) document.title = s.site_name;
  if (s.logo_url) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = s.logo_url;
  }
  // diğer componentler dinleyebilsin
  window.dispatchEvent(new CustomEvent("budu-settings-updated", { detail: s }));
}

export default function SiteSettings() {
  const [form, setForm] = useState<Settings>(EMPTY);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    SettingsAPI.get()
      .then((d) =>
        setForm({
          site_name: d?.site_name ?? "",
          logo_url: d?.logo_url ?? "",
          home_photo_url: d?.home_photo_url ?? "",
        })
      )
      .catch(() => {});
  }, []);

  async function pickLogo(f?: File) {
    if (!f) return;
    const { url } = await uploadSettingSlot(f, "logo");
    setForm((s) => ({ ...s, logo_url: url }));
    broadcast({ ...form, logo_url: url }); // anlık güncelle
  }
  async function pickHome(f?: File) {
    if (!f) return;
    const { url } = await uploadSettingSlot(f, "photo");
    setForm((s) => ({ ...s, home_photo_url: url }));
    broadcast({ ...form, home_photo_url: url }); // anlık güncelle
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await SettingsAPI.update({ site_name: form.site_name });
    setMsg("Kaydedildi ✔");
    broadcast(form); // anlık güncelle
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      <label className="admin-label">Site adı</label>
      <input
        className="admin-input"
        value={form.site_name}
        onChange={(e) => setForm({ ...form, site_name: e.target.value })}
      />

      <label className="admin-label">Logo (yalnızca 1 dosya tutulur)</label>
      <input type="file" onChange={(e) => pickLogo(e.target.files?.[0])} />
      {form.logo_url && (
        <img src={form.logo_url} style={{ height: 48, marginTop: 6 }} />
      )}

      <label className="admin-label">Anasayfa fotoğrafı</label>
      <input type="file" onChange={(e) => pickHome(e.target.files?.[0])} />
      {form.home_photo_url && (
        <img src={form.home_photo_url} style={{ height: 90, marginTop: 6 }} />
      )}

      <button className="admin-btn" style={{ marginTop: 12 }}>
        Kaydet
      </button>
      {msg && <p className="admin-msg">{msg}</p>}
    </form>
  );
}
