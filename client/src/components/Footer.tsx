// import React from "react";
import type { FormEvent } from "react";
import { FaWhatsapp, FaInstagram, FaLinkedin } from "react-icons/fa6";
import { MdEmail } from "react-icons/md";
import "../css/Footer.css";

export default function Footer() {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  return (
    <footer className="footer-section" aria-labelledby="cta-heading">
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
            <input
              className="message-input"
              type="text"
              name="message"
              placeholder="text message..."
              aria-label="message"
            />

            <button className="subscribe-btn" type="submit">
              أرسل
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
      <nav
        className="socials"
        aria-label="Sosyal bağlantılar"
        data-reveal-group
        style={{ "--reveal-stagger": "80ms", gridArea:"16" } as React.CSSProperties}
      >
        <div className="social-item reveal reveal--center grid-area-1">
          <span className="icon" aria-hidden style={{ fontSize: 32 }}>
            <FaInstagram />
          </span>
          <a
            className="label"
            href="https://instagram.com/jolanar444"
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

        <div className="social-item reveal reveal--center grid-area-2">
          <span className="icon" aria-hidden style={{ fontSize: 32 }}>
            <FaLinkedin />
          </span>
          <a
            className="label"
            href="https://linkedin.com/in/bushra-dukhan-671869107/"
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

        <div className="social-item reveal reveal--center grid-area-3">
          <span className="icon" aria-hidden style={{ fontSize: 32 }}>
            <FaWhatsapp />
          </span>
          <a
            className="label"
            href="https://wa.me/905374943971"
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
        <div className="social-item reveal reveal--center grid-area-4">
          <span className="icon" aria-hidden style={{ fontSize: 32 }}>
            <MdEmail />
          </span>
          <a
            className="label"
            href="mailto:jolanar444@gmail.com"
            target="_blank"
            rel="noreferrer"
          >
            jolanar444@gmail.com
          </a>
          <span className="arrow" aria-hidden>
            →
          </span>
          <div className="underline" />
        </div>
      </nav>

      {/* <div className="cta-box reveal reveal--up"> */}
      <div className="fineprint">
        <p>جميع الحقوق محفوظة لـ بشرى</p>
        <p>Bushra © 2025</p>
      </div>
    </footer>
  );
}
