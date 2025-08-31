import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../auth/api";

type Role = "admin" | "editor" | "viewer";
type Model = {
  id?: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

export default function UserEdit({ create }: { create?: boolean }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [m, setM] = useState<Model>({
    username: "",
    name: "",
    email: "",
    role: "viewer",
    active: true,
  });
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!create && id)
      api.get(`/admin/users/${id}`).then(({ data }) => setM(data));
  }, [create, id]);

  const save = async () => {
    if (create) {
      await api.post("/admin/users", { ...m, password: pwd });
    } else {
      await api.patch(`/admin/users/${id}`, {
        name: m.name,
        email: m.email,
        role: m.role,
        active: m.active,
      });
      if (pwd)
        await api.post(`/admin/users/${id}/password`, { newPassword: pwd });
    }
    setMsg("Kaydedildi.");
    setTimeout(() => nav("..", { replace: true }), 600);
  };

  const remove = async () => {
    if (!id) return;
    await api.delete(`/admin/users/${id}`);
    nav("..", { replace: true });
  };

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
      <h3>{create ? "Kullanıcı ekle" : "Kullanıcı düzenle"}</h3>

      <label className="admin-label">Username (değiştirilemez)</label>
      <input
        className="admin-input"
        value={m.username}
        onChange={(e) => setM({ ...m, username: e.target.value })}
        readOnly={!create}
      />

      <label className="admin-label">Ad Soyad</label>
      <input
        className="admin-input"
        value={m.name}
        onChange={(e) => setM({ ...m, name: e.target.value })}
      />

      <label className="admin-label">E-posta</label>
      <input
        className="admin-input"
        value={m.email}
        onChange={(e) => setM({ ...m, email: e.target.value })}
      />

      <label className="admin-label">Rol</label>
      <select
        className="admin-input"
        value={m.role}
        onChange={(e) => setM({ ...m, role: e.target.value as Role })}
      >
        <option value="admin">Admin</option>
        <option value="editor">Editor</option>
        <option value="viewer">Viewer</option>
      </select>

      <label className="admin-label">Durum</label>
      <select
        className="admin-input"
        value={m.active ? "1" : "0"}
        onChange={(e) => setM({ ...m, active: e.target.value === "1" })}
      >
        <option value="1">Aktif</option>
        <option value="0">Pasif</option>
      </select>

      <label className="admin-label">
        {create ? "Şifre" : "Yeni Şifre (ops.)"}
      </label>
      <input
        className="admin-input"
        type="password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {!create && (
          <button
            className="admin-btn"
            onClick={remove}
            style={{ background: "#ffdbdb" }}
          >
            Sil
          </button>
        )}
        <button className="admin-btn" onClick={save}>
          Kaydet
        </button>
      </div>

      {msg && <div className="admin-msg">{msg}</div>}
    </div>
  );
}
