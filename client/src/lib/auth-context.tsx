// src/lib/auth-context.tsx
import { createContext, useContext, useEffect, useState } from "react";
// import { AuthApi, clearToken, getToken, isJwtValid, type Me } from "./api";
import {
  whoAmI,
  AuthApi,
  clearToken,
  getToken,
  isJwtValid,
  type Me,
} from "./api";

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
      const me = await whoAmI();
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
