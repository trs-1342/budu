import { create } from "zustand";
import api from "./api";

export type Role = "admin" | "editor" | "viewer";
export type User = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

type AuthState = {
  accessToken: string | null;
  user: User | null;
  status: "idle" | "authenticating" | "authenticated" | "unauthenticated";
  error?: string;
  setAuth: (token: string, user: User) => void;
  boot: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const authStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: "idle",
  setAuth: (token, user) =>
    set({ accessToken: token, user, status: "authenticated" }),
  boot: async () => {
    set({ status: "authenticating" });
    try {
      // HttpOnly refresh cookie'den sessiz yenileme
      const { data } = await api.post("/auth/refresh", null);
      set({
        accessToken: data.accessToken,
        user: data.user,
        status: "authenticated",
      });
    } catch {
      set({ accessToken: null, user: null, status: "unauthenticated" });
    }
  },
  // login: (identifier: string, password: string) => Promise<void>

  login: async (identifier, password) => {
    set({ status: "authenticating", error: undefined });
    const { data } = await api.post("/auth/login", { identifier, password });
    set({
      accessToken: data.accessToken,
      user: data.user,
      status: "authenticated",
    });
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      set({ accessToken: null, user: null, status: "unauthenticated" });
    }
  },
}));
