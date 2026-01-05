// src/lib/userAuth.ts

let listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeAuth(fn: () => void) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function getUserAccess(): string | null {
  return (
    localStorage.getItem("user_access") || sessionStorage.getItem("user_access")
  );
}

export function saveUserAccess(token: string, remember = true) {
  const store = remember ? localStorage : sessionStorage;
  store.setItem("user_access", token);
  notify();
}

export function clearUserAccess() {
  localStorage.removeItem("user_access");
  sessionStorage.removeItem("user_access");
  notify();
}
