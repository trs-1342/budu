// src/components/Header.tsx
import { useAuth } from "../lib/auth-context";
import "../css/Header.css";
import buduLogo from "../assets/buduLogo.svg";

export default function Header() {
  const { user, ready, logout } = useAuth();

  async function handleLogout(e: React.MouseEvent) {
    e.preventDefault();
    await logout();
    window.location.href = "/login";
  }

  return (
    <header className="App-header reveal reveal--center" dir="rtl" lang="ar">
      <div>
        <nav aria-label="التنقّل الرئيسي">
          <span id="span-project-button">
            <button id="project-button" aria-label="لديك مشروع؟">
              هل لديك مشروع؟
            </button>
          </span>

          <ul>
            <li>
              <a href="/">الرئيسية</a>
            </li>
            <li>
              <a href="/handbook">طريقة العمل</a>
            </li>
            <li>
              <a href="/my-projects">مشاريعي</a>
            </li>
            <li>
              <a href="/courses">الدروس</a>
            </li>
            <li>
              <a href="/my-products">منتجاتي</a>
            </li>

            {ready ? (
              user ? (
                <>
                  <li>
                    <a href="/account">حسابي</a>
                  </li>
                  <li>
                    <a href="/logout" onClick={handleLogout}>
                      تسجيل الخروج
                    </a>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <a href="/login">تسجيل الدخول</a>
                  </li>
                  <li>
                    <a href="/register">إنشاء حساب</a>
                  </li>
                </>
              )
            ) : null}
          </ul>

          <span id="span-budu-logo">
            <a href="/" aria-label="العودة إلى الرئيسية">
              <img src={buduLogo} id="budu-logo" alt="شعار بودو" />
            </a>
          </span>
        </nav>
      </div>
    </header>
  );
}
