import { useMemo, useState } from "react";
import { getPages, savePages, uid, type PageRow } from "../store";

function slugify(path: string) {
  let s = path.trim();
  if (!s.startsWith("/")) s = "/" + s;
  s = s
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-/]/g, "")
    .toLowerCase();
  return s;
}

export default function Pages() {
  const [rows, setRows] = useState<PageRow[]>(getPages());
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(s) || r.path.toLowerCase().includes(s)
    );
  }, [q, rows]);

  function persist(next: PageRow[]) {
    setRows(next);
    savePages(next);
  }

  function onAdd() {
    const title = prompt("Sayfa başlığı?");
    if (!title) return;
    const path = slugify(
      prompt("Yol (/about gibi)?", "/" + title) || "/" + title
    );
    const now = new Date().toISOString();
    const next: PageRow = {
      id: uid("p"),
      title,
      path,
      published: true,
      createdAt: now,
      updatedAt: now,
    };
    persist([next, ...rows]);
  }

  function onToggle(id: string) {
    persist(
      rows.map((r) =>
        r.id === id
          ? {
              ...r,
              published: !r.published,
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );
  }

  function onEdit(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const title = prompt("Yeni başlık?", row.title) || row.title;
    const path = slugify(prompt("Yeni yol?", row.path) || row.path);
    persist(
      rows.map((r) =>
        r.id === id
          ? { ...r, title, path, updatedAt: new Date().toISOString() }
          : r
      )
    );
  }

  function onDelete(id: string) {
    if (!confirm("Silinsin mi?")) return;
    persist(rows.filter((r) => r.id !== id));
  }

  return (
    <div>
      <h2>Sayfalar</h2>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          margin: "8px 0 12px",
        }}
      >
        <input
          className="admin-input"
          placeholder="Ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="admin-btn" onClick={onAdd}>
          Yeni Sayfa
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Başlık</th>
              <th>Yol</th>
              <th>Durum</th>
              <th>Güncelleme</th>
              <th style={{ width: 260 }}>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.path}</td>
                <td>{r.published ? "Yayında" : "Taslak"}</td>
                <td>
                  {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}
                </td>
                <td>
                  <button className="admin-btn" onClick={() => onToggle(r.id)}>
                    {r.published ? "Taslağa Al" : "Yayınla"}
                  </button>{" "}
                  <button className="admin-btn" onClick={() => onEdit(r.id)}>
                    Düzenle
                  </button>{" "}
                  <button className="admin-btn" onClick={() => onDelete(r.id)}>
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="admin-msg" style={{ marginTop: 8 }}>
        Not: Bu liste veri tutar; gerçek sayfa içeriği ve dinamik route ekleme,
        backend ve CMS ile bağlandığında gelecek.
      </p>
    </div>
  );
}
