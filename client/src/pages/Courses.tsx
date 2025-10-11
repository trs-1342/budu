import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { isJwtValid } from "../lib/api.tsx";
import Footer from "../components/Footer.tsx";
import Header from "../components/Header.tsx";

function getAccessToken(): string | null {
  const token =
    localStorage.getItem("access") || sessionStorage.getItem("access");
  return token && isJwtValid(token) ? token : null;
}

export default function Courses() {
  // const isLoggedIn = useMemo(() => !!getAccessToken(), []); login kart yok
  // const isLoggedIn = false; login kart var
  const isLoggedIn = useMemo(() => !!getAccessToken(), []);
  return (
    <>
      <Header />
      <section className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Dersler</h1>
          <p className="text-muted-foreground mt-2">
            {isLoggedIn
              ? "Hoş geldin! Aşağıdaki içeriklere erişimin var."
              : "Giriş yapmadın. Görsel önizleme + giriş kartı aşağıda."}
          </p>
        </header>

        {/* Görsel (her durumda gösterilecek) */}
        <div className="rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/10 bg-black">
          <img
            src="/course.ignore.png"
            alt="Kurs içeriklerine erişim için giriş yapın"
            className="w-full h-auto object-cover"
            onError={(e) => {
              // Görsel yolu sorunluysa kullanıcıya ipucu verelim
              (e.currentTarget as HTMLImageElement).alt =
                "course.ignore.png bulunamadı. Lütfen /public klasörüne yerleştir.";
            }}
          />
        </div>

        {/* Login kartı (yalnızca oturum kapalıyken) */}
        {!isLoggedIn && (
          <div className="mt-8 grid place-items-center">
            <LoginCard />
          </div>
        )}
      </section>
      <Footer />
    </>
  );
}

function LoginCard() {
  const [identifier, setIdentifier] = useState(""); // username veya email
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password.trim()) {
      setError("Lütfen kullanıcı adı/e-posta ve şifreyi girin.");
      return;
    }

    setBusy(true);
    try {
      // Backend bağlanınca buraya fetch/axios isteğini ekleyeceğiz.
      // Örn: POST /api/customers/login { identifier, password, remember }
      console.log("LOGIN_ATTEMPT", { identifier, password, remember });
      // const res = await fetch(...)

      // Demo: sadece görsel amaçlı küçük gecikme
      await new Promise((r) => setTimeout(r, 600));
    } catch {
      setError("Beklenmeyen bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-xl"
      >
        <h2 className="text-xl font-semibold mb-4">Kurslara Giriş</h2>

        <label className="block mb-3">
          <span className="mb-1 block text-sm">Username / Email</span>
          <input
            type="text"
            inputMode="email"
            autoComplete="username email"
            placeholder="username/email"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </label>

        <label className="block mb-3">
          <span className="mb-1 block text-sm">Password</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 pr-12 outline-none focus:ring-2 focus:ring-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-sm hover:bg-white/10"
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showPassword ? "Gizle" : "Göster"}
            </button>
          </div>
        </label>

        <div className="mb-4 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
          </label>
          <span className="text-sm text-white/70">Beni hatırla</span>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? "Gönderiliyor…" : "Giriş Yap"}
        </button>

        <p className="mt-3 text-center text-sm text-white/60">
          Giriş yaptıktan sonra video dersler açılacaktır.
        </p>
      </form>
    </>
  );
}
