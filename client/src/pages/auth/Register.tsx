// src/pages/auth/Register.tsx
import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthApi } from "../../lib/api";
import "../../css/Register.css";
import { COUNTRIES } from "../../lib/countries"; // aynı klasördeki countries.ts

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// E.164 birleştirici
function toE164(countryDial: string | null, local: string | null) {
  const dial = (countryDial || "").replace(/[^\d+]/g, "");
  const digits = (local || "").replace(/\D/g, "");
  if (!dial || !digits) return null;
  return `${dial}${digits}`;
}

export default function Register() {
  const nav = useNavigate();

  // Varsayılan ülke: TR
  const [countryDial, setCountryDial] = useState("+90");
  const country = useMemo(
    () =>
      COUNTRIES.find((c) => c.dial === countryDial) ??
      COUNTRIES.find((c) => c.code === "TR")!,
    [countryDial]
  );

  // Form state
  const [fname, setFname] = useState("");
  const [sname, setSname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [localPhone, setLocalPhone] = useState(""); // maskeli string
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const canSubmit =
    username.trim().length >= 3 &&
    isEmail(email.trim()) &&
    password.length >= 6;

  // Ülke kodunu seçerken local phone’u uygun maske ile normalize et
  function handleDialChange(v: string) {
    setCountryDial(v);
    const m = COUNTRIES.find((c) => c.dial === v)?.mask;
    if (m) {
      const digits = localPhone.replace(/\D/g, "");
      setLocalPhone(m(digits));
    }
  }

  // Yerel numarayı yazarken maskele
  function handleLocalPhoneChange(v: string) {
    const digits = v.replace(/\D/g, "");
    const masked = country.mask ? country.mask(digits) : digits.slice(0, 15);
    setLocalPhone(masked);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setErr(null);
    setOkMsg(null);
    setLoading(true);

    try {
      const phone = toE164(countryDial, localPhone);
      await AuthApi.register({
        fname: fname || undefined,
        sname: sname || undefined,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        phone: phone || undefined,
        countryDial: countryDial || undefined,
        password,
      });

      setOkMsg("Kayıt başarılı. Giriş sayfasına yönlendiriliyorsunuz…");
      setTimeout(() => nav("/login"), 800);
    } catch (e: any) {
      setErr(e?.message || "Kayıt başarısız.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="register" className="min-h-screen">
      <form onSubmit={onSubmit}>
        <h1>Kayıt Ol</h1>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label>Ad</label>
            <input
              value={fname}
              onChange={(e) => setFname(e.target.value)}
              type="text"
              placeholder="Adın"
              className="mt-1 w-full rounded-xl"
            />
          </div>
          <div>
            <label>Soyad</label>
            <input
              value={sname}
              onChange={(e) => setSname(e.target.value)}
              type="text"
              placeholder="Soyadın"
              className="mt-1 w-full rounded-xl"
            />
          </div>
        </div>

        <div>
          <label>Usrname</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            type="text"
            placeholder="username"
            className="mt-1 w-full rounded-xl"
          />
        </div>

        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="example@email.com"
            className="mt-1 w-full rounded-xl"
          />
        </div>

        <div>
          <label>Telefon</label>
          <div className="mt-1 grid grid-cols-[110px_1fr] gap-2">
            <input
              list="country-dials"
              value={countryDial}
              onChange={(e) => handleDialChange(e.target.value)}
              placeholder="+90"
              className="rounded-xl country-code-input"
              aria-label="Ülke kodu"
            />
            <datalist id="country-dials">
              {COUNTRIES.map((c) => (
                <option
                  key={c.code}
                  value={c.dial}
                >{`${c.name} (${c.dial})`}</option>
              ))}
            </datalist>

            {/* Yerel numara (ülkeye göre maske/placeholder) */}
            <input
              type="tel"
              value={localPhone}
              onChange={(e) => handleLocalPhoneChange(e.target.value)}
              placeholder={country.placeholder || "Yerel numara"}
              className="rounded-xl"
              aria-label="Yerel telefon"
            />
          </div>
          <p className="help">opsiyonel</p>
        </div>

        <div>
          <label>Şifre</label>
          <div className="mt-1 relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full rounded-xl pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="eye"
              aria-label="Şifreyi göster/gizle"
              title="Şifreyi göster/gizle"
            >
              {showPass ? "🙈" : "👁️"}
            </button>
          </div>
          <p className="help">En az 8 karakter.</p>
        </div>

        {err && <div className="text-red-400">{err}</div>}
        {okMsg && <div className="text-emerald-400">{okMsg}</div>}

        <button type="submit" disabled={!canSubmit || loading}>
          {loading ? "Gönderiliyor..." : "Kayıt Ol"}
        </button>

        <div className="below">
          Zaten hesabın var mı?{" "}
          <Link to="/login" className="link">
            Giriş yap
          </Link>
        </div>
      </form>
    </div>
  );
}
