import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import "../css/admin-scoped.css";
import "../css/layout-scoped.css";
import { useEffect, useState } from "react";
import {
  adminFetch,
  ADMIN_API_BASE,
  clearAdminAccess,
} from "../../lib/adminAuth";

type Me = { id: number; username: string; email: string; create_at: string };

export default function AdminLayout() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    adminFetch(`${ADMIN_API_BASE}/api/auth/admin-me`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || "Unauthorized");
        setMe(d.user);
      })
      .catch(() => setMe(null));
  }, []);

  async function handleLogout() {
    try {
      await fetch(`${ADMIN_API_BASE}/api/auth/admin-logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    clearAdminAccess();
    localStorage.removeItem("access");
    sessionStorage.removeItem("access");
    window.location.href = "/admin/login";
  }

  return (
    <div className="admin-scope">
      <div className="ad-shell">
        <Sidebar
          onLogout={handleLogout}
          username={me?.username}
          email={me?.email}
        />
        <main className="ad-main">
          <header className="ad-topbar" style={{ height: "50px" }}>
            <div className="ad-top-title">Yönetim</div>
          </header>
          <section className="ad-content">
            <Outlet />
          </section>
          <footer className="ad-footer">© BUDU</footer>
        </main>
      </div>
    </div>
  );
}
