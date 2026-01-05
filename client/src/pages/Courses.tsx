// import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../css/Courses.css";
// import PostsFeed from "./posts/PostsFeed";
// import { api } from "../lib/api";
import posts from "../data/manuel-post.json";

const API_BASE = import.meta.env.VITE_API_BASE || "http://192.168.1.152:1002";

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  created_at: string;
};

// type Course = {
//   id: number;
//   title: string;
//   detail?: string | null; // açıklama
//   video_url: string; // içerik (dosya yolu)
//   created_at: string;
// };

export default function Courses() {
  // const [authed, setAuthed] = useState<boolean | null>(null);
  // const [courses, setCourses] = useState<Course[]>([]);
  // const [loading, setLoading] = useState(true);
  // useEffect(() => {
  //   let live = true;
  //   (async () => {
  //     try {
  //       await api("/api/account/user-me", { auth: true } as any);
  //       if (!live) return;
  //       setAuthed(true);
  //       const d = await api<Course[]>("/api/courses", { auth: true } as any);
  //       if (live) setCourses(d);
  //     } catch {
  //       if (live) {
  //         setAuthed(false);
  //         setCourses([]);
  //       }
  //     } finally {
  //       if (live) setLoading(false);
  //     }
  //   })();
  //   return () => {
  //     live = false;
  //   };
  // }, []);

  // const isOdd = courses.length % 2 === 1;
  // const toAbs = (u: string) => (u?.startsWith("http") ? u : `${API_BASE}${u}`);
  // const isHls = (u: string) => /\.m3u8($|\?)/i.test(u);

  return (
    <>
      <Header />
      <section className="courses-section" aria-labelledby="courses-heading">
        <header className="courses-header">
          <h1 id="courses-heading" className="courses-title">
            Kurslar
          </h1>
          <p className="courses-subtitle">
            Videolar sadece giriş yapan üyeler içindir.
          </p>
        </header>
      </section>

      <main className="courses-wrap">
        <div className="courses-grid">
          {(posts as Post[]).map((post) => (
            <article key={post.id} className="course-card">
              <div className="course-media">
                <img src={new URL(post.cover, import.meta.url).pathname} />
              </div>

              <header className="course-head">
                <h2 className="course-title">
                  <Link to={`/post/${post.slug}`}>{post.title}</Link>
                </h2>
                <time className="course-time">
                  {new Date(post.created_at).toLocaleDateString()}
                </time>
              </header>

              <p className="course-desc">{post.excerpt}</p>

              <footer className="course-actions">
                <Link className="watch-link" to={`/post/${post.slug}`}>
                  اقرأ →
                </Link>
              </footer>
            </article>
          ))}
        </div>
      </main>

      {/* <PostsFeed pageKey="courses" showCover showExcerpt /> */}
      <Footer />
    </>
  );
}
