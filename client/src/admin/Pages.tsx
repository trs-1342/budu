import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { PagesAPI } from "../lib/api";

type Row = {
  id: number;
  title: string;
  path: string;
  is_active: boolean;
  show_in_menu: boolean;
  order_index: number;
  updatedAt: string;
};

export default function Pages() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const load = async () => {
    const d = await PagesAPI.list(q);
    setRows(d);
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q]);

  const list = useMemo(() => rows, [rows]);

  async function onAdd() {
    const title = prompt("Başlık?");
    const path = prompt("Yol? (/handbook gibi)");
    if (!title || !path) return;
    await PagesAPI.create({
      title,
      path,
      is_active: true,
      show_in_menu: true,
      order_index: rows.length,
    });
    await load();
  }
  async function onEdit(id: number, prev: Row) {
    nav(`/admin/pages/${id}`); // artık ayrı detay sayfasına gidiyoruz
  }
  async function onToggleActive(id: number) {
    await PagesAPI.toggleActive(String(id));
    await load();
  }
  async function onToggleMenu(id: number) {
    await PagesAPI.toggleMenu(String(id));
    await load();
  }
  async function onDelete(id: number) {
    if (confirm("Silinsin mi?")) {
      await PagesAPI.remove(String(id));
      await load();
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <input
          className="admin-input"
          placeholder="Ara..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="admin-btn" onClick={onAdd}>
          Yeni Sayfa
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Başlık</th>
            <th>Yol</th>
            <th>Durum</th>
            <th>Menü</th>
            <th>Güncelleme</th>
            <th>Aksiyon</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id}>
              <td>{p.title}</td>
              <td>{p.path}</td>
              <td>{p.is_active ? "Aktif" : "Pasif"}</td>
              <td>{p.show_in_menu ? "Menüde" : "Menüde değil"}</td>
              <td>{new Date(p.updatedAt).toLocaleString()}</td>
              <td style={{ display: "flex", gap: 8 }}>
                <button
                  className="admin-logout"
                  onClick={() => onEdit(p.id, p)}
                >
                  Düzenle
                </button>
                <button
                  className="admin-logout"
                  onClick={() => onToggleActive(p.id)}
                >
                  {p.is_active ? "Devre dışı" : "Etkinleştir"}
                </button>
                <button
                  className="admin-logout"
                  onClick={() => onToggleMenu(p.id)}
                >
                  {p.show_in_menu ? "Menüden çıkar" : "Menüye ekle"}
                </button>
                <button className="admin-logout" onClick={() => onDelete(p.id)}>
                  Sil
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
