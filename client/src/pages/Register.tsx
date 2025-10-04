import { useMemo, useState } from "react";
import "../css/Register.css";
import { CustomersApi } from "../lib/api";
import { COUNTRY_DIALS } from "../lib/countries";

type FormState = {
  username: string;
  email: string;
  password: string;
  fname: string;
  sname: string;
  country_dial: string;
  phone: string;
};

export default function Register() {
  const [f, setF] = useState<FormState>({
    username: "",
    email: "",
    password: "",
    fname: "",
    sname: "",
    country_dial: "",
    phone: "",
  });
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({
    username: false,
    email: false,
    password: false,
    fname: false,
    sname: false,
    country_dial: false,
    phone: false,
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const NAME_RE = /^[\p{L}\s]+$/u;

  const fnameOk = useMemo(
    () => !f.fname || NAME_RE.test(f.fname.trim()),
    [f.fname]
  );
  const snameOk = useMemo(
    () => !f.sname || NAME_RE.test(f.sname.trim()),
    [f.sname]
  );

  const emailOk = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()),
    [f.email]
  );
  const usernameOk = useMemo(
    () => f.username.trim().length >= 3 && f.username.trim().length <= 64,
    [f.username]
  );
  const passwordOk = useMemo(
    () => f.password.length >= 6 && f.password.length <= 72,
    [f.password]
  );

  const phoneOk = useMemo(() => {
    if (!f.phone) return true; // opsiyonel
    const digits = f.phone.replace(/\D/g, "");
    return digits.length >= 6 && digits.length <= 16;
  }, [f.phone]);

  const dialOk = useMemo(
    () => (!f.phone ? true : Boolean(f.country_dial)),
    [f.country_dial, f.phone]
  );

  const selectedCountry = useMemo(
    () => COUNTRY_DIALS.find((c) => c.dial === f.country_dial),
    [f.country_dial]
  );
  const phonePlaceholder = selectedCountry?.placeholder || "Telefon";

  const formOk =
    usernameOk &&
    emailOk &&
    passwordOk &&
    phoneOk &&
    dialOk &&
    fnameOk &&
    snameOk;

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setF((s) => ({ ...s, [key]: val }));
  }
  function onBlur<K extends keyof FormState>(key: K) {
    setTouched((t) => ({ ...t, [key]: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formOk || loading) return;

    setErr(null);
    setOkMsg(null);
    setLoading(true);
    try {
      await CustomersApi.register({
        username: f.username.trim(),
        email: f.email.trim(),
        password: f.password,
        fname: f.fname.trim(),
        sname: f.sname.trim(),
        country_dial: f.country_dial || undefined,
        phone: f.phone || undefined,
      });

      setOkMsg("Hesap oluşturuldu! Giriş yapabilirsiniz.");
      setF({
        username: "",
        email: "",
        password: "",
        fname: "",
        sname: "",
        country_dial: "",
        phone: "",
      });
    } catch (e: any) {
      setErr(e?.message || "Kayıt başarısız.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="register-scope">
      <form className="reg-card" onSubmit={handleSubmit} noValidate>
        <header className="reg-head">
          <h1 className="reg-title">Hesap Oluştur</h1>
          <p className="reg-sub">Topluluğa katıl, tek tıkla kurslara başla.</p>
            <div style={{ marginTop: 8, fontSize: 14, color: "#aaa", textDecoration: "none" }}>
            <a href="/" className="home-link">
              ← Anasayfa
            </a>
          </div>
        </header>

        <div className="grid two">
          <div className="form-group">
            <label className="label" htmlFor="fname">
              Ad
            </label>
            <input
              id="fname"
              className={`input ${touched.fname && !fnameOk ? "invalid" : ""}`}
              placeholder="Adınız"
              value={f.fname}
              onBlur={() => onBlur("fname")}
              onChange={(e) => set("fname", e.target.value)}
              autoComplete="given-name"
              aria-invalid={touched.fname && !fnameOk}
            />
            {touched.fname && !fnameOk && (
              <div className="hint">
                Sadece harf, boşluk ve <b>-</b> kullanabilirsiniz.
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="label" htmlFor="sname">
              Soyad
            </label>
            <input
              id="sname"
              className={`input ${touched.sname && !snameOk ? "invalid" : ""}`}
              placeholder="Soyadınız"
              value={f.sname}
              onBlur={() => onBlur("sname")}
              onChange={(e) => set("sname", e.target.value)}
              autoComplete="family-name"
              aria-invalid={touched.sname && !snameOk}
            />
            {touched.sname && !snameOk && (
              <div className="hint">
                Sadece harf ve boşluk kullanabilirsiniz.
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="label" htmlFor="username">
            Kullanıcı adı
          </label>
          <input
            id="username"
            className={`input ${
              touched.username && !usernameOk ? "invalid" : ""
            }`}
            placeholder="en az 3 karakter"
            value={f.username}
            onBlur={() => onBlur("username")}
            onChange={(e) => set("username", e.target.value)}
            autoComplete="username"
            required
            aria-invalid={touched.username && !usernameOk}
          />
          {touched.username && !usernameOk && (
            <div className="hint">Kullanıcı adı 3–64 karakter olmalı.</div>
          )}
        </div>

        <div className="form-group">
          <label className="label" htmlFor="email">
            E-posta
          </label>
          <input
            id="email"
            className={`input ${touched.email && !emailOk ? "invalid" : ""}`}
            placeholder="ornek@site.com"
            value={f.email}
            onBlur={() => onBlur("email")}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
            required
            aria-invalid={touched.email && !emailOk}
            inputMode="email"
          />
          {touched.email && !emailOk && (
            <div className="hint">Geçerli bir e-posta girin.</div>
          )}
        </div>

        <div className="form-group">
          <label className="label" htmlFor="password">
            Parola
          </label>
          <div className="password-row">
            <input
              id="password"
              className={`input ${
                touched.password && !passwordOk ? "invalid" : ""
              }`}
              type={showPw ? "text" : "password"}
              placeholder="en az 6 karakter"
              value={f.password}
              onBlur={() => onBlur("password")}
              onChange={(e) => set("password", e.target.value)}
              autoComplete="new-password"
              required
              aria-invalid={touched.password && !passwordOk}
            />
            <button
              type="button"
              className="toggle-btn"
              onClick={() => setShowPw((v) => !v)}
              title={showPw ? "Gizle" : "Göster"}
            >
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>
          {touched.password && !passwordOk && (
            <div className="hint">Parola 6–72 karakter olmalı.</div>
          )}
        </div>

        <div className="grid two">
          <div className="form-group">
            <label className="label" htmlFor="country_dial">
              Ülke kodu (opsiyonel)
            </label>
            <select
              id="country_dial"
              className={`input ${
                touched.country_dial && !dialOk ? "invalid" : ""
              }`}
              value={f.country_dial}
              onBlur={() => onBlur("country_dial")}
              onChange={(e) => set("country_dial", e.target.value)}
              aria-invalid={touched.country_dial && !dialOk}
            >
              <option value="">Seçiniz</option>
              {COUNTRY_DIALS.map((c) => (
                <option key={c.code} value={c.dial}>
                  {c.code} ({c.dial})
                </option>
              ))}
            </select>
            {touched.country_dial && !dialOk && (
              <div className="hint">
                Telefon girildiyse ülke kodu seçilmelidir.
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="label" htmlFor="phone">
              Telefon (opsiyonel)
            </label>
            <input
              id="phone"
              className={`input ${touched.phone && !phoneOk ? "invalid" : ""}`}
              placeholder={phonePlaceholder}
              value={f.phone}
              onBlur={() => onBlur("phone")}
              onChange={(e) => set("phone", e.target.value)}
              autoComplete="tel-national"
              inputMode="tel"
              aria-invalid={touched.phone && !phoneOk}
            />
            {touched.phone && !phoneOk && (
              <div className="hint">Sadece rakam, 6–16 hane olmalı.</div>
            )}
          </div>
        </div>

        <label className="remember">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Beni hatırla
        </label>

        {err && <div className="error">{err}</div>}
        {okMsg && <div className="success">{okMsg}</div>}

        <button
          className="btn primary"
          type="submit"
          disabled={!formOk || loading}
        >
          {loading ? "Gönderiliyor…" : "Kayıt ol"}
        </button>

        <footer className="reg-foot">
          <div className="foot-links">
            <span>Zaten hesabın var mı?</span>
            <a href="/login" className="link">
              Giriş yap
            </a>
          </div>
        </footer>
      </form>
    </div>
  );
}
