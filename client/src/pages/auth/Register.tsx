import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Api from "../../lib/api";
import { COUNTRIES, type Country } from "../../lib/countries";
import "../../css/Register.css";

type RegisterBody = {
  fname?: string; // Ad
  sname?: string; // Soyad
  username: string;
  email: string;
  phone?: string; // E.164 (+90…)
  countryDial?: string; // "+90"
  password: string;
};

async function registerRequest(body: RegisterBody) {
  const anyApi: any = Api as any;

  // 1) Varsa AuthApi.register kullan
  if (anyApi.AuthApi?.register) {
    return anyApi.AuthApi.register(body);
  }

  // 2) Varsa api(path, init) kullan  👉 DİKKAT: JSON.stringify YOK
  if (typeof anyApi.api === "function") {
    return anyApi.api("/api/auth/user-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body, // <-- DOĞRUDAN NESNE/OBJE
      // json: body,        // (Wrapper 'json' bekliyorsa bunu açıp 'body'yi kaldırabilirsin)
    });
  }

  // 3) Fallback fetch  👉 burada TEK KEZ string’le
  const res = await fetch("/api/auth/user-register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let j: any = {};
    try {
      j = await res.json();
    } catch {}
    throw new Error(j?.error || res.statusText);
  }
  try {
    return await res.json();
  } catch {
    return {};
  }
}

// ISO-2 → 🇹🇷 bayrak
function flagEmoji(iso2: string) {
  const up = iso2.toUpperCase();
  if (up.length !== 2) return "";
  const a = up.charCodeAt(0);
  const b = up.charCodeAt(1);
  return String.fromCodePoint(127397 + a) + String.fromCodePoint(127397 + b);
}

function toE164(dial: string, localDigits: string) {
  const digits = localDigits.replace(/\D/g, "").replace(/^0+/, "");
  return dial + digits;
}

export default function Register() {
  const nav = useNavigate();

  const [fname, setFname] = useState("");
  const [sname, setSname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const defaultCountry = useMemo<Country>(
    () => COUNTRIES.find((c) => c.code === "TR") || COUNTRIES[0],
    []
  );
  const [country, setCountry] = useState<Country>(defaultCountry);
  const [phoneDigits, setPhoneDigits] = useState("");

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const phoneMasked = useMemo(() => {
    const d = phoneDigits.replace(/\D/g, "");
    if (country.mask) return country.mask(d);
    const s = d.slice(0, 15);
    const g = [
      s.slice(0, 3),
      s.slice(3, 6),
      s.slice(6, 10),
      s.slice(10, 15),
    ].filter(Boolean);
    return g.join(" ");
  }, [phoneDigits, country]);

  function onCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = COUNTRIES.find((c) => c.code === e.target.value);
    if (next) setCountry(next);
  }
  function onPhoneInput(e: React.ChangeEvent<HTMLInputElement>) {
    const justDigits = e.target.value.replace(/\D/g, "");
    setPhoneDigits(justDigits);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (
      !fname.trim() ||
      !sname.trim() ||
      !username.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      setErr("Lütfen zorunlu alanları doldurun.");
      return;
    }

    const phoneE164 = phoneDigits
      ? toE164(country.dial, phoneDigits)
      : undefined;

    try {
      setLoading(true);
      await registerRequest({
        fname: fname.trim(),
        sname: sname.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        phone: phoneE164,
        countryDial: country.dial,
      });
      nav("/login", { replace: true }); // backend auto-login yapsa bile UX tutarlı
    } catch (e: any) {
      setErr(e?.message || "Kayıt başarısız.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <h1 className="auth-title">Kayıt Ol</h1>

        <div className="name-row">
          <label className="auth-field">
            <span>Ad</span>
            <input
              className="auth-input"
              value={fname}
              onChange={(e) => setFname(e.target.value)}
              placeholder="Adınız"
              autoComplete="given-name"
              autoFocus
              required
            />
          </label>

          <label className="auth-field">
            <span>Soyad</span>
            <input
              className="auth-input"
              value={sname}
              onChange={(e) => setSname(e.target.value)}
              placeholder="Soyadınız"
              autoComplete="family-name"
              required
            />
          </label>
        </div>

        <label className="auth-field">
          <span>Kullanıcı adı</span>
          <input
            className="auth-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ör. trs"
            autoComplete="username"
            required
          />
        </label>

        <label className="auth-field">
          <span>E-posta</span>
          <input
            className="auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@site.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="auth-field">
          <span>Tel No (ülke kodlu)</span>
          <div className="phone-row">
            <select
              className="dial-select"
              value={country.code}
              onChange={onCountryChange}
              aria-label="Ülke kodu"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {flagEmoji(c.code)} {c.name} {c.dial}
                </option>
              ))}
            </select>

            <div className="dial-prefix">{country.dial}</div>

            <input
              className="auth-input phone-input"
              inputMode="numeric"
              pattern="[0-9]*"
              value={phoneMasked}
              onChange={onPhoneInput}
              placeholder={country.placeholder || "telefon"}
              autoComplete="tel"
            />
          </div>
        </label>

        <label className="auth-field">
          <span>Şifre</span>
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </label>

        {err && <div className="auth-error">{err}</div>}

        <button className="auth-btn primary" disabled={loading}>
          {loading ? "Gönderiliyor…" : "Kayıt Ol"}
        </button>

        <div className="auth-row">
          <span>Hesabım var</span>
          <Link className="auth-link" to="/login">
            Giriş yap
          </Link>
        </div>
      </form>
    </div>
  );
}
