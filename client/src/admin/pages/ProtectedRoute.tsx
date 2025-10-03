// src/admin/pages/ProtectedRoute.tsx
import { useEffect, useState, type JSX } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { apiFetch, API_BASE } from "../lib/auth";

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const [ok, setOk] = useState<boolean | null>(null);
  const loc = useLocation();

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        // apiFetch 401’de otomatik /auth/refresh dener
        const res = await apiFetch(`${API_BASE}/api/auth/me`);
        if (!dead) setOk(res.ok);
      } catch {
        if (!dead) setOk(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  if (ok === null) return null; // istersen skeleton koy
  if (!ok) return <Navigate to="/admin/login" replace state={{ from: loc }} />;
  return children;
}
