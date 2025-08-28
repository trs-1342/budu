import { useEffect } from "react";
import { PublicAPI } from "../lib/api";

export default function useSiteMeta() {
  useEffect(() => {
    let alive = true;

    const apply = (s: any) => {
      if (!s) return;
      if (s.site_name) document.title = s.site_name;
      if (s.logo_url) {
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = s.logo_url;
      }
    };

    PublicAPI.settings()
      .then((s) => alive && apply(s))
      .catch(() => {});

    const onUpdate = (e: any) => apply(e.detail);
    window.addEventListener("budu-settings-updated", onUpdate);
    return () => {
      alive = false;
      window.removeEventListener("budu-settings-updated", onUpdate);
    };
  }, []);
}
