import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LS_KEYS } from "./state";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem(LS_KEYS.ADMIN_TOKEN);
  const { pathname } = useLocation();

  if (!token) {
    // panel yolları token istesin
    return <Navigate to="/admin/gate" state={{ from: pathname }} replace />;
  }
  return <>{children}</>;
}
