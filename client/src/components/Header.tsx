import "../css/Header.css";
import buduLogo from "../assets/buduLogo.svg";
import { Link } from "react-router-dom";

function isAuthed() {
  return !!localStorage.getItem("token");
}

function Header() {
  const authed = isAuthed();
  return (
    <header className="App-header reveal reveal--center">
      <div>
        <nav>
          <span id="span-project-button">
            <Link to="mailto:jolanar444@gmail.com" id="project-button" style={{ textDecoration: "none" }}>
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

// import { Link, NavLink } from "react-router-dom";
// import "../css/Header.css";

// export default function Header() {
//   const auth = true;
//   return (
//     <header className="site-header">
//       <div className="container row">
//         <Link to="/" className="brand">
//           BUDU
//         </Link>
//         <nav className="nav">
//           <NavLink to={auth ? "/account" : "/login"}>
//             {auth ? "حسابي" : "تسجيل الدخول"}
//           </NavLink>
//           <NavLink
//             to="/my-products"
//             end
//             className={({ isActive }) => (isActive ? "active" : "") + " "}
//           >
//             منتجاتي
//           </NavLink>
//           <NavLink
//             to="/courses"
//             end
//             className={({ isActive }) => (isActive ? "active" : "") + " "}
//           >
//             الدورات
//           </NavLink>
//           <NavLink
//             to="/my-projects"
//             className={({ isActive }) => (isActive ? "active" : "") + " "}
//           >
//             مشاريعي
//           </NavLink>
//           <NavLink
//             to="/handbook"
//             className={({ isActive }) => (isActive ? "active" : "") + " "}
//           >
//             منهجية العمل
//           </NavLink>
//           <NavLink
//             to="/"
//             className={({ isActive }) => (isActive ? "active" : "") + " "}
//           >
//             الصفحة الرئيسية
//           </NavLink>
//         </nav>
//       </div>
//     </header>
//   );
// }
