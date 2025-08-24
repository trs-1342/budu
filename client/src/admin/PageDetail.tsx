import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { PagesAPI } from "../lib/api";

type PageRow = {
  id: number;
  title: string;
  path: string;
  order_index: number;
  is_active: boolean;
  show_in_menu: boolean;
  updatedAt: string;
};

export default function PageDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState<PageRow | null>(null);
  const [title, setTitle] = useState("");
  const [path, setPath] = useState("");
  const [orderIndex, setOrderIndex] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const d = await PagesAPI.get(id!);
    setP(d);
    setTitle(d?.title ?? "");
    setPath(d?.path ?? "");
    setOrderIndex(Number(d?.order_index ?? 0));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await PagesAPI.update(String(id), {
      title,
      path,
      order_index: Number(orderIndex) || 0,
    });
    setSaving(false);
    setMsg("Kaydedildi ✔");
    await load();
  }

  async function onToggleActive() {
    await PagesAPI.toggleActive(String(id));
    await load();
  }
  async function onToggleMenu() {
    await PagesAPI.toggleMenu(String(id));
    await load();
  }
  async function onDelete() {
    if (!confirm("Bu sayfa silinsin mi?")) return;
    await PagesAPI.remove(String(id));
    nav("/admin/pages", { replace: true });
  }

  if (!p) return null;

  return (
    <div className="admin-form">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3 className="admin-logo">Sayfa Düzenle</h3>
        <Link className="admin-logout" to="/admin/pages">
          ← Listeye dön
        </Link>
      </div>

      <form onSubmit={onSave}>
        <label className="admin-label">Başlık</label>
        <input
          className="admin-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="admin-label">Yol (path)</label>
        <input
          className="admin-input"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/handbook"
        />

        <label className="admin-label">Sıra (order)</label>
        <input
          className="admin-input"
          type="number"
          value={orderIndex}
          onChange={(e) => setOrderIndex(Number(e.target.value))}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="admin-btn" type="submit" disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button
            type="button"
            className="admin-logout"
            onClick={onToggleActive}
          >
            {p.is_active ? "Devre dışı bırak" : "Etkinleştir"}
          </button>
          <button type="button" className="admin-logout" onClick={onToggleMenu}>
            {p.show_in_menu ? "Menüden çıkar" : "Menüye ekle"}
          </button>
          <button type="button" className="admin-logout" onClick={onDelete}>
            Sil
          </button>
        </div>
      </form>

      {msg && (
        <p className="admin-msg" style={{ marginTop: 8 }}>
          {msg}
        </p>
      )}

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>
        <div>
          Durum: <b>{p.is_active ? "Aktif" : "Pasif"}</b> · Menü:{" "}
          <b>{p.show_in_menu ? "Menüde" : "Menüde değil"}</b>
        </div>
        <div>Son güncelleme: {new Date(p.updatedAt).toLocaleString()}</div>
      </div>
    </div>
  );
}
