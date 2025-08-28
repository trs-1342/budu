// src/components/Header.tsx
import "../css/Header.css";
import buduLogo from "../assets/buduLogo.svg";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicAPI } from "../lib/api";

export default function Header() {
  const [menu, setMenu] = useState<{ title: string; path: string }[]>([]);
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    PublicAPI.menu().then(setMenu);
    PublicAPI.settings().then((s) => setLogo(s?.logo_url || null));
    const h = (e: any) => {
      if (e.detail?.logo_url) setLogo(e.detail.logo_url);
    };
    window.addEventListener("budu-settings-updated", h);
    return () => window.removeEventListener("budu-settings-updated", h);
  }, []);

  const logoSrc = logo || buduLogo;

  return (
    <header className="App-header reveal reveal--center">
      <div>
        <nav>
          <span id="span-project-button">
            <button id="project-button"> هل لديك مشروع؟</button>
          </span>
          <ul>
            {menu.map((item) => (
              <li key={item.path}>
                <Link to={item.path}>{item.title}</Link>
              </li>
            ))}
          </ul>
          <span id="span-budu-logo">
            <Link to="/">
              <img src={logoSrc} id="budu-logo" alt="Budu logo" />
            </Link>
          </span>
        </nav>
      </div>
    </header>
  );
}
