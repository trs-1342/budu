import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../css/Courses.css";
import { api } from "../lib/api";
import VideoPlayer from "../components/VideoPlayer";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:1002";

type Course = {
  id: number;
  title: string;
  detail?: string | null;
  video_url: string;
  created_at: string;
};

export default function CoursesWatch() {
  const { id } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const initial = (loc.state as Course | null) || null;

  const [item, setItem] = useState<Course | null>(initial);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const d = await api<Course>(`/api/courses/${id}`, { auth: true });
        if (live) setItem(d);
      } catch {
        nav("/courses");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const p = await api<{ playback: string }>(`/api/courses/${id}/play`, {
          auth: true,
        }).catch(() => null);
        const url = p?.playback || item?.video_url || "";
        const abs = url.startsWith("http") ? url : `${API_BASE}${url}`;
        if (live) setPlayUrl(abs);
      } catch {
        nav("/login");
      }
    })();
    return () => {
      live = false;
    };
  }, [id, item?.video_url]);

  return (
    <>
      <Header />
      <section className="courses-section" aria-labelledby="watch-heading">
        <header className="courses-header">
          <h1 id="watch-heading" className="courses-title">
            {item ? item.title : "Kurs Videosu"}
          </h1>
          <p className="courses-subtitle">Video, başlık, açıklama</p>
        </header>
      </section>

      <div className="watch-wrap">
        {(loading || !playUrl) && <p className="muted">Yükleniyor…</p>}
        {item && playUrl && (
          <article className="watch-card">
            <VideoPlayer src={playUrl} />
            {item.detail && <p className="course-desc">{item.detail}</p>}
          </article>
        )}
      </div>
      <Footer />
    </>
  );
}
