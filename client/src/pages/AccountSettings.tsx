import { useEffect, useState } from "react";
import { replace, useNavigate } from "react-router-dom";
import "../css/Account.css";
import { api, getToken, getAccess } from "../lib/api";

type Me = {
  id: number;
  email: string;
  username: string;
  phone?: string;
  membershipNotify?: boolean;
};

export default function AccountSettings() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [phone, setPhone] = useState("");
  const [notify, setNotify] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // şifre
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // hesap silme
  const [deleteMode, setDeleteMode] = useState(false);
  const [delPass, setDelPass] = useState("");

  useEffect(() => {
    if (!getAccess() && !getToken()) {
      nav("/login", { replace: true });
      return;
    }
    (async () => {
      try {
        const data = await api<Me>("/api/account/user-me", { auth: true });
        setMe(data);
        setPhone(data.phone || "");
        setNotify(!!data.membershipNotify);
        setTheme(data.theme === "dark" ? "dark" : "light");
      } catch {
        nav("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  async function saveProfile() {
    try {
      await api("/api/account/user-update", {
        method: "PATCH",
        auth: true,
        body: { phone },
      });
      alert("Telefon güncellendi.");
    } catch (e: any) {
      alert(e.message || "Güncelleme başarısız.");
    }
  }

  async function changePassword() {
    try {
      if (newPass.length < 6)
        throw new Error("Yeni şifre en az 6 karakter olmalı.");
      await api("/api/account/user-change-password", {
        method: "POST",
        auth: true,
        body: { current_password: curPass, new_password: newPass },
      });
      setCurPass("");
      setNewPass("");
      alert("Şifre değiştirildi.");
    } catch (e: any) {
      alert(e.message || "Şifre değiştirilemedi.");
    }
  }

  async function toggleNotify(next: boolean) {
    try {
      await api("/api/account/user-notify-membership", {
        method: "POST",
        auth: true,
        body: { notify: next },
      });
      setNotify(next);
    } catch (e: any) {
      alert(e.message || "Tercih kaydedilemedi.");
    }
  }

  async function deleteAccount() {
    try {
      await api("/api/account/user-delete", {
        method: "DELETE",
        auth: true,
        body: { password: delPass },
      });
      localStorage.removeItem("token");
      alert("Hesabın silindi.");
      nav("/", { replace: true });
    } catch (e: any) {
      alert(e.message || "Silme başarısız.");
    }
  }

  async function onToggleNotify(next: boolean) {
    try {
      await api("/api/account/user-update", {
        method: "PATCH",
        body: { membershipNotify: next },
      });
      setNotify(next);
    } catch (e: any) {
      alert(e?.message || "Tercih kaydedilemedi.");
    }
  }

  async function onChangeTheme(next: "light" | "dark") {
    const prev = theme;
    setTheme(next); // UI anlık değişsin
    try {
      await api("/api/account/user-update", {
        method: "PATCH",
        body: { theme: next },
      });
    } catch (e: any) {
      setTheme(prev); // geri al
      alert(e?.message || "Tema kaydedilemedi.");
    }
  }

  if (loading)
    return (
      <div className="account-wrapper">
        <div className="account-card">Yükleniyor…</div>
      </div>
    );
  if (!me) return null;

  return (
    <div className={`account-page ${theme}`}>
      <header className="account-header">
        <button
          className="home-btn"
          onClick={() => {
            // tam sayfa yenilemesi ile ana sayfaya yönlendir
            window.location.replace("/");
          }}
        >
          🏠
        </button>
        <h2>Hesap Ayarları</h2>
      </header>

      <main className="account-container">
        {/* kullanıcı bilgileri */}
        <section className="card">
          <h3>Kullanıcı Bilgileri</h3>
          <div className="grid">
            <div>
              <label>E-posta</label>
              <input id="disableinp" value={me.email} disabled />
            </div>
            <div>
              <label>Kullanıcı Adı</label>
              <input id="disableinp" value={me.username} disabled />
            </div>
            <div>
              <label>Telefon</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90..."
              />
            </div>
          </div>
          <div className="row-end">
            <button onClick={saveProfile}>Kaydet</button>
          </div>
        </section>

        {/* şifre */}
        <section className="card">
          <h3>Şifre Değiştir</h3>
          <div className="grid">
            <div>
              <label>Mevcut Şifre</label>
              <div className="input-affix">
                <input
                  type={showCur ? "text" : "password"}
                  value={curPass}
                  onChange={(e) => setCurPass(e.target.value)}
                />
                <button onClick={() => setShowCur((s) => !s)}>👁</button>
              </div>
            </div>
            <div>
              <label>Yeni Şifre</label>
              <div className="input-affix">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
                <button onClick={() => setShowNew((s) => !s)}>👁</button>
              </div>
            </div>
          </div>
          <div className="row-end">
            <button className="secondary" onClick={changePassword}>
              Güncelle
            </button>
          </div>
        </section>

        {/* ayarlar */}
        {/* <section className="card">
          <h3>Ayarlar</h3>
          <div className="settings-row">
            <div>
              <label>Bildirimler</label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={notify}
                  onChange={(e) => toggleNotify(e.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>

            <div>
              <label>Tema</label>
              <select
                value={theme}
                onChange={(e) =>
                  setTheme(e.target.value as "light" | "dark")
                }
              >
                <option value="light">Açık</option>
                <option value="dark">Koyu</option>
              </select>
            </div>
          </div>
        </section> */}

        {/* hesap silme */}

        <div className="panel panel-form">
          <h3>Ayarlar</h3>

          <div className="settings-list">
            {/* Bildirimler */}
            <div className="setting-item">
              <div className="setting-text">
                <div className="setting-title">Bildirimler</div>
                <div className="setting-desc">
                  Yeni yazı veya video yayınlandığında bilgi ver.
                </div>
              </div>

              <button
                type="button"
                className={`toggle ${notify ? "on" : ""}`}
                aria-pressed={notify}
                aria-label={notify ? "Bildirimleri kapat" : "Bildirimleri aç"}
                onClick={() => onToggleNotify(!notify)}
              >
                <span className="track" />
                <span className="thumb" />
              </button>
            </div>

            {/* Tema */}
            <div className="setting-item">
              <div className="setting-text">
                <div className="setting-title">Tema</div>
                <div className="setting-desc">
                  Bu ayar sadece bu sayfada uygulanır.
                </div>
              </div>

              <div className="seg" role="tablist" aria-label="Tema seçici">
                <button
                  type="button"
                  role="tab"
                  aria-selected={theme === "light"}
                  className={`seg-btn ${theme === "light" ? "active" : ""}`}
                  onClick={() => onChangeTheme("light")}
                  title="Açık tema"
                >
                  ☀️ <span>Açık</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={theme === "dark"}
                  className={`seg-btn ${theme === "dark" ? "active" : ""}`}
                  onClick={() => onChangeTheme("dark")}
                  title="Koyu tema"
                >
                  🌙 <span>Koyu</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <section className="card danger">
          <h3>Hesabı Sil</h3>
          {!deleteMode && (
            <button className="danger-btn" onClick={() => setDeleteMode(true)}>
              Hesabı Sil
            </button>
          )}
          {deleteMode && (
            <div className="delete-box">
              <p>Şifreni girerek hesabını kalıcı olarak silebilirsin:</p>
              <input
                type="password"
                placeholder="Şifre"
                value={delPass}
                onChange={(e) => setDelPass(e.target.value)}
              />
              <div className="row-end">
                <button onClick={() => setDeleteMode(false)}>Vazgeç</button>
                <button className="danger-btn" onClick={deleteAccount}>
                  Onayla ve Sil
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
