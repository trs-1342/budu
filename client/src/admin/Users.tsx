import { useEffect, useMemo, useState } from "react";
import { UsersAPI } from "../lib/api";
import { Link } from "react-router-dom";

type Row = {
  id: number;
  username: string;
  role: "admin" | "editor" | "viewer";
  status: "active" | "disabled";
  createdAt: string;
};

export default function Users() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const load = async () => {
    const d = await UsersAPI.list(q);
    setRows(d);
  };

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q]);

  const filtered = useMemo(() => rows, [rows]);

  async function onAdd() {
    const username = prompt("Yeni kullanıcı adı?");
    if (!username) return;
    const password =
      prompt("Geçici şifre (8+ karakter)") || crypto.randomUUID().slice(0, 8);
    await UsersAPI.create({ username, password, role: "viewer" });
    await load();
    alert(`Kullanıcı eklendi. Geçici şifre: ${password}`);
  }
  async function onRole(id: number, prev: "admin" | "editor" | "viewer") {
    const role = prompt("Rol (admin/editor/viewer)?", prev) as any;
    if (!role) return;
    await UsersAPI.update(String(id), { role });
    await load();
  }
  async function onToggle(id: number, status: "active" | "disabled") {
    await UsersAPI.status(
      String(id),
      status === "active" ? "disabled" : "active"
    );
    await load();
  }
  async function onDelete(id: number) {
    if (!confirm("Silinsin mi?")) return;
    await UsersAPI.remove(String(id));
    await load();
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
          Kullanıcı Ekle
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Rol</th>
            <th>Durum</th>
            <th>Oluşturma</th>
            <th>Aksiyon</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.id}>
              <td>
                <Link to={`/admin/users/${u.id}`}>{u.username}</Link>
              </td>
              <td>{u.role}</td>
              <td>{u.status}</td>
              <td>{new Date(u.createdAt).toLocaleString()}</td>
              <td style={{ display: "flex", gap: 8 }}>
                <button
                  className="admin-logout"
                  onClick={() => onRole(u.id, u.role)}
                >
                  Rol
                </button>
                <button
                  className="admin-logout"
                  onClick={() => onToggle(u.id, u.status)}
                >
                  {u.status === "active" ? "Pasifleştir" : "Aktifleştir"}
                </button>
                <button className="admin-logout" onClick={() => onDelete(u.id)}>
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
