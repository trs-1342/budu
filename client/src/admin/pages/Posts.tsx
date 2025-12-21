import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminFetch, ADMIN_API_BASE } from "../../lib/adminAuth";
import "../css/posts-scoped.css";

type Row = {
  id: number;
  title: string;
  slug: string;
  status: "draft" | "scheduled" | "published" | "archived";
  visibility: "public" | "private";
  pinned: 0 | 1;
  published_at: string | null;
  updated_at: string;
};

type Status = "all" | "draft" | "scheduled" | "published" | "archived";

export default function Posts() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const url = new URL(`${ADMIN_API_BASE}/api/admin/posts`);
      if (q.trim()) url.searchParams.set("q", q.trim());
      url.searchParams.set("status", status);
      const r = await adminFetch(url.toString());
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Liste alınamadı");
      setList(d.list as Row[]);
    } catch (e: any) {
      setErr(e.message || "Hata");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [status]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function remove(id: number) {
    if (!confirm("Bu postu silmek istiyor musun?")) return;
    const prev = [...list];
    setList((xs) => xs.filter((x) => x.id !== id));
    try {
      const r = await adminFetch(`${ADMIN_API_BASE}/api/admin/posts/${id}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Silinemedi");
    } catch {
      setList(prev);
    }
  }

  return (
    <div className="admin-scope posts-wrap">
      <div className="posts-bar">
        <div className="tabs">
          {(
            ["all", "draft", "scheduled", "published", "archived"] as Status[]
          ).map((s) => (
            <button
              key={s}
              className={`tab ${status === s ? "active" : ""}`}
              onClick={() => setStatus(s)}
            >
              {label(s)}
            </button>
          ))}
        </div>

        <div className="actions">
          <input
            ref={inputRef}
            className="search"
            placeholder="Ara: başlık, içerik…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") load();
            }}
            aria-label="Postlarda ara"
          />
          <button className="btn" onClick={load} title="Yenile">
            Yenile
          </button>
          <button
            className="btn primary"
            onClick={() => navigate("/admin/posts/new")}
          >
            + Yeni Post
          </button>
        </div>
      </div>

      {err && <div className="alert error">{err}</div>}
      {!loading && !err && list.length === 0 && (
        <div className="alert warn">Hiç kayıt yok.</div>
      )}

      <div className="table">
        <div className="thead">
          <div>Başlık</div>
          <div>Durum</div>
          <div>Yayın</div>
          <div>Görünürlük</div>
          <div>İşlem</div>
        </div>
        <div className="tbody">
          {list.map((r) => (
            <div key={r.id} className="tr">
              <div className="td title">
                <div className="line-1">
                  {r.pinned ? <span className="badge">Sabit</span> : null}
                  <Link to={`/admin/posts/${r.id}`} className="title-link">
                    {r.title || "(adsız)"}
                  </Link>
                  <span className="dim">/{r.slug}</span>
                </div>
              </div>
              <div className="td">
                <span className={`status ${r.status}`}>{label(r.status)}</span>
              </div>
              <div className="td">
                {r.published_at
                  ? new Date(r.published_at).toLocaleString()
                  : "-"}
              </div>
              <div className="td">{r.visibility}</div>
              <div className="td">
                <Link to={`/admin/posts/${r.id}`} className="btn sm">
                  Düzenle
                </Link>
                <button className="btn sm danger" onClick={() => remove(r.id)}>
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading && <div className="muted">Yükleniyor…</div>}
    </div>
  );
}

function label(s: string) {
  switch (s) {
    case "all":
      return "Hepsi";
    case "draft":
      return "Taslak";
    case "scheduled":
      return "Planlı";
    case "published":
      return "Yayınlandı";
    case "archived":
      return "Arşiv";
    default:
      return s;
  }
}
