import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Account.css";
import { api, getToken } from "../lib/api";

type Me = {
  id: number;
  email: string;
  username: string;
  phone?: string;
  countryDial?: string;
  membershipNotify?: boolean;
};

export default function AccountSettings() {
  const nav = useNavigate();
  const [tab, setTab] = useState<"account" | "settings">("account");
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);

  // düzenlenebilir alanlar
  const [phone, setPhone] = useState("");

  // şifre
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showNew2, setShowNew2] = useState(false);

  // membership notify
  const [notify, setNotify] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      nav("/login", { replace: true });
      return;
    }
    (async () => {
      try {
        const data = await api<Me>("/api/account/user-me", { auth: true });
        setMe(data);
        setPhone(data.phone || "");
        setNotify(!!data.membershipNotify);
      } catch (e: any) {
        // 401/403 → oturumsuz; diğer hatalarda uyarı göster
        const msg = e?.message?.toLowerCase?.() || "";
        if (msg.includes("unauthorized") || msg.includes("401") || msg.includes("forbidden") || msg.includes("403")) {
          nav("/login", { replace: true });
          return;
        }
        console.error(e);
        alert("Hesap bilgileri alınamadı.");
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
      alert("Profil güncellendi.");
    } catch (e: any) {
      alert(e?.message || "Güncelleme başarısız.");
    }
  }

  async function changePassword() {
    try {
      if (newPass.length < 6)
        throw new Error("Yeni şifre en az 6 karakter olmalı.");
      if (newPass !== newPass2) throw new Error("Yeni şifreler eşleşmiyor.");
      await api("/api/account/user-change-password", {
        method: "POST",
        auth: true,
        body: { current_password: curPass, new_password: newPass },
      });
      setCurPass("");
      setNewPass("");
      setNewPass2("");
      alert("Şifre değiştirildi.");
    } catch (e: any) {
      alert(e?.message || "Şifre değiştirilemedi.");
    }
  }

  async function toggleMembershipNotify(next: boolean) {
    try {
      await api("/api/account/user-notify-membership", {
        method: "POST",
        auth: true,
        body: { notify: next },
      });
      setNotify(next);
    } catch (e: any) {
      alert(e?.message || "Tercih kaydedilemedi.");
    }
  }

  async function deleteAccount() {
    const ok = prompt('Hesabı kalıcı olarak silmek için "SİL" yazınız.');
    if (ok !== "SİL") return;
    try {
      await api("/api/account/user-delete", { method: "DELETE", auth: true });
      localStorage.removeItem("token");
      localStorage.removeItem("me");
      alert("Hesabın silindi.");
      nav("/", { replace: true });
    } catch (e: any) {
      alert(e?.message || "Silme başarısız.");
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
    <div className="account-wrapper">
      <div className="account-layout reveal reveal--up">
        {/* SOL MENÜ */}
        <aside className="side">
          <button
            className="side-item"
            onClick={() => {
              window.location.replace("/");
            }}
          >
            Ana Sayfa
          </button>
          <button
            className={`side-item ${tab === "account" ? "active" : ""}`}
            onClick={() => setTab("account")}
          >
            Hesap
          </button>
          {/* <button
            className={`side-item ${tab === "settings" ? "active" : ""}`}
            onClick={() => setTab("settings")}
          >
            Ayarlar
          </button> */}
        </aside>

        {/* İÇERİK */}
        <section className="content">
          {tab === "account" && (
            <div className="stack">
              {/* ÖZET */}
              <div className="panel panel-form">
                <h3>Hesap Özeti</h3>
                <p>
                  Sadece Telefon numaranızı düzenleyebilirsiniz.
                </p>
                <br />
                <div className="grid">
                  <div>
                    <label>E-posta</label>
                    <input value={me.email} disabled />
                  </div>
                  <div>
                    <label>Kullanıcı Adı</label>
                    <input value={me.username} disabled />
                  </div>
                  <div>
                    <label>Telefon (opsiyonel)</label>
                    <input
                      placeholder="5xx xxx xx xx veya +90…"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="row-end">
                  <button className="primary-btn" onClick={saveProfile}>
                    Kaydet
                  </button>
                </div>
              </div>

              {/* ŞİFRE */}
              <div className="panel panel-form panel-password">
                <h3>Şifre Değiştir</h3>

                <div className="form-grid form-grid-3">
                  <div className="field">
                    <label>Mevcut Şifre</label>
                    <div className="input-affix">
                      <input
                        type={showCur ? "text" : "password"}
                        value={curPass}
                        onChange={(e) => setCurPass(e.target.value)}
                      />
                      <button
                        type="button"
                        className="input-suffix-btn"
                        onClick={() => setShowCur((s) => !s)}
                        aria-label={
                          showCur ? "Şifreyi gizle" : "Şifreyi göster"
                        }
                        title={showCur ? "Gizle" : "Göster"}
                      >
                        👁
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label>Yeni Şifre</label>
                    <div className="input-affix">
                      <input
                        type={showNew ? "text" : "password"}
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                      />
                      <button
                        type="button"
                        className="input-suffix-btn"
                        onClick={() => setShowNew((s) => !s)}
                        aria-label={
                          showNew ? "Şifreyi gizle" : "Şifreyi göster"
                        }
                        title={showNew ? "Gizle" : "Göster"}
                      >
                        👁
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label>Yeni Şifre (tekrar)</label>
                    <div className="input-affix">
                      <input
                        type={showNew2 ? "text" : "password"}
                        value={newPass2}
                        onChange={(e) => setNewPass2(e.target.value)}
                      />
                      <button
                        type="button"
                        className="input-suffix-btn"
                        onClick={() => setShowNew2((s) => !s)}
                        aria-label={
                          showNew2 ? "Şifreyi gizle" : "Şifreyi göster"
                        }
                        title={showNew2 ? "Gizle" : "Göster"}
                      >
                        👁
                      </button>
                    </div>
                  </div>
                </div>

                <div className="row-end">
                  <button className="secondary-btn" onClick={changePassword}>
                    Şifreyi Güncelle
                  </button>
                </div>
              </div>

              {/* ÜYELİK BİLGİLENDİRME */}
              <div className="panel panel-form">
                <h3>Üyelik Bilgilendirme Talebi</h3>
                <p>
                  İleride para yatırmalı üyelik sistemi aktif olduğunda e-posta
                  ile bilgilendirilmek istersen bu anahtarı aç.
                </p>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notify}
                    onChange={(e) => toggleMembershipNotify(e.target.checked)}
                  />
                  <span className="slider" />
                </label>
              </div>

              {/* HESABI SİL */}
              <div className="panel danger">
                <h3>Hesabı Sil</h3>
                <p>
                  Bu işlem geri alınamaz. Tüm verilerin kalıcı olarak silinir.
                </p>
                <button className="danger-btn" onClick={deleteAccount}>
                  Hesabımı Sil
                </button>
              </div>
            </div>
          )}

          {tab === "settings" && (
            <div className="panel panel-form">
              <h3>Ayarlar</h3>
              <p>
                Şimdilik boş. (Öneri: Bildirim tercihleri, dil/tema, oturum
                yönetimi, güvenlik kayıtları, 2FA.)
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
