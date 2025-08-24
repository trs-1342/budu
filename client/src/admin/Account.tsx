import { useEffect, useState } from "react";
import { AuthAPI, uploadFile } from "../lib/api";

export default function Account() {
  const [me, setMe] = useState<any>(null);
  const [un, setUn] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    AuthAPI.me().then((u) => {
      setMe(u);
      setUn(u?.username || "");
    });
  }, []);

  async function onAvatar(f?: File) {
    if (!f) return;
    const { url } = await uploadFile(f);
    await AuthAPI.updateMe({ username: un || me.username, avatar_url: url });
    const u = await AuthAPI.me();
    setMe(u);
    setMsg("Avatar güncellendi ✔");
  }
  async function onSaveUser(e: React.FormEvent) {
    e.preventDefault();
    await AuthAPI.updateMe({
      username: un,
      avatar_url: me?.avatar_url || null,
    });
    const u = await AuthAPI.me();
    setMe(u);
    setMsg("Profil güncellendi ✔");
  }
  async function onChangePass(e: React.FormEvent) {
    e.preventDefault();
    if (p1 !== p2) return setMsg("Şifreler eşleşmiyor");
    await AuthAPI.changePassword({
      currentPassword: prompt("Mevcut şifre?") || "",
      newPassword: p1,
    });
    setP1("");
    setP2("");
    setMsg("Şifre değiştirildi ✔");
  }

  if (!me) return null;

  return (
    <>
      <form className="admin-form" onSubmit={onSaveUser}>
        <label className="admin-label">Avatar</label>
        <input
          type="file"
          onChange={(e) => onAvatar(e.target.files?.[0] || undefined)}
        />
        {me.avatar_url && (
          <img src={me.avatar_url} style={{ height: 72, margin: "6px 0" }} />
        )}

        <label className="admin-label">Username</label>
        <input
          className="admin-input"
          value={un}
          onChange={(e) => setUn(e.target.value)}
        />
        <button className="admin-btn" style={{ marginTop: 12 }}>
          Kaydet
        </button>
      </form>

      <form
        className="admin-form"
        onSubmit={onChangePass}
        style={{ marginTop: 24 }}
      >
        <label className="admin-label">Yeni şifre</label>
        <input
          className="admin-input"
          type="password"
          value={p1}
          onChange={(e) => setP1(e.target.value)}
        />
        <label className="admin-label">Şifre tekrar</label>
        <input
          className="admin-input"
          type="password"
          value={p2}
          onChange={(e) => setP2(e.target.value)}
        />
        <button className="admin-btn" style={{ marginTop: 12 }}>
          Şifreyi Güncelle
        </button>
      </form>
      {msg && <p className="admin-msg">{msg}</p>}
    </>
  );
}
