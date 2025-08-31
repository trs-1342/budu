import { useState } from "react";
import { authStore } from "../../auth/store";
import { api } from "../../auth/api";

export default function Account() {
  const { user, setAuth } = authStore();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");
  const [msg, setMsg] = useState("");

  const saveProfile = async () => {
    const { data } = await api.patch("/admin/me", { name, email });
    setAuth(authStore.getState().accessToken!, {
      ...authStore.getState().user!,
      ...data,
    });
    setMsg("Profil güncellendi.");
  };

  const changePassword = async () => {
    if (pass1.length < 6) return setMsg("Şifre en az 6 karakter.");
    if (pass1 !== pass2) return setMsg("Şifreler eşleşmiyor.");
    await api.post("/admin/me/password", { newPassword: pass1 });
    setPass1("");
    setPass2("");
    setMsg("Şifre güncellendi.");
  };

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 520 }}>
      <div>
        <label className="admin-label">Kullanıcı adı (değiştirilemez)</label>
        <input className="admin-input" value={user?.username || ""} readOnly />
      </div>
      <div>
        <label className="admin-label">Ad Soyad</label>
        <input
          className="admin-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="admin-label">E-posta</label>
        <input
          className="admin-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button className="admin-btn" onClick={saveProfile}>
        Kaydet
      </button>

      <hr style={{ borderColor: "#222" }} />
      <div>
        <label className="admin-label">Yeni şifre</label>
        <input
          className="admin-input"
          type="password"
          value={pass1}
          onChange={(e) => setPass1(e.target.value)}
        />
      </div>
      <div>
        <label className="admin-label">Yeni şifre (tekrar)</label>
        <input
          className="admin-input"
          type="password"
          value={pass2}
          onChange={(e) => setPass2(e.target.value)}
        />
      </div>
      <button className="admin-btn" onClick={changePassword}>
        Şifreyi değiştir
      </button>

      {msg && <div className="admin-msg">{msg}</div>}
    </div>
  );
}
