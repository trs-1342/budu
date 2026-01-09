// src/pages/PostDetail.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../css/PostDetail.css";
import posts from "../data/manuel-post.json";

type Post = {
  id: number;
  title: string;
  slug: string;
  cover?: string | null;
  summary: string; // ÖZET
  excerpt: string; // KONULAR / İÇERİK
  created_at: string;
  published_at: string;
};

// const API = import.meta.env.VITE_API_BASE || "http://72.62.52.200:1002";

export default function PostDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // useEffect(() => {
  //   if (!slug) return;
  //   (async () => {
  //     try {
  //       setLoading(true);
  //       const res = await fetch(`${API}/api/public/posts/${slug}`);
  //       const data = await res.json();
  //       if (!res.ok) throw new Error(data?.error || "Post alınamadı.");
  //       setPost(data.item as Post);
  //     } catch (e: any) {
  //       setErr(e.message || "Hata");
  //     } finally {
  //       setLoading(false);
  //     }
  //   })();
  // }, [slug]);

  useEffect(() => {
    if (!slug) return;

    const found = (posts as any[]).find((p) => p.slug === slug);

    if (!found) {
      setErr("İçerik bulunamadı.");
      setPost(null);
    } else {
      setPost({
        ...found,
        published_at: found.created_at,
      } as Post);
      setErr(null);
    }

    setLoading(false);
  }, [slug]);

  return (
    <>
      <Header />
      <main className="post-detail">
        {loading && <p>Yükleniyor...</p>}
        {err && <p className="error">Hata: {err}</p>}
        {/* bir arka sayfaya giden arapca butonu ekle ve yonlendirmede sayfayi yenilesin */}
        <a href="/my-projects" className="back-link">
          ← العودة
        </a>
        {post && (
          <article>
            {/* FOTOĞRAF */}
            {post.cover && (
              <img src={post.cover} alt={post.title} className="cover" />
            )}

            {/* BAŞLIK */}
            <h1>{post.title}</h1>

            {/* ÖZET */}
            <p className="summary excerpt">{post.summary}</p>

            {/* İÇERİK / KONULAR */}
            <div className="content" style={{ whiteSpace: "pre-line" }}>
              {post.excerpt}
            </div>

            <p className="meta">
              Yayın tarihi:{" "}
              {new Date(post.published_at).toLocaleDateString("tr-TR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </article>
        )}
      </main>
      <Footer />
    </>
  );
}
