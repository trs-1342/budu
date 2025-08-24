import { useEffect, useState } from "react";
import { getSite } from "../admin/store";
import defaultLogo from "../assets/buduLogo.svg";
import "../css/Header.css";

import { useContext } from "react";
import { SiteNameContext } from "../main";

function Header() {
  const siteName = useContext(SiteNameContext);
  const [site, setSite] = useState(getSite());
  // Basit: belirli aralıkla tazele (hemen çalışır)
  useEffect(() => {
    const t = setInterval(() => setSite(getSite()), 400);
    return () => clearInterval(t);
  }, []);
  const logo = site.logoDataUrl || defaultLogo;
  // const name = site.siteName || "Budu";



  return (
    <header className="App-header reveal reveal--center">
      <div>
        <nav>
          <span id="span-project-button">
            <button id="project-button"> هل لديك مشروع؟</button>
          </span>
          <ul>
            <li>
              <a href="/my-products">منتجاتي</a>
            </li>
            <li>
              <a href="/courses">الدورات</a>
            </li>
            <li>
              <a href="/my-projects">مشاريعي</a>
            </li>
            <li>
              <a href="/handbook"> منهجية العمل</a>
            </li>
            <li>
              <a href="/">الصفحة الرئيسية</a>
            </li>
          </ul>
          <span id="span-budu-logo" title={siteName}>
            <a href="/">
              <img src={logo} id="budu-logo" alt={siteName} />
            </a>
          </span>
        </nav>
      </div>
    </header>
  );
}

export default Header;
