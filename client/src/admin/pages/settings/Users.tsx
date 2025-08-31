import { useEffect, useState } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { api } from "../../auth/api";
import UserEdit from "./UserEdit";

type Row = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  active: boolean;
};

function List() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("");

  const load = () =>
    api
      .get("/admin/users", { params: { q, role } })
      .then(({ data }) => setRows(data.items || []));
  useEffect(() => {
    load();
  }, [q, role]);

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          className="admin-input"
          placeholder="Ara (ad, email, username)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="admin-input"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Tümü</option>
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
        <NavLink
          to="new"
          className="admin-btn"
          style={{
            textDecoration: "none",
            display: "inline-grid",
            placeItems: "center",
          }}
        >
          Kullanıcı ekle
        </NavLink>
      </div>

      <div className="admin-table">
        <div className="admin-thead">
          <span>Username</span>
          <span>Ad</span>
          <span>Rol</span>
          <span>Durum</span>
          <span>Aksiyon</span>
        </div>
        {rows.map((r) => (
          <div key={r.id} className="admin-row">
            <span>{r.username}</span>
            <span>{r.name}</span>
            <span>{r.role}</span>
            <span>{r.active ? "Aktif" : "Pasif"}</span>
            <span>
              <NavLink to={r.id}>Düzenle</NavLink>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Users() {
  return (
    <Routes>
      <Route index element={<List />} />
      <Route path="new" element={<UserEdit create />} />
      <Route path=":id" element={<UserEdit />} />
    </Routes>
  );
}
