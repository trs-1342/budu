import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const t = localStorage.getItem("budu.jwt");
  const { pathname } = useLocation();
  if (!t)
    return <Navigate to="/admin/login" state={{ from: pathname }} replace />;
  return <>{children}</>;
}
