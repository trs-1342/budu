import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./admin.css";
import { openGate } from "./state";

const FALLBACK_GATE = "password"; // geçici

export default function FirstGate() {
  const [val, setVal] = useState("");
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gate = import.meta.env.VITE_ADMIN_GATE || FALLBACK_GATE;
    if (val === gate) {
      openGate();
      navigate("/admin/setup", { replace: true });
    } else {
      setMsg("Geçersiz admin password.");
    }
  };

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
              type={show ? "text" : "password"}
              placeholder="••••••••"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
            <button
              type="button"
              className="admin-link"
              onClick={() => setShow((s) => !s)}
            >
              {show ? "Gizle" : "Göster"}
            </button>
          </div>
          <button className="admin-btn" type="submit">
            Devam
          </button>
          {msg && <p className="admin-msg">{msg}</p>}
        </form>
      </section>
    </div>
  );
}
