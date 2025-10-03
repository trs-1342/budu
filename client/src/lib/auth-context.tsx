// src/lib/auth-context.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { AuthApi, clearToken, getToken, isJwtValid, type Me } from "./api";

type AuthCtx = {
  user: Me | null;
  ready: boolean;
  setUser: (u: Me | null) => void;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  ready: false,
  setUser: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  async function sync() {
    const t = getToken();
    if (!t || !isJwtValid(t)) {
      // 🔇 sessiz temizle → event fırlatma, döngüyü kır
      clearToken({ emit: false });
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const me = await AuthApi.me();
      setUser(me);
    } catch {
      // 🔇 sessiz temizle
      clearToken({ emit: false });
      setUser(null);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    let syncing = false;
    const syncOnce = () => {
      if (syncing) return;
      syncing = true;
      sync().finally(() => {
        syncing = false;
      });
    };

    syncOnce();
    const onAuthChanged = () => syncOnce();
    const onVisible = () => {
      if (document.visibilityState === "visible") syncOnce();
    };
    window.addEventListener("auth-changed", onAuthChanged);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("auth-changed", onAuthChanged);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const logout = async () => {
    await AuthApi.logout(); // bu emit=true ile olayı atar
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, ready, setUser, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);


// en son:

/*
import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE, apiFetch, getMe } from "../lib/api";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active?: 0 | 1;
};
type AuthContextType = {
  user: User | null;
  loading: boolean; // kimlik kontrolü sürüyor mu?
  login: (key: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthCtx = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function hydrate() {
    setLoading(true);
    try {
      const me = await getMe();
      if (me) {
        setUser(me);
        setLoading(false);
        return;
      }

      // 401 olabilir, refresh dene
      const ref = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (ref.ok) {
        const me2 = await getMe();
        setUser(me2);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    hydrate();
  }, []);

  async function login(key: string, password: string) {
    const r = await apiFetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOrUsername: key, password }),
    });
    if (!r.ok) {
      return false;
    }
    // çerezler set edildi; me al
    await hydrate();
    return true;
  }

  async function logout() {
    await apiFetch(`${API_BASE}/api/auth/logout`, { method: "POST" });
    setUser(null);
  }

  async function refreshMe() {
    await hydrate();
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, refreshMe }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}

*/