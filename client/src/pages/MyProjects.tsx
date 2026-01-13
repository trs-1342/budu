import PostsFeed from "./posts/PostsFeed";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../css/Projects.css";
import posts from "../data/manuel-post.json";

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
      {/* <PostsFeed pageKey="projects" limit={6} showCover showExcerpt /> */}
      <Footer />
    </>
  );
}

export default MyProjects;
