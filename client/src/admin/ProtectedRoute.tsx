// ProtectedRoute.tsx
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("budu.jwt"); // <-- düzeltildi
  const { pathname } = useLocation();

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: pathname }} replace />;
  }
  return <>{children}</>;
}
