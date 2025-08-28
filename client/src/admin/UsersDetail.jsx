import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { UsersAPI } from "../lib/api";

export default function UserDetail(){
  const { id } = useParams();
  const [u, setU] = useState(null);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("viewer");
  const [status, setStatus] = useState("active");
  const load = async()=> {
    const d = await UsersAPI.get(id); setU(d); setUsername(d.username); setRole(d.role); setStatus(d.status);
  };
  useEffect(()=>{ load(); }, [id]);

  async function onSave(e){
    e.preventDefault();
    await UsersAPI.update(id, { username, role, status, avatar_url: u.avatar_url || null });
    await load();
    alert("Güncellendi");
  }
  if(!u) return null;

  return (
    <form className="admin-form" onSubmit={onSave}>
      <h3 className="admin-logo">Kullanıcı Detayı</h3>
      <label className="admin-label">Username</label>
      <input className="admin-input" value={username} onChange={(e)=>setUsername(e.target.value)} />
      <label className="admin-label">Rol</label>
      <select className="admin-input" value={role} onChange={(e)=>setRole(e.target.value)}>
        <option value="admin">admin</option><option value="editor">editor</option><option value="viewer">viewer</option>
      </select>
      <label className="admin-label">Durum</label>
      <select className="admin-input" value={status} onChange={(e)=>setStatus(e.target.value)}>
        <option value="active">active</option><option value="disabled">disabled</option>
      </select>
      <button className="admin-btn" style={{marginTop:12}}>Kaydet</button>
    </form>
  );
}
