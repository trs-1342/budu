import { useEffect, useState } from "react";
import "./posts.css";

type Post = {
  id: number;
  title: string;
  slug: string;
  cover_url?: string | null;
  excerpt?: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  pinned?: 0 | 1;
};

type Props = {
  /** Hangi sayfaya ait postlar? pages.key_slug --> 'home' | 'projects' | 'services' ... */
  pageKey: string;
  /** Kaç adet getirilsin (default 10) */
  limit?: number;
  /** İsteğe bağlı arama ifadesi */
  q?: string;
  /** Ekstra className (opsiyonel) */
  className?: string;
  /** Kartta özet gösterilsin mi? */
  showExcerpt?: boolean;
  /** Kapak görseli gösterilsin mi? */
  showCover?: boolean;
};

const API = import.meta.env.VITE_API_BASE || "http://localhost:1002";

export default function PostsFeed({
  pageKey,
  limit = 10,
  q = "",
  className = "main-container",
  showExcerpt = true,
  showCover = true,
}: Props) {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const url = new URL(`${API}/api/public/posts`);
        url.searchParams.set("page", pageKey);
        url.searchParams.set("limit", String(limit));
        if (q.trim()) url.searchParams.set("q", q.trim());

        const res = await fetch(url.toString(), { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Postlar alınamadı.");
        if (alive) setItems(data.list as Post[]);
      } catch (e: any) {
        if (alive) setErr(e.message || "Hata");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pageKey, limit, q]);

  if (loading) {
    return <div className={`posts ${className}`}>Yükleniyor…</div>;
  }
  if (err) {
    return <div className={`posts ${className}`}>Hata: {err}</div>;
  }
  if (items.length === 0) {
    return (
      <div className={`posts ${className}`}>
        Bu sayfada gösterilecek içerik yok.
      </div>
    );
  }

  return (
    <div className={`posts ${className}`}>
      <div className="posts-grid">
        {items.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            showCover={showCover}
            showExcerpt={showExcerpt}
          />
        ))}
      </div>
    </div>
  );
}

/* Alt kart bileşenini ayırdık */
function PostCard({
  post,
  showCover = true,
  showExcerpt = true,
}: {
  post: Post;
  showCover?: boolean;
  showExcerpt?: boolean;
}) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString()
    : new Date(post.created_at).toLocaleDateString();

  return (
    <article className="post-card">
      {showCover && post.cover_url ? (
        <a className="post-cover-link" href={`/post/${post.slug}`}>
          <img className="post-cover" src={post.cover_url} alt={post.title} />
        </a>
      ) : null}

      <header className="post-head">
        <a className="post-title" href={`/post/${post.slug}`}>
          {post.title}
        </a>
        <div className="post-meta">{date}</div>
      </header>

      {showExcerpt && post.excerpt ? (
        <p className="post-excerpt line-2">{post.excerpt}</p>
      ) : null}

      <div className="post-actions">
        <a className="post-read" href={`/post/${post.slug}`}>
          Devamını oku →
        </a>
      </div>
    </article>
  );
}
