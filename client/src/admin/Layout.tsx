import { Link, Outlet, Routes, Route, Navigate } from "react-router-dom";
import "./admin.css";
import SiteSettings from "./SiteSettings";
import Account from "./Account";
import Users from "./Users";
import UserDetail from "./UsersDetail";
import Pages from "./Pages";
import PageDetail from "./PageDetail";

function Dashboard() {
  return (
    <div className="dash">
      <h2>Dashboard</h2>
      <p>Hoş geldin. Sol menüden yönet.</p>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-aside">
        <h3 className="admin-logo">Admin</h3>
        <nav className="admin-nav">
          <Link to="/admin/">Dashboard</Link>
          <Link to="/admin/settings">Site Ayarları</Link>
          <Link to="/admin/account">Hesabım</Link>
          <Link to="/admin/users">Kullanıcılar</Link>
          <Link to="/admin/pages">Sayfalar</Link>
          <button
            className="admin-logout"
            onClick={() => {
              localStorage.removeItem("budu.jwt");
              window.location.href = "/admin/login";
            }}
          >
            Çıkış
          </button>
          <button
            className="admin-logout"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            ← Anasayfaya dön
          </button>
        </nav>
      </aside>

      <section className="admin-main">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<SiteSettings />} />
          <Route path="account" element={<Account />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="pages" element={<Pages />} />
          <Route path="pages/:id" element={<PageDetail />} /> {/* <-- yeni */}
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
        <Outlet />
      </section>
    </div>
  );
}
