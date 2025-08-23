import "../css/Header.css";
import defaultLogo from "../assets/buduLogo.svg";
import { getSite } from "../admin/store";

function Header() {
  const site = getSite();
  const logo = site.logoDataUrl || defaultLogo;
  const name = site.siteName || "Budu";
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
          <span id="span-budu-logo" title={name}>
            <a href="/">
              <img src={logo} id="budu-logo" alt={name} />
            </a>
          </span>
        </nav>
      </div>
    </header>
  );
}

export default Header;
