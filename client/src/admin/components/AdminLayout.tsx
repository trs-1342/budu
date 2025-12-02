import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import "../css/admin-scoped.css"; // GENEL admin tema (scoped)
import "../css/layout-scoped.css"; // Layout + sidebar (scoped)
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE || "http://72.62.52.200:1002";
type Me = { id: number; username: string; email: string; create_at: string };

export default function AdminLayout() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const token =
      localStorage.getItem("access") || sessionStorage.getItem("access");
    if (!token) return;
    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMe(d.user))
      .catch(() => setMe(null));
  }, []);

  async function handleLogout() {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    localStorage.removeItem("access");
    sessionStorage.removeItem("access");
    window.location.href = "/admin/login";
  }

  return (
    <div className="admin-scope">
      {" "}
      {/* <-- Tüm admin CSS bunun içinde kalır */}
      <div className="ad-shell">
        <Sidebar
          onLogout={handleLogout}
          username={me?.username}
          email={me?.email}
        />
        <main className="ad-main">
          <header className="ad-topbar" style={{height:"50px"}}>
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
