import { useMemo, useState } from "react";
import { getUsers, saveUsers, uid, type UserRow } from "../store";

export default function Users() {
  const [rows, setRows] = useState<UserRow[]>(getUsers());
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.username.toLowerCase().includes(s));
  }, [q, rows]);

  function persist(next: UserRow[]) {
    setRows(next);
    saveUsers(next);
  }

  function onAdd() {
    const username = prompt("Yeni kullanıcı adı?");
    if (!username) return;
    const next: UserRow = {
      id: uid("u"),
      username,
      role: "viewer",
      createdAt: new Date().toISOString(),
      active: true,
    };
    persist([next, ...rows]);
  }

  function onRole(id: string) {
    const role = prompt("Rol (admin/editor/viewer)?", "viewer") as any;
    if (!role) return;
    persist(rows.map((r) => (r.id === id ? { ...r, role } : r)));
  }

  function onToggle(id: string) {
    persist(rows.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
  }

  function onDelete(id: string) {
    if (!confirm("Silinsin mi?")) return;
    persist(rows.filter((r) => r.id !== id));
  }

  return (
    <div>
      <h2>Kullanıcılar</h2>
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
          Kullanıcı Ekle
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Rol</th>
              <th>Durum</th>
              <th>Oluşturma</th>
              <th style={{ width: 220 }}>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.username}</td>
                <td>{r.role}</td>
                <td>{r.active ? "Aktif" : "Pasif"}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  <button className="admin-btn" onClick={() => onRole(r.id)}>
                    Rol
                  </button>{" "}
                  <button className="admin-btn" onClick={() => onToggle(r.id)}>
                    {r.active ? "Pasifleştir" : "Aktifleştir"}
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
    </div>
  );
}
