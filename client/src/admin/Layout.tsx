import { Link, Outlet, Routes, Route, Navigate } from "react-router-dom";
import "./admin.css";
import { LS_KEYS } from "./state";
import Dashboard from "./pages/Dashboard";
import SiteSettings from "./pages/SiteSettings";
import Account from "./pages/Account";
import Users from "./pages/Users";
import Pages from "./pages/Pages";

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-aside">
        <h3 className="admin-logo">Admin</h3>
        <nav className="admin-nav">
          <Link to="">Dashboard</Link>
          <Link to="site">Site Ayarları</Link>
          <Link to="account">Hesabım</Link>
          <Link to="users">Kullanıcılar</Link>
          <Link to="pages">Sayfalar</Link>
          <button
            className="admin-logout"
            onClick={() => {
              localStorage.removeItem(LS_KEYS.ADMIN_TOKEN);
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
          <Route path="site" element={<SiteSettings />} />
          <Route path="account" element={<Account />} />
          <Route path="users" element={<Users />} />
          <Route path="pages" element={<Pages />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
        <Outlet />
      </section>
    </div>
  );
}
