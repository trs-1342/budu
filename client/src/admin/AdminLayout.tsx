// AdminLayout.tsx
import { NavLink, Outlet, Routes, Route } from "react-router-dom";
import "./admin.css";
import { authStore } from "./auth/store";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import MessageDetail from "./pages/MessageDetail";
import Pages from "./pages/Pages";
import Posts from "./pages/Posts";
import Settings from "./pages/settings/Settings";

export default function AdminLayout() {
  const { user, logout } = authStore();

  return (
    <div className="admin-shell">
      <aside className="admin-aside">
        <h3 className="admin-logo">Budu • Admin</h3>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 14 }}>
          {user?.name} <span style={{ opacity: 0.6 }}>({user?.role})</span>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end>
            Dashboard
          </NavLink>
          <NavLink to="/admin/messages">Gelen mesajlar</NavLink>
          <NavLink to="/admin/pages">Sayfalar</NavLink>
          <NavLink to="/admin/posts">Postlar</NavLink>
          <NavLink to="/admin/settings">Ayarlar</NavLink>
        </nav>

        <button className="admin-logout" onClick={() => logout()}>
          Çıkış
        </button>
      </aside>

      <section className="admin-main">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:id" element={<MessageDetail />} />
          <Route path="pages" element={<Pages />} />
          <Route path="posts" element={<Posts />} />
          <Route path="settings/*" element={<Settings />} />
        </Routes>
        <Outlet /> {/* Bu satırı kaldırabilirsiniz artık gerek yok */}
      </section>
    </div>
  );
}
