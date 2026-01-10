import { useEffect, useState } from "react";
import "../css/Header.css";
import buduLogo from "../assets/buduLogo.svg";
import { getUserAccess, subscribeAuth } from "../lib/userAuth";

function Header() {
  const [authed, setAuthed] = useState(() => !!getUserAccess());

  useEffect(() => {
    const unsub = subscribeAuth(() => {
      setAuthed(!!getUserAccess());
    });
    return unsub;
  }, []);

  // bilinçli full reload
  const go = (path) => {
    window.location.href = path;
  };

  return (
    <header className="App-header">
      <div>
        <nav>
          <span id="span-project-button">
            <a
              href="mailto:jolanar444@gmail.com"
              id="project-button"
              style={{ textDecoration: "none" }}
            >
              هل لديك مشروع؟
            </a>
          </span>

          <ul>
            <li>
              <button onClick={() => go(authed ? "/account" : "/login")}>
                {authed ? "حسابي" : "تسجيل الدخول"}
              </button>
            </li>

            <li>
              <button onClick={() => go("/my-products")}>مؤلفاتي</button>
            </li>

            <li>
              <button onClick={() => go("/my-projects")}>دوراتي</button>
            </li>

            <li>
              <button onClick={() => go("/handbook")}>منهجية العمل</button>
            </li>

            <li>
              <button onClick={() => go("/")}>الصفحة الرئيسية</button>
            </li>
          </ul>

          <span id="span-budu-logo">
            <button onClick={() => go("/")}>
              <img src={buduLogo} id="budu-logo" alt="Budu logo" />
            </button>
          </span>
        </nav>
      </div>
    </header>
  );
}

export default Header;
