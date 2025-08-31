import { useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { authStore } from "../auth/store";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status, user, boot } = authStore();

  useEffect(() => {
    if (status === "idle") boot();
  }, [status, boot]);

  const loc = useLocation();

  if (status === "idle" || status === "authenticating") {
    return <div style={{ padding: 24 }}>Yükleniyor…</div>;
  }

  if (!user) {
    return (
      <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />
    );
  }

  return <>{children}</>;
}
