import { useEffect, useState } from "react";
import "../css/Header.css";
import buduLogo from "../assets/buduLogo.svg";
import { Link } from "react-router-dom";
import { getUserAccess, subscribeAuth } from "../lib/userAuth";

// function isAuthed() {
//   const token = getUserAccess?.();
//   return !!token;
// }

function Header() {
  // const authed = isAuthed();
  const [authed, setAuthed] = useState(!!getUserAccess());

  useEffect(() => {
    return subscribeAuth(() => {
      setAuthed(!!getUserAccess());
    });
  }, []);

  return (
    <header className="App-header reveal reveal--center">
      <div>
        <nav>
          <span id="span-project-button">
            <Link
              to="mailto:jolanar444@gmail.com"
              id="project-button"
              style={{ textDecoration: "none" }}
            >
              هل لديك مشروع؟
            </Link>
          </span>

          <ul>
            <li>
              <a href={authed ? "/account" : "/login"}>
                {authed ? "حسابي" : "تسجيل الدخول"}
              </a>
            </li>

            <li>
              <Link to="/my-products">مؤلفاتي</Link>
            </li>

            <li>
              <Link to="/my-projects">دوراتي</Link>
            </li>

            <li>
              <Link to="/handbook">منهجية العمل</Link>
            </li>

            <li>
              <Link to="/">الصفحة الرئيسية</Link>
            </li>
          </ul>

          <span id="span-budu-logo">
            <Link to="/">
              <img src={buduLogo} id="budu-logo" alt="Budu logo" />
            </Link>
          </span>
        </nav>
      </div>
    </header>
  );
}

export default Header;
