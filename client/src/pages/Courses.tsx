import Header from "../components/Header";
import Footer from "../components/Footer";
import "../css/Courses.css";
import proj1 from "../assets/image1.png";
import proj2 from "../assets/image2.png";

type Courses = {
  id: string;
  title: string;
  description: string;
  image: string;
  href: string;
};

const courses: Courses[] = [
  {
    id: "design-course",
    title: "دورة التصميم الإبداعي",
    description:
      "تعلم أساسيات التصميم الجرافيكي وكيفية تحويل الأفكار إلى تصاميم بصرية احترافية باستخدام أحدث الأدوات والمنهجيات.",
    image: proj1,
    href: "/courses/design-course",
  },
  {
    id: "video-editing-course",
    title: "دورة تحرير الفيديو",
    description:
      "اكتشف تقنيات المونتاج المتقدمة وطرق إنتاج فيديوهات جذابة واحترافية تناسب جميع المنصات الرقمية.",
    image: proj2,
    href: "/courses/video-editing-course",
  },
  {
    id: "design-course",
    title: "دورة التصميم الإبداعي",
    description:
      "تعلم أساسيات التصميم الجرافيكي وكيفية تحويل الأفكار إلى تصاميم بصرية احترافية باستخدام أحدث الأدوات والمنهجيات.",
    image: proj1,
    href: "/courses/design-course",
  },
  {
    id: "video-editing-course",
    title: "دورة تحرير الفيديو",
    description:
      "اكتشف تقنيات المونتاج المتقدمة وطرق إنتاج فيديوهات جذابة واحترافية تناسب جميع المنصات الرقمية.",
    image: proj2,
    href: "/courses/video-editing-course",
  },
];

function Courses() {
  return (
    <>
      <Header />
      <section className="courses-section" aria-labelledby="courses-heading">
        <header className="courses-header">
          <h1 id="courses-heading" className="courses-title">
            دوراتي
          </h1>
          <p className="courses-subtitle">
            مزيج من التفكير المبتكر والحلول العملية في استراتيجيات الدورات
            التدريبية
          </p>
        </header>

        {/* kart grid */}
        <div
          className="courses-grid"
          data-reveal-group
          style={{ "--reveal-stagger": "90ms" } as React.CSSProperties}
        >
          {" "}
          {courses.map((p) => (
            <article className="course-card reveal reveal--up" key={p.id}>
              {" "}
              <a href={p.href} className="course-media" aria-label={p.title}>
                <img src={p.image} alt={p.title} loading="lazy" />
              </a>
              <div className="course-content">
                <h3 className="course-name">{p.title}</h3>
                <p className="course-desc">{p.description}</p>

                <div className="course-actions">
                  <a className="course-link" href={p.href}>
                    <span className="course-link-arrow" aria-hidden="true">
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
      <Footer />
    </>
  );
}

export default Courses;
