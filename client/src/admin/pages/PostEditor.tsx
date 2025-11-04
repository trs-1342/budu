import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, API_BASE } from "../lib/auth";
import "../css/editor-scoped.css";

type PageOpt = { id: number; key_slug: string; title: string; path: string };
type Form = {
  id?: number;
  title: string;
  slug: string;
  cover_url: string;
  excerpt: string;
  content_md: string;
  status: "draft" | "scheduled" | "published" | "archived";
  visibility: "public" | "private";
  pinned: boolean;
  published_at: string | null; // yyyy-MM-ddTHH:mm (local)
  page_ids: number[];
};

export default function PostEditor() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [pages, setPages] = useState<PageOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false); // slug duzeltmesi

  const [f, setF] = useState<Form>({
    title: "",
    slug: "",
    cover_url: "",
    excerpt: "",
    content_md: "",
    status: "draft",
    visibility: "public",
    pinned: false,
    published_at: null,
    page_ids: [],
  });

  async function uploadCover(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await apiFetch(`${API_BASE}/api/admin/upload`, {
      method: "POST",
      body: fd, // Content-Type otomatik FormData
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error || "Yüklenemedi");
    // server hem path hem url döndürüyor; relative path ile çalışmak daha güvenli:
    setF((s) => ({ ...s, cover_url: `${API_BASE}${d.path}` }));
  }

  // load pages + item
  useEffect(() => {
    (async () => {
      try {
        const [pg, itm] = await Promise.all([
          apiFetch(`${API_BASE}/api/admin/pages`).then((r) => r.json()),
          editing
            ? apiFetch(`${API_BASE}/api/admin/posts/${id}`).then((r) =>
              r.json()
            )
            : Promise.resolve(null),
        ]);
        setPages(pg.pages as PageOpt[]);
        if (itm) {
          const it = itm.item;
          setF({
            id: it.id,
            title: it.title || "",
            slug: it.slug || "",
            cover_url: it.cover_url || "",
            excerpt: it.excerpt || "",
            content_md: it.content_md || "",
            status: it.status,
            visibility: it.visibility,
            pinned: !!it.pinned,
            published_at: toLocalInput(it.published_at),
            page_ids: (itm.page_ids as number[]) || [],
          });
        }
        setErr(null);
      } catch (e: any) {
        setErr(e.message || "Yüklenemedi");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, editing]);

  // slug oto (başlıktan) – kullanıcı elle değiştirdiyse dokunmaz
  // const canAutoSlug = useMemo(
  //   () => !editing && f.slug.trim() === "",
  //   [editing, f.slug]
  // );
  const canAutoSlug = useMemo(() => !editing && !slugTouched, [editing, slugTouched]);
  useEffect(() => {
    if (canAutoSlug && f.title) setF((s) => ({ ...s, slug: toSlug(f.title) }));
  }, [f.title, canAutoSlug]);

  async function save() {
    if (!f.title.trim() || !f.slug.trim() || !f.content_md.trim()) {
      setErr("Başlık, slug ve içerik zorunlu.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        ...f,
        pinned: f.pinned ? 1 : 0,
        published_at: fromLocalInput(f.published_at), // MySQL DATETIME ya da null
      };
      const r = await apiFetch(`${API_BASE}/api/admin/posts/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Kaydedilemedi");
      navigate("/admin/posts");
    } catch (e: any) {
      setErr(e.message || "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="admin-scope editor-wrap">
        <div className="muted">Yükleniyor…</div>
      </div>
    );

  return (
    <div className="admin-scope editor-wrap">
      <div className="editor-bar">
        <h2 className="title">{editing ? "Postu Düzenle" : "Yeni Post"}</h2>
        <div className="gap">
          <button className="btn" onClick={() => navigate("/admin/posts")}>
            ← Liste
          </button>
          <button className="btn primary" onClick={save} disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      {err && <div className="alert error">{err}</div>}

      <div className="form-grid">
        <div className="col">
          <label className="label">Başlık</label>
          <input
            className="input"
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />

          <label className="label">Slug</label>
          <input
            className="input"
            value={f.slug}
            onChange={(e) => setF({ ...f, slug: e.target.value })}
          />

          <label className="label">
            Kapak Görseli (URL) <span className="muted">ya da dosya yükle</span>
          </label>
          <input
            className="input"
            value={f.cover_url}
            onChange={(e) => setF({ ...f, cover_url: e.target.value })}
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                uploadCover(file).catch((err) =>
                  alert(err.message || "Yüklenemedi")
                );
            }}
            className="input"
          />
          {f.cover_url && (
            <img
              src={f.cover_url}
              alt="Kapak"
              style={{
                maxWidth: "360px",
                borderRadius: 8,
                border: "1px solid var(--line)",
              }}
            />
          )}
          <label className="label">Özet</label>
          <textarea
            className="input"
            rows={3}
            value={f.excerpt}
            onChange={(e) => setF({ ...f, excerpt: e.target.value })}
          />

          <label className="label">İçerik (Markdown)</label>
          <textarea
            className="input mono"
            rows={14}
            value={f.content_md}
            onChange={(e) => setF({ ...f, content_md: e.target.value })}
          />
        </div>

        <div className="col">
          <div className="group">
            <label className="label">Durum</label>
            <select
              className="input"
              value={f.status}
              onChange={(e) => setF({ ...f, status: e.target.value as any })}
            >
              <option value="draft">Taslak</option>
              <option value="scheduled">Planlı</option>
              <option value="published">Yayınlandı</option>
              <option value="archived">Arşiv</option>
            </select>
          </div>

          <div className="group">
            <label className="label">Görünürlük</label>
            <select
              className="input"
              value={f.visibility}
              onChange={(e) =>
                setF({ ...f, visibility: e.target.value as any })
              }
            >
              <option value="public">Herkese Açık</option>
              <option value="private">Gizli</option>
            </select>
          </div>

          <div className="group">
            <label className="label">Yayın Tarihi</label>
            <input
              type="datetime-local"
              className="input"
              value={f.published_at ?? ""}
              onChange={(e) =>
                setF({ ...f, published_at: e.target.value || null })
              }
            />
            <div className="muted">
              “Planlı” için ileri tarih, “Yayınlandı” için şimdi/öncesi.
            </div>
          </div>

          <div className="group">
            <label className="label">Görüneceği Sayfalar</label>
            <div className="chips">
              {pages.map((pg) => (
                <label
                  key={pg.id}
                  className={`chip ${f.page_ids.includes(pg.id) ? "on" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={f.page_ids.includes(pg.id)}
                    onChange={() => {
                      setF((s) => {
                        const has = s.page_ids.includes(pg.id);
                        const page_ids = has
                          ? s.page_ids.filter((x) => x !== pg.id)
                          : [...s.page_ids, pg.id];
                        return { ...s, page_ids };
                      });
                    }}
                  />
                  {pg.title}
                </label>
              ))}
            </div>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={f.pinned}
              onChange={(e) => setF({ ...f, pinned: e.target.checked })}
            />
            Sabitle
          </label>
        </div>
      </div>
    </div>
  );
}

/* ==== helpers ==== */

export function toSlug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

// MySQL DATETIME 'YYYY-MM-DD HH:mm:ss'
function fromLocalInput(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:00`;
}

// '2025-08-31 12:30:00' -> '2025-08-31T12:30'
function toLocalInput(mysql: string | null) {
  if (!mysql) return "";
  const d = new Date(mysql.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
