import { NavLink } from "react-router-dom";
import "../css/layout-scoped.css";

type Props = {
  onLogout?: () => void;
  username?: string;
  email?: string;
};

export default function Sidebar({ onLogout, username }: Props) {
  return (
    <aside className="ad-sidebar" aria-label="Yönetim menüsü">
      <div className="ad-brand">
        <div className="ad-logo">BD</div>
        <div>
          <div className="ad-title">BUDU</div>
          <div className="ad-sub">Admin Panel</div>
        </div>
      </div>

      <nav className="ad-nav">
        <NavLink to="/admin" end className="ad-link">
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/admin/account" className="ad-link">
          <span>Hesap bilgileri</span>
        </NavLink>
        <NavLink to="/admin/messages" className="ad-link">
          <span>Mesajlar</span>
        </NavLink>
        <NavLink to="/admin/posts" className="ad-link">
          <span>Postlar</span>
        </NavLink>
        <NavLink to="/admin/courses" className="ad-link">
          <span>Kurslar</span>
        </NavLink>
        <NavLink to="/admin/gallery" className="ad-link">
          <span>Galeri</span>
        </NavLink>
      </nav>

      <div className="ad-user">
        <div className="ad-user-name">{username ?? "Kullanıcı"}</div>
      </div>

      <button className="ad-logout" onClick={onLogout}>
        Çıkış Yap
      </button>
    </aside>
  );
}
