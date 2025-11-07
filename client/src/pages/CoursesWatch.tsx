import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../css/Courses.css";
import { api } from "../lib/api";
import VideoPlayer from "../components/VideoPlayer";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:1002";
const toAbs = (u: string) => (u?.startsWith("http") ? u : `${API_BASE}${u}`);
const isHls = (u: string) => /\.m3u8($|\?)/i.test(u);

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
        const d = await api<Course>(`/api/courses/${id}`);
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
      // item henüz yoksa src hesaplama —bekle—
      if (!item) return;
      // Önce playback URL'ini dene
      const p = await api<{ playback: string }>(`/api/courses/${id}/play`)
        .catch(() => null);
      const candidate = p?.playback || item.video_url;
      if (!candidate) return; // güvenlik
      if (live) setPlayUrl(toAbs(candidate));
    })();
    return () => {
      live = false;
    };
  }, [id, item]);

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
            {
              isHls(playUrl)
                ? <VideoPlayer key={playUrl} src={playUrl} />
                : (
                  <video
                    controls
                    preload="metadata"
                    src={playUrl}
                    className="course-video"
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                    onContextMenu={(e) => e.preventDefault()}
                  // referrerPolicy="no-referrer"
                  />
                )
            }
            {item.detail && <p className="course-desc">{item.detail}</p>}
          </article>
        )}
      </div>
      <Footer />
    </>
  );
}
