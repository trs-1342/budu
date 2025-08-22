import { Link, Outlet, Routes, Route, Navigate } from "react-router-dom";
import "./admin.css";
// import { LS_KEYS } from "./state";

function Dashboard() {
  return (
    <div className="dash">
      <h2>Dashboard</h2>
      <p>Geçici oturum aktif. Gerçek hesaba geçiş için backend bağlanacak.</p>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-aside">
        <h3 className="admin-logo">Admin</h3>
        <nav className="admin-nav">
          <Link to="">Dashboard</Link>
          <button
            className="admin-logout"
            onClick={() => {
              localStorage.removeItem("budu.jwt"); // <-- düzeltildi
              window.location.href = "/admin/login";
            }}
          >
            Çıkış
          </button>
        </nav>
      </aside>

      <section className="admin-main">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
        <Outlet />
      </section>
    </div>
  );
}
