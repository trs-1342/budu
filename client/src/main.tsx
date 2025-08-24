import { StrictMode, createContext } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Uygulama geneline vereceğimiz context
export const SiteNameContext = createContext<string>("Budu");

function resolveSiteName() {
  // Öncelik sırası: localStorage -> .env -> <meta name="site-name"> -> mevcut title -> "Budu"
  const fromLS = (localStorage.getItem("site:name") || "").trim();
  const fromEnv = (import.meta.env.VITE_SITE_NAME || "").trim();
  const metaEl = document.querySelector(
    'meta[name="site-name"]'
  ) as HTMLMetaElement | null;
  const fromMeta = (metaEl?.content || "").trim();
  const fallback = (document.title || "Budu").trim();

  const name = fromLS || fromEnv || fromMeta || fallback;

  // Head'i senkronla
  document.title = name;
  if (metaEl) metaEl.content = name;
  else {
    const m = document.createElement("meta");
    m.setAttribute("name", "site-name");
    m.setAttribute("content", name);
    document.head.appendChild(m);
  }

  // İstersen globalde de erişilebilir olsun
  (window as any).__SITE_NAME__ = name;
  return name;
}

const siteName = resolveSiteName();

createRoot(document.getElementById("root")!).render(
  <SiteNameContext.Provider value={siteName}>
    <StrictMode>
      <App />
    </StrictMode>
  </SiteNameContext.Provider>
);
