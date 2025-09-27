import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../css/Courses.css";
import PostsFeed from "./posts/PostsFeed";
import { api, getToken } from "../lib/api";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:1002";

type Course = {
  id: number;
  title: string;
  detail?: string | null;
  video_url: string;
  created_at: string;
};

export default function Courses() {
  const [authed, setAuthed] = useState<boolean>(!!getToken());
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  async function load() {
    setLoading(true);
    try {
      // token yoksa direkt kilit ekranı
      if (!getToken()) {
        setAuthed(false);
        setCourses([]);
        return;
      }
      // me kontrolü
      await api("/api/account/user-me", { auth: true });
      setAuthed(true);
      const list = await api<Course[]>("/api/courses", { auth: true });
      setCourses(list);
    } catch {
      setAuthed(false);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    // ilk yükleme
    load();
    // login/logout sonrası yeniden yükle
    const onAuthChanged = () => alive && load();
    window.addEventListener("auth-changed", onAuthChanged);
    window.addEventListener("storage", (e) => {
      if (e.key === "token" || e.key === "access") onAuthChanged();
    });
    return () => {
      alive = false;
      window.removeEventListener("auth-changed", onAuthChanged);
    };
  }, []);

  const isOdd = courses.length % 2 === 1;
  const toAbs = (u: string) => (u?.startsWith("http") ? u : `${API_BASE}${u}`);
  const isHls = (u: string) => /\.m3u8($|\?)/i.test(u);

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
        {loading && <p className="muted">Yükleniyor…</p>}

        {authed === false && !loading && (
          <div className="locked">
            <h2>Giriş yapın</h2>
            <a className="btn-login" href="/login">
              Giriş / Kayıt
            </a>
          </div>
        )}

        {authed && !loading && courses.length > 0 && (
          <div className={`courses-grid ${isOdd ? "odd" : ""}`}>
            {courses.map((c, i) => {
              const src = toAbs(c.video_url || "");
              return (
                <article key={c.id} className="course-card">
                  <header className="course-head">
                    <div className="course-chip">#{i + 1}</div>
                    <h2 className="course-title">
                      <Link to={`/courses/watch/${c.id}`} state={c}>
                        {c.title}
                      </Link>
                    </h2>
                    <time className="course-time">
                      {new Date(c.created_at).toLocaleString()}
                    </time>
                  </header>

                  <div className="course-media">
                    {isHls(src) ? (
                      <div className="hls-placeholder">
                        <Link
                          className="watch-btn"
                          to={`/courses/watch/${c.id}`}
                          state={c}
                        >
                          İzle →
                        </Link>
                      </div>
                    ) : (
                      <video
                        controls
                        preload="metadata"
                        src={src}
                        className="course-video"
                      />
                    )}
                  </div>

                  {c.detail && <p className="course-desc">{c.detail}</p>}

                  <footer className="course-actions">
                    <Link
                      className="watch-link"
                      to={`/courses/watch/${c.id}`}
                      state={c}
                    >
                      İzle →
                    </Link>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <PostsFeed pageKey="courses" showCover showExcerpt />
      <Footer />
    </>
  );
}
