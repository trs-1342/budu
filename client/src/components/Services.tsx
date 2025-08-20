import "../css/Servisec.css";
import proj1 from "../assets/image1.png";
import proj2 from "../assets/image2.png";

type Servisec = {
  id: string;
  title: string;
  description: string;
  image: string;
  href: string;
};

const servisec: Servisec[] = [
  {
    id: "design-servisec",
    title: "دورة التصميم الإبداعي",
    description:
      "تعلم أساسيات التصميم الجرافيكي وكيفية تحويل الأفكار إلى تصاميم بصرية احترافية باستخدام أحدث الأدوات والمنهجيات.",
    image: proj1,
    href: "/servisec/design-servisec",
  },
  {
    id: "video-editing-servisec",
    title: "دورة تحرير الفيديو",
    description:
      "اكتشف تقنيات المونتاج المتقدمة وطرق إنتاج فيديوهات جذابة واحترافية تناسب جميع المنصات الرقمية.",
    image: proj2,
    href: "/servisec/video-editing-servisec",
  },
];

function Services() {
  return (
    <>
      <section className="servisec-section" aria-labelledby="servisec-heading">
        <header className="servisec-header">
          <h1 id="servisec-heading" className="servisec-title">
            خدماتنا
          </h1>
          <p className="servisec-subtitle">
            مزيج من التفكير المبتكر والحلول العملية في استراتيجيات الدورات
            التدريبية
          </p>
        </header>

        <div
          className="servisec-grid"
          data-reveal-group
          style={{ "--reveal-stagger": "90ms" } as React.CSSProperties}
        >
          {servisec.map((p, i) => (
            <article
              className={`project-card reveal ${
                i % 3 === 0
                  ? "reveal--left"
                  : i % 3 === 1
                  ? "reveal--right"
                  : "reveal--up"
              }`}
              key={p.id}
            >
              <a href={p.href} className="servisec-media" aria-label={p.title}>
                <img src={p.image} alt={p.title} loading="lazy" />
              </a>

              <div className="servisec-content">
                <h3 className="servisec-name">{p.title}</h3>
                <p className="servisec-desc">{p.description}</p>

                <div className="servisec-actions">
                  <a className="servisec-link" href={p.href}>
                    <span className="servisec-link-arrow" aria-hidden="true">
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
    </>
  );
}
export default Services;
