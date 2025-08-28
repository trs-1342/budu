import { NavLink } from "react-router-dom";

const items = [
  { to: "/admin/site", label: "Site Ayarları" },
  { to: "/admin/users", label: "Kullanıcılar" },
  { to: "/admin/pages", label: "Sayfalar" },
  { to: "/admin/account", label: "Hesabım" },
];

export default function Sidebar() {
  return (
    <nav className="admin-sidebar">
      {items.map((i) => (
        <NavLink
          key={i.to}
          to={i.to} // DİKKAT: başında / var → MUTLAK PATH
          end
          className={({ isActive }) => (isActive ? "s-item active" : "s-item")}
        >
          {i.label}
        </NavLink>
      ))}
    </nav>
  );
}
