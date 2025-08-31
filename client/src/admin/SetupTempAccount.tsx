import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./admin.css";
import { isGateOpen } from "./state";
import { api } from "./auth/api";
import { authStore } from "./auth/store";

export default function SetupTempAccount() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const { login } = authStore();

  useEffect(() => {
    if (!isGateOpen()) {
      nav("/admin/gate", { replace: true });
      return;
    }

    // Admin kontrolü yap
    const checkAdminExists = async () => {
      try {
        const response = await api.get("/setup/check-admin");
        if (response.data.exists) {
          // Admin varsa doğrudan giriş sayfasına yönlendir
          nav("/admin/login", { replace: true });
        } else {
          setCheckingAdmin(false);
        }
      } catch (error) {
        console.error("Admin kontrolü sırasında hata:", error);
        setCheckingAdmin(false);
      }
    };

    checkAdminExists();
  }, [nav]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    // Validasyon
    if (!username || !password || !confirmPassword || !name || !email) {
      setMessage("Lütfen tüm alanları doldurun.");
      setLoading(false);
      return;
    }

    if (password.length < 10) {
      setMessage("Şifre en az 10 karakter olmalıdır.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Şifreler eşleşmiyor.");
      setLoading(false);
      return;
    }

    try {
      await api.post("/setup/first-admin", {
        username,
        name,
        email,
        password,
      });

      await login(username, password);

      setMessage("Hesap oluşturuldu ve giriş yapıldı. Yönlendiriliyorsunuz...");
      setTimeout(() => {
        nav("/admin", { replace: true });
      }, 2000);
    } catch (error: any) {
      console.error("Hesap oluşturma hatası:", error);
      setMessage(
        error.response?.data?.message ||
          "Hesap oluşturulurken bir hata oluştu. Lütfen tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingAdmin) {
    return (
      <div className="admin-wrap">
        <div className="admin-noise" aria-hidden />
        <section className="admin-card">
          <p>Kontrol ediliyor...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <div className="admin-noise" aria-hidden />
      <section className="admin-card">
        <header className="admin-head">
          <h1>Admin Hesabı Oluştur</h1>
          <p>İlk admin hesabınızı oluşturun</p>
        </header>
        <form className="admin-form" onSubmit={handleSubmit}>
          <label className="admin-label" htmlFor="name">
            Ad Soyad
          </label>
          <input
            id="name"
            className="admin-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Adınız ve soyadınız"
            required
          />

          <label className="admin-label" htmlFor="email">
            E-posta
          </label>
          <input
            id="email"
            className="admin-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@email.com"
            required
          />

          <label className="admin-label" htmlFor="username">
            Kullanıcı Adı
          </label>
          <input
            id="username"
            className="admin-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="kullaniciadi"
            required
          />

          <label className="admin-label" htmlFor="password">
            Şifre (en az 10 karakter)
          </label>
          <input
            id="password"
            className="admin-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
            required
          />

          <label className="admin-label" htmlFor="confirmPassword">
            Şifre Tekrarı
          </label>
          <input
            id="confirmPassword"
            className="admin-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••••"
            required
          />

          <button className="admin-btn" type="submit" disabled={loading}>
            {loading ? "Oluşturuluyor..." : "Hesap Oluştur"}
          </button>
          <button
            className="admin-btn"
            type="submit"
            disabled={loading}
            onClick={() => nav("/admin/login")}
          >
            Giriş Yap
          </button>
          {message && <p className="admin-msg">{message}</p>}
        </form>
      </section>
    </div>
  );
}
