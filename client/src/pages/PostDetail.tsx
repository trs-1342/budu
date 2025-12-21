// src/pages/PostDetail.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../css/PostDetail.css";

type Post = {
  id: number;
  title: string;
  slug: string;
  cover_url?: string | null;
  excerpt?: string | null;
  content_md: string;
  published_at: string;
  created_at: string;
  updated_at: string;
};

const API = import.meta.env.VITE_API_BASE || "http://72.62.52.200:1002";

export default function PostDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/public/posts/${slug}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Post alınamadı.");
        setPost(data.item as Post);
      } catch (e: any) {
        setErr(e.message || "Hata");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  return (
    <>
      <Header />
      <main className="post-detail">
        {loading && <p>Yükleniyor...</p>}
        {err && <p className="error">Hata: {err}</p>}
        {post && (
          <article>
            {post.cover_url && (
              <img src={post.cover_url} alt={post.title} className="cover" />
            )}
            <h1>{post.title}</h1>
            {post.excerpt && <p className="excerpt">{post.excerpt}</p>}
            <div
              className="content"
              dangerouslySetInnerHTML={{
                __html: post.content_md.replace(/\n/g, "<br/>"),
              }}
            />
            <p className="meta">
              Yayın tarihi:{" "}
              {new Date(
                post.published_at || post.created_at
              ).toLocaleDateString("tr-TR", {
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
