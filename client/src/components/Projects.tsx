// import React from "react";
import "../css/Projects.css";

import proj1 from "../assets/image1.png";
import proj2 from "../assets/image2.png";

type Project = {
  id: string;
  title: string;
  description: string;
  image: string;
  href: string;
};

const projects: Project[] = [
  {
    id: "design-course",
    title: "دورة التصميم الإبداعي",
    description:
      "تعلم أساسيات التصميم الجرافيكي وكيفية تحويل الأفكار إلى تصاميم بصرية احترافية باستخدام أحدث الأدوات والمنهجيات.",
    image: proj1,
    href: "/projects/design-course",
  },
  {
    id: "video-editing-course",
    title: "دورة تحرير الفيديو",
    description:
      "اكتشف تقنيات المونتاج المتقدمة وطرق إنتاج فيديوهات جذابة واحترافية تناسب جميع المنصات الرقمية.",
    image: proj2,
    href: "/projects/video-editing-course",
  },
  {
    id: "design-course",
    title: "دورة التصميم الإبداعي",
    description:
      "تعلم أساسيات التصميم الجرافيكي وكيفية تحويل الأفكار إلى تصاميم بصرية احترافية باستخدام أحدث الأدوات والمنهجيات.",
    image: proj1,
    href: "/projects/design-course",
  },
  {
    id: "video-editing-course",
    title: "دورة تحرير الفيديو",
    description:
      "اكتشف تقنيات المونتاج المتقدمة وطرق إنتاج فيديوهات جذابة واحترافية تناسب جميع المنصات الرقمية.",
    image: proj2,
    href: "/projects/video-editing-course",
  }
];

function Projects() {
  return (
    <section className="projects-section" aria-labelledby="projects-heading">
      {/* üst şerit */}
      <div className="projects-topbar">
        <a className="projects-all-btn" href="/projects">
          تصفح جميع دوراتي
        </a>
      </div>

      {/* başlık + alt metin */}
      <header className="projects-header">
        <h1 id="projects-heading" className="projects-title">
          دوراتي
        </h1>
        <p className="projects-subtitle">
          مزيج من التفكير المبتكر والحلول العملية في استراتيجيات الدورات
          التدريبية
        </p>
      </header>

      {/* kart grid */}
      <div className="projects-grid">
        {projects.map((p) => (
          <article className="project-card" key={p.id}>
            <a href={p.href} className="project-media" aria-label={p.title}>
              <img src={p.image} alt={p.title} loading="lazy" />
            </a>

            <div className="project-content">
              <h3 className="project-name">{p.title}</h3>
              <p className="project-desc">{p.description}</p>

              <div className="project-actions">
                <a className="project-link" href={p.href}>
                  <span className="project-link-arrow" aria-hidden="true">
                    ↗
                  </span>
                  عرض المشروع
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Projects;
