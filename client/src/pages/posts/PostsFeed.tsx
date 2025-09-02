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
  pageKey: string; // pages.key_slug
  limit?: number;
  q?: string;
  className?: string;
  showExcerpt?: boolean;
  showCover?: boolean;
};

const API = import.meta.env.VITE_API_BASE || "http://localhost:1002";

export default function PostsFeed({
  pageKey,
  limit = 10,
  q = "",
  className = "",
  showExcerpt = true,
  showCover = true,
}: Props) {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
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

  // 👇 reveal: .reveal -> .is-visible
  useEffect(() => {
    if (!items.length) return;
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(".product-card.reveal")
    );
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items.length]);

  if (loading)
    return (
      <div className={`products-grid ${className}`} style={{ color: "#111" }}>
        Yükleniyor…
      </div>
    );
  if (err)
    return (
      <div className={`products-grid ${className}`} style={{ color: "#111" }}>
        Hata: {err}
      </div>
    );
  if (items.length === 0)
    return (
      <div className={`products-grid ${className}`} style={{ color: "#111" }}>
        Bu sayfada gösterilecek içerik yok.
      </div>
    );

  return (
    <div className="main-container">
      <div className={`products-grid ${className}`} data-reveal-group>
        {items.map((p, i) => (
          <article
            key={p.id}
            className="product-card reveal"
            style={{ ["--i" as any]: i }}
            data-reveal="up"
          >
            {showCover && p.cover_url ? (
              <a
                className="product-media"
                href={`/post/${p.slug}`}
                aria-label={p.title}
              >
                <img src={p.cover_url} alt={p.title} loading="lazy" />
              </a>
            ) : null}

            <div className="product-content">
              <h3 className="product-name">
                <a className="product-name-link" href={`/post/${p.slug}`}>
                  {p.title}
                </a>
              </h3>

              {showExcerpt && p.excerpt ? (
                <p className="product-desc">{p.excerpt}</p>
              ) : null}

              <div className="product-actions">
                <a className="product-link" href={`/post/${p.slug}`}>
                  Devamını oku <span className="product-link-icon">→</span>
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
