import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Account.css";
import { useAuth } from "../lib/auth-context";
import { UserApi } from "../lib/api";
import { COUNTRY_DIALS } from "../lib/countries";

type Tab = "settings" | "account";

const NAME_RE = /^[\p{L}\s]+$/u;

function Sidebar({
  active,
  onSelect,
  onLogout,
}: {
  active: Tab;
  onSelect: (t: Tab) => void;
  onLogout: () => void;
}) {
  return (
    <aside className="ac-sidebar">
      <div className="brand">
        <a href="/" className="home-link">
          ← Anasayfa
        </a>
        <h2>Hesabım</h2>
      </div>

      <nav className="ac-nav">
        <button
          className={`nav-item ${active === "settings" ? "active" : ""}`}
          onClick={() => onSelect("settings")}
        >
          Ayarlar
        </button>
        <button
          className={`nav-item ${active === "account" ? "active" : ""}`}
          onClick={() => onSelect("account")}
        >
          Hesap Ayarları
        </button>
      </nav>

      <div className="ac-spacer" />
      <button className="nav-item danger" onClick={onLogout}>
        Çıkış Yap
      </button>
    </aside>
  );
}

export default function Account() {
  const nav = useNavigate();
  const { user, ready, setUser } = useAuth();

  // Sekme
  const [tab, setTab] = useState<Tab>("settings");

  // Tema
  const initialTheme =
    (localStorage.getItem("theme") as "light" | "dark") || "light";
  const [theme, setTheme] = useState<"light" | "dark">(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const [rm, setRm] = useState<{
    fname?: boolean;
    sname?: boolean;
    phone?: boolean;
  }>({});

  function markRemove(key: keyof typeof rm) {
    setRm((r) => ({ ...r, [key]: true }));
  }
  function unmarkRemove(key: keyof typeof rm) {
    if (rm[key]) setRm((r) => ({ ...r, [key]: false }));
  }

  // Hesap formu
  const [fname, setFname] = useState("");
  const [sname, setSname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [countryDial, setCountryDial] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Mesajlar
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Login değilse yönlendir
  useEffect(() => {
    if (!ready) return;
    if (!user) nav("/login", { replace: true });
  }, [ready, user, nav]);

  // Kullanıcıyı forma serp
  // useEffect(() => {
  //   if (!user) return;
  //   setUsername(user.username ?? "");
  //   setEmail(user.email ?? "");
  //   setFname(user.fname ?? "");
  //   setSname(user.sname ?? "");
  //   setPhone(user.phone ?? "");
  //   setCountryDial(user.countryDial ?? "");
  // }, [user]);

  useEffect(() => {
    if (!user) return;
    setUsername(user.username ?? "");
    setEmail(user.email ?? "");
    setFname(user.fname ?? "");
    setSname(user.sname ?? "");
    setPhone(user.phone ?? "");
    setCountryDial(
      (user as any).countryDial ?? (user as any).country_dial ?? ""
    );
  }, [user]);

  // Doğrulamalar
  const fnameOk = useMemo(() => !fname || NAME_RE.test(fname.trim()), [fname]);
  const snameOk = useMemo(() => !sname || NAME_RE.test(sname.trim()), [sname]);
  const usernameOk = useMemo(
    () => username.trim().length >= 3 && username.trim().length <= 64,
    [username]
  );
  const emailOk = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email]
  );
  const phoneOk = useMemo(() => {
    if (!phone) return true;
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 6 && digits.length <= 16;
  }, [phone]);
  const dialOk = useMemo(
    () => (!phone ? true : Boolean(countryDial)),
    [phone, countryDial]
  );

  const canSave =
    fnameOk && snameOk && usernameOk && emailOk && phoneOk && dialOk && !saving;

  async function handleLogout() {
    try {
      await UserApi.logout();
    } catch {}
    setUser(null);
    nav("/login", { replace: true });
  }

  // async function handleSave(e: React.FormEvent) {
  //   e.preventDefault();
  //   if (!canSave || saving) return;

  //   setErr(null);
  //   setMsg(null);
  //   setSaving(true);

  //   try {
  //     // normalize + sadece telefon boşsa NULL'a çek
  //     const payload = {
  //       fname: fname.trim(),
  //       sname: sname.trim(),
  //       username: username.trim(),
  //       email: email.trim().toLowerCase(),
  //       phone: phone.trim(), // "" → NULL
  //       country_dial: phone.trim() ? countryDial : "", // "" → NULL
  //       ...(password.trim() ? { password: password.trim() } : {}),
  //     };

  //     const res = await UserApi.updateProfile(payload);

  //     // context'i güncelle, formu temizle/mesaj ver
  //     setUser(res.user);
  //     setPassword("");
  //     setMsg("Bilgilerin güncellendi.");
  //   } catch (e: any) {
  //     setErr(e?.message || "Güncelleme başarısız.");
  //   } finally {
  //     setSaving(false);
  //   }
  // }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saving) return;

    setErr(null);
    setMsg(null);
    setSaving(true);

    try {
      // Sadece değişenleri gönderelim:
      const payload: any = {};

      // null yapılacaklar (Kaldır tıklandıysa)
      if (rm.fname) payload.fname = null;
      if (rm.sname) payload.sname = null;
      if (rm.phone) {
        payload.phone = null;
        payload.country_dial = null;
      }

      // değiştiyse gönder (ve 'Kaldır' aktif değilse)
      if (!rm.fname && fname !== (user?.fname ?? ""))
        payload.fname = fname.trim();
      if (!rm.sname && sname !== (user?.sname ?? ""))
        payload.sname = sname.trim();
      if (username.trim() !== (user?.username ?? ""))
        payload.username = username.trim();
      if (email.trim().toLowerCase() !== (user?.email ?? "").toLowerCase())
        payload.email = email.trim().toLowerCase();

      if (!rm.phone) {
        const newPhone = phone.trim();
        const curPhone = user?.phone ?? "";
        if (newPhone !== curPhone) {
          payload.phone = newPhone || null; // boş bırakıldıysa da null yap
          payload.country_dial = newPhone ? countryDial : null;
        } else if (newPhone && countryDial !== (user as any)?.countryDial) {
          payload.country_dial = countryDial;
        }
      }

      if (password.trim()) payload.password = password.trim();

      // Hiç alan çıkmıyorsa kısa dönüş
      if (Object.keys(payload).length === 0) {
        setMsg("Güncellenecek bir değişiklik yok.");
        setSaving(false);
        return;
      }

      const res = await UserApi.updateProfile(payload);

      // context'i güncelle, formu temizle/mesaj ver
      setUser(res.user);
      setPassword("");
      setRm({});
      setMsg("Bilgilerin güncellendi.");
    } catch (e: any) {
      setErr(e?.message || "Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        "Hesabını kalıcı olarak silmek istediğine emin misin? Bu işlem geri alınamaz."
      )
    ) {
      return;
    }
    try {
      // Burada gerçek API çağrısı olacak (CustomersApi.deleteAccount)
      await new Promise((r) => setTimeout(r, 500));
      alert("Hesabın silindi. Hoşça kal!");
      await handleLogout();
    } catch (e: any) {
      alert(e?.message || "Hesap silinemedi.");
    }
  }

  return (
    <div className="ac-wrap">
      <Sidebar active={tab} onSelect={setTab} onLogout={handleLogout} />

      <main className="ac-content">
        {tab === "settings" && (
          <section className="card">
            <h3>Site Ayarları</h3>
            <p className="muted">
              Tema ve görünüm tercihlerini burada değiştirebilirsin.
            </p>

            <div className="row">
              <div className="block">
                <label className="label">Tema</label>
                <div className="seg">
                  <button
                    type="button"
                    className={`seg-btn ${theme === "light" ? "active" : ""}`}
                    onClick={() => setTheme("light")}
                  >
                    Açık
                  </button>
                  <button
                    type="button"
                    className={`seg-btn ${theme === "dark" ? "active" : ""}`}
                    onClick={() => setTheme("dark")}
                  >
                    Koyu
                  </button>
                </div>
                <div className="hint">Tema ayarın tarayıcına kaydedilir.</div>
              </div>
            </div>
          </section>
        )}

        {tab === "account" && (
          <section className="card">
            <h3>Hesap Ayarları</h3>
            <p className="muted">Profil bilgilerini güncelle.</p>

            <form onSubmit={handleSave}>
              {/* <div className="grid two">
                <div className="form-group">
                  <div className="label-row">
                    <label className="label" htmlFor="fname">
                      Ad
                    </label>
                    {(fname || user?.fname) && (
                      <button
                        type="button"
                        className="mini-link"
                        onClick={() => {
                          setFname("");
                          markRemove("fname");
                        }}
                        title="Bu alanı kaldır"
                      >
                        Kaldır
                      </button>
                    )}
                  </div>
                  <input
                    id="fname"
                    className={`input ${!fnameOk ? "invalid" : ""}`}
                    value={fname}
                    onChange={(e) => {
                      setFname(e.target.value);
                      unmarkRemove("fname");
                    }}
                    placeholder="Adınız"
                    autoComplete="given-name"
                    aria-invalid={!fnameOk}
                  />
                  {!fnameOk && (
                    <div className="hint">Sadece harf, boşluk ve -</div>
                  )}
                </div>
                <div className="form-group">
                  <div className="label-row">
                    <label className="label" htmlFor="sname">
                      Soyad
                    </label>
                    {(sname || user?.sname) && (
                      <button
                        type="button"
                        className="mini-link"
                        onClick={() => {
                          setSname("");
                          markRemove("sname");
                        }}
                      >
                        Kaldır
                      </button>
                    )}
                  </div>
                  <input
                    id="sname"
                    className={`input ${!snameOk ? "invalid" : ""}`}
                    value={sname}
                    onChange={(e) => {
                      setSname(e.target.value);
                      unmarkRemove("sname");
                    }}
                    placeholder="Soyadınız"
                    autoComplete="family-name"
                    aria-invalid={!snameOk}
                  />
                  {!snameOk && (
                    <div className="hint">Sadece harf, boşluk ve -</div>
                  )}
                </div>
                <div className="form-group">
                  <div className="label-row">
                    <label className="label" htmlFor="phone">
                      Telefon (opsiyonel)
                    </label>
                    {(phone || user?.phone) && (
                      <button
                        type="button"
                        className="mini-link"
                        onClick={() => {
                          setPhone("");
                          setCountryDial("");
                          markRemove("phone");
                        }}
                      >
                        Kaldır
                      </button>
                    )}
                  </div>
                  <input
                    id="phone"
                    className={`input ${!phoneOk ? "invalid" : ""}`}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      unmarkRemove("phone");
                    }}
                    placeholder="5xx xxx xx xx"
                    autoComplete="tel-national"
                    aria-invalid={!phoneOk}
                  />
                  {!phoneOk && (
                    <div className="hint">Sadece rakam, 6–16 hane</div>
                  )}
                </div>
              </div> */}

              {/* SATIR 1: Ad & Soyad */}
              <div className="grid two">
                <div className="form-group">
                  <div className="label-row">
                    <label className="label" htmlFor="fname">
                      Ad
                    </label>
                    {(fname || user?.fname) && (
                      <button
                        type="button"
                        className="mini-link"
                        onClick={() => {
                          setFname("");
                          markRemove("fname");
                        }}
                        title="Bu alanı kaldır"
                      >
                        Kaldır
                      </button>
                    )}
                  </div>
                  <input
                    id="fname"
                    className={`input ${!fnameOk ? "invalid" : ""}`}
                    value={fname}
                    onChange={(e) => {
                      setFname(e.target.value);
                      unmarkRemove("fname");
                    }}
                    placeholder="Adınız"
                    autoComplete="given-name"
                    aria-invalid={!fnameOk}
                  />
                  {!fnameOk && (
                    <div className="hint">Sadece harf, boşluk ve -</div>
                  )}
                </div>

                <div className="form-group">
                  <div className="label-row">
                    <label className="label" htmlFor="sname">
                      Soyad
                    </label>
                    {(sname || user?.sname) && (
                      <button
                        type="button"
                        className="mini-link"
                        onClick={() => {
                          setSname("");
                          markRemove("sname");
                        }}
                      >
                        Kaldır
                      </button>
                    )}
                  </div>
                  <input
                    id="sname"
                    className={`input ${!snameOk ? "invalid" : ""}`}
                    value={sname}
                    onChange={(e) => {
                      setSname(e.target.value);
                      unmarkRemove("sname");
                    }}
                    placeholder="Soyadınız"
                    autoComplete="family-name"
                    aria-invalid={!snameOk}
                  />
                  {!snameOk && (
                    <div className="hint">Sadece harf, boşluk ve -</div>
                  )}
                </div>
              </div>

              {/* SATIR 2: Kullanıcı adı & E-posta (zorunlu) */}
              <div className="grid two">
                <div className="form-group">
                  <label className="label" htmlFor="username">
                    Kullanıcı adı
                  </label>
                  <input
                    id="username"
                    className={`input ${!usernameOk ? "invalid" : ""}`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="en az 3 karakter"
                    autoComplete="username"
                    aria-invalid={!usernameOk}
                  />
                  {!usernameOk && (
                    <div className="hint">3–64 karakter; harf/rakam/._</div>
                  )}
                </div>

                <div className="form-group">
                  <label className="label" htmlFor="email">
                    E-posta
                  </label>
                  <input
                    id="email"
                    className={`input ${!emailOk ? "invalid" : ""}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@site.com"
                    autoComplete="email"
                    aria-invalid={!emailOk}
                    inputMode="email"
                  />
                  {!emailOk && (
                    <div className="hint">Geçerli bir e-posta girin</div>
                  )}
                </div>
              </div>

              {/* SATIR 3: Ülke kodu & Telefon (opsiyonel) */}
              <div className="grid two">
                <div className="form-group">
                  <label className="label" htmlFor="dial">
                    Ülke kodu (opsiyonel)
                  </label>
                  <select
                    id="dial"
                    className={`input ${!dialOk ? "invalid" : ""}`}
                    value={countryDial}
                    onChange={(e) => setCountryDial(e.target.value)}
                    aria-invalid={!dialOk}
                  >
                    <option value="">Seçiniz</option>
                    {COUNTRY_DIALS.map((c) => (
                      <option key={c.code} value={c.dial}>
                        {c.code} ({c.dial})
                      </option>
                    ))}
                  </select>
                  {!dialOk && (
                    <div className="hint">Telefon varsa ülke kodu gerekli</div>
                  )}
                </div>

                <div className="form-group">
                  <div className="label-row">
                    <label className="label" htmlFor="phone">
                      Telefon (opsiyonel)
                    </label>
                    {(phone || (user as any)?.phone) && (
                      <button
                        type="button"
                        className="mini-link"
                        onClick={() => {
                          setPhone("");
                          setCountryDial("");
                          markRemove("phone");
                        }}
                      >
                        Kaldır
                      </button>
                    )}
                  </div>
                  <input
                    id="phone"
                    className={`input ${!phoneOk ? "invalid" : ""}`}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      unmarkRemove("phone");
                    }}
                    placeholder="5xx xxx xx xx"
                    autoComplete="tel-national"
                    aria-invalid={!phoneOk}
                    inputMode="tel"
                  />
                  {!phoneOk && (
                    <div className="hint">Sadece rakam, 6–16 hane</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="label" htmlFor="pw">
                  Parola (değiştirmek istersen)
                </label>
                <input
                  id="pw"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Yeni parola (opsiyonel)"
                  autoComplete="new-password"
                />
              </div>

              {err && <div className="alert error">{err}</div>}
              {msg && <div className="alert ok">{msg}</div>}

              <div className="row end gap">
                <button
                  type="button"
                  className="btn danger ghost"
                  onClick={handleDelete}
                >
                  Hesabı Sil
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={!canSave}
                >
                  {saving ? "Kaydediliyor…" : "Güncelle"}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
