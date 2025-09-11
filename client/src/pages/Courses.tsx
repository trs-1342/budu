import PostsFeed from "./posts/PostsFeed";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../css/Courses.css";

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
      </section>
      <PostsFeed pageKey="courses" limit={6} showCover showExcerpt />
      <Footer />
    </>
  );
}

export default Courses;
