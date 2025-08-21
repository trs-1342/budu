import "../css/Header.css";
import buduLogo from "../assets/buduLogo.svg";

function Header() {
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
          <span id="span-budu-logo">
            <a href="/">
              <img src={buduLogo} id="budu-logo" alt="Budu logo" />
            </a>
          </span>
        </nav>
      </div>
    </header>
  );
}

export default Header;
