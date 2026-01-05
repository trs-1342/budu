import PostsFeed from "./posts/PostsFeed";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../css/Projects.css";
import posts from "../data/manuel-post.json";
// import product1 from "../assets/image1.png";
// import product2 from "../assets/image2.png";

// type Projects = {
//   id: string;
//   title: string;
//   description: string;
//   image: string;
//   href: string;
// };

// const projects: Projects[] = [
//   {
//     id: "design-book",
//     title: "كتاب يتكون من طرق تقنية في اتخاذ قرارات التصميم",
//     description:
//       "كتاب إلكتروني تم إعداده لمساعدتك على رفع مستوى احترافيتك في التصميم.",
//     image: product1,
//     href: "/projects/design-book",
//   },
//   {
//     id: "identity-course",
//     title: "دورة تصميم وبناء الهوية البصرية",
//     description: "دورة تفاعلية تركز على تمكين المستقلين في تصميم الهوية.",
//     image: product2,
//     href: "/projects/identity-course",
//   },
// ];

type Post = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  excerpt: string; // detail sayfasında kullanılacak
  cover: string;
  created_at: string;
};

function MyProjects() {
  return (
    <>
      <Header />
      <div>
        <section
          className="projects-section"
          aria-labelledby="projects-heading"
        >
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
          {/* <div
            className="projects-grid"
            data-reveal-group
            style={{ "--reveal-stagger": "90ms" } as React.CSSProperties}
          >
            {projects.map((p, i) => (
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
                {" "}
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
          </div> */}

          <main className="courses-wrap">
            <div className="courses-grid">
              {(posts as Post[]).map((post) => (
                <article key={post.id} className="course-card">
                  <div className="course-media">
                    <img
                      src={new URL(post.cover, import.meta.url).pathname}
                      alt={post.title}
                      loading="lazy"
                    />
                  </div>

                  <header className="course-head">
                    <h2 className="course-title">
                      {/* Başlıkta da refresh istiyorsan Link yerine a kullan */}
                      <a href={`/post/${post.slug}`}>{post.title}</a>
                    </h2>
                    <time className="course-time">
                      {new Date(post.created_at).toLocaleDateString()}
                    </time>
                  </header>

                  {/* KARTTA SADECE ÖZET */}
                  <p className="course-desc">{post.excerpt}</p>

                  <footer className="course-actions">
                    {/* HARD RELOAD */}
                    <a href={`/post/${post.slug}`} className="watch-link">
                      اقرأ →
                    </a>
                  </footer>
                </article>
              ))}
            </div>
          </main>
        </section>
      </div>
      <PostsFeed pageKey="projects" limit={6} showCover showExcerpt />
      <Footer />
    </>
  );
}

export default MyProjects;
