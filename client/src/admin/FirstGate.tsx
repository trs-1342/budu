import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./admin.css";
import { openGate } from "./state";
import { api } from "./auth/api"; // API'yi import ediyoruz

const FALLBACK_GATE = "password"; // geçici

export default function FirstGate() {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true); // Yüklenme durumu
  const navigate = useNavigate();

  useEffect(() => {
    // Sunucudan admin kullanıcısı var mı kontrol et
    const checkAdminExists = async () => {
      try {
        const response = await api.get("/setup/check-admin");
        if (response.data.exists) {
          // Admin kullanıcısı varsa doğrudan giriş sayfasına yönlendir
          navigate("/admin/login", { replace: true });
        } else {
          setCheckingAdmin(false);
        }
      } catch (error) {
        console.error("Admin kontrolü sırasında hata:", error);
        setCheckingAdmin(false);
      }
    };

    checkAdminExists();
  }, [navigate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gatePassword = import.meta.env.VITE_ADMIN_GATE || FALLBACK_GATE;

    if (value === gatePassword) {
      openGate();
      navigate("/admin/setup", { replace: true });
    } else {
      setMessage("Geçersiz admin şifresi.");
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
          <h1>Admin Gate</h1>
          <p>İlk doğrulama</p>
        </header>
        <form className="admin-form" onSubmit={onSubmit}>
          <label className="admin-label" htmlFor="gate">
            Admin password
          </label>
          <div className="admin-row">
            <input
              id="gate"
              className="admin-input"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <button
              type="button"
              className="admin-link"
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? "Gizle" : "Göster"}
            </button>
          </div>
          <button className="admin-btn" type="submit">
            Devam
          </button>
          {message && <p className="admin-msg">{message}</p>}
        </form>
      </section>
    </div>
  );
}
