import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import Theme from "./Theme";
import Account from "./Account";
import Users from "./Users";

export default function Settings() {
  return (
    <div>
      <h2>Ayarlar</h2>
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <NavLink to="theme" className="chip">
          Tema
        </NavLink>
        <NavLink to="account" className="chip">
          Hesap bilgileri
        </NavLink>
        <NavLink to="users" className="chip">
          Kullanıcılar
        </NavLink>
      </div>

      <Routes>
        <Route index element={<Navigate to="theme" replace />} />
        <Route path="theme" element={<Theme />} />
        <Route path="account" element={<Account />} />
        <Route path="users/*" element={<Users />} />
      </Routes>
    </div>
  );
}
