// import React from "react";
import type { FormEvent } from "react";
import "../css/Footer.css";

export default function Footer() {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault(); // demo
  };

  return (
    <footer className="footer-section" aria-labelledby="cta-heading">
      {/* CTA box */}
      <div className="cta-box">
        <div className="cta-left">
          <h3 id="cta-heading" className="cta-title">
            اشترك في النشرة للحصول على جميع التحديثات الجديدة
          </h3>

          <form className="subscribe-form" onSubmit={handleSubmit}>
            <input
              className="subscribe-input"
              type="text"
              name="name"
              placeholder="name"
              aria-label="name"
            />
            <input
              className="subscribe-input"
              type="email"
              name="email"
              placeholder="email"
              aria-label="email"
            />

            <button className="subscribe-btn" type="submit">
              اشترك الآن
            </button>
          </form>
        </div>

        <div className="cta-divider" aria-hidden="true" />

        <div className="cta-right">
          <h3 className="cta-q">هل لديك مشروع؟</h3>

          <a href="/proje-formu" className="cta-action">
            <span>نموذج تقديم المشروع</span>
          </a>
          <span className="cta-glow" aria-hidden="true" />
        </div>
      </div>

      {/* Socials */}
      <nav className="socials" aria-label="Sosyal bağlantılar">
        <div className="social-item">
          <span className="icon" aria-hidden>
            {/* Instagram */}
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-5C8.8 2 8.4 2 7.3 2.1 6.2 2.2 5.4 2.4 4.7 2.7A4.9 4.9 0 0 0 2.7 4.7c-.3.7-.6 1.5-.6 2.6C2 8.4 2 8.8 2 12s0 3.6.1 4.7.3 1.9.6 2.6c.3.7.8 1.2 1.4 1.8.6.6 1.1 1.1 1.8 1.4.7.3 1.5.5 2.6.6C8.4 23.9 8.8 24 12 24s3.6 0 4.7-.1 1.9-.3 2.6-.6c.7-.3 1.2-.8 1.8-1.4.6-.6 1.1-1.1 1.4-1.8.3-.7.5-1.5.6-2.6.1-1.1.1-1.5.1-4.7s0-3.6-.1-4.7-.3-1.9-.6-2.6a4.9 4.9 0 0 0-2-2c-.7-.3-1.5-.5-2.6-.6C15.6 2 15.2 2 12 2Zm0 3c3.2 0 3.6 0 4.7.1.9 0 1.4.2 1.7.3.4.2.7.4 1 .7.3.3.5.6.7 1 .1.3.3.8.3 1.7.1 1.1.1 1.5.1 4.7s0 3.6-.1 4.7c0 .9-.2 1.4-.3 1.7-.2.4-.4.7-.7 1-.3.3-.6.5-1 .7-.3.1-.8.3-1.7.3-1.1.1-1.5.1-4.7.1s-3.6 0-4.7-.1c-.9 0-1.4-.2-1.7-.3-.4-.2-.7-.4-1-.7a3 3 0 0 1-.7-1c-.1-.3-.3-.8-.3-1.7C3 15.6 3 15.2 3 12s0-3.6.1-4.7c0-.9.2-1.4.3-1.7.2-.4.4-.7.7-1 .3-.3.6-.5 1-.7.3-.1.8-.3 1.7-.3C8.4 5 8.8 5 12 5Zm0 3.2A3.8 3.8 0 1 0 12 16a3.8 3.8 0 0 0 0-7.6Zm5.2-.9a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z" />
            </svg>
          </span>
          <a
            className="label"
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </a>
          <span className="arrow" aria-hidden>
            →
          </span>
          <div className="underline" />
        </div>

        <div className="social-item">
          <span className="icon" aria-hidden>
            {/* LinkedIn */}
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0 0-5ZM3 9h4v12H3zm7 0h3.8v1.7h.1c.5-.9 1.7-1.8 3.5-1.8 3.7 0 4.4 2.4 4.4 5.5V21h-4v-4.8c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4z" />
            </svg>
          </span>
          <a
            className="label"
            href="https://linkedin.com"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn
          </a>
          <span className="arrow" aria-hidden>
            →
          </span>
          <div className="underline" />
        </div>

        <div className="social-item">
          <span className="icon" aria-hidden>
            {/* WhatsApp */}
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M20.5 3.5A11 11 0 0 0 2 19.4L1 23l3.7-1A11 11 0 1 0 20.5 3.5ZM12 20a8 8 0 0 1-4-1l-.3-.2-2.4.6.6-2.3-.2-.3A8 8 0 1 1 12 20Zm4-5.1c-.2-.1-1.2-.6-1.3-.7s-.3-.1-.5.1-.6.7-.8.8-.3.1-.5 0a6.6 6.6 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.5c.2-.2.1-.4 0-.6 0-.1-.5-1.1-.7-1.5-.2-.5-.4-.4-.5-.4h-.5c-.1 0-.5.1-.8.4a2 2 0 0 0-.6 1.4c0 .8.6 1.6.7 1.7.1.2 1.2 1.8 2.8 2.5 1.7.8 2 .6 2.4.6.4 0 1.2-.5 1.4-1 .2-.5.2-.9.1-1 0 0 0-.1-.2-.2Z" />
            </svg>
          </span>
          <a
            className="label"
            href="https://wa.me/905550000000"
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
          <span className="arrow" aria-hidden>
            →
          </span>
          <div className="underline" />
        </div>
      </nav>

      {/* Fine print */}
      <div className="fineprint">
        <p>جميع الحقوق محفوظة لـ بشرى</p>
        <p>BuDu © 2025</p>
      </div>
    </footer>
  );
}
