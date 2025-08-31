import axios from "axios";
import { authStore } from "./store";

// Tüm istekler için tek axios instance
export const api = axios.create({
  // export ekliyoruz
  baseURL: "/api",
  withCredentials: true,
});

// Access token'ı header'a ekle
api.interceptors.request.use((config) => {
  const token = authStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = false;
let waiters: Array<() => void> = [];

export async function login(identifier: string, password: string) {
  const res = await axios.post(
    "/api/auth/login",
    {
      identifier,
      password,
    },
    { withCredentials: true }
  ); // refresh token cookie'si için

  const { accessToken, user } = res.data;

  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("user", JSON.stringify(user));

  // store güncellenir (örn. Zustand kullanıyorsan)
  authStore.getState().setAuth(accessToken, user);
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config || {};
    const status = err?.response?.status;

    if (status === 401 && !original._retry) {
      if (refreshing) {
        await new Promise<void>((resolve) => waiters.push(resolve));
        original.headers.Authorization = `Bearer ${
          authStore.getState().accessToken
        }`;
        return api(original);
      }
      original._retry = true;

      try {
        refreshing = true;
        const { data } = await axios.post("/api/auth/refresh", null, {
          withCredentials: true,
        });
        authStore.getState().setAuth(data.accessToken, data.user);
        waiters.forEach((fn) => fn());
        waiters = [];
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (e) {
        authStore.getState().logout();
        return Promise.reject(e);
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
