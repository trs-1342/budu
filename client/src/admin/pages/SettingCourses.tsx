import { useEffect, useMemo, useRef, useState } from "react";
import { adminFetch, ADMIN_API_BASE } from "../../lib/adminAuth";
import "../css/admin-courses-scoped.css";

type Course = {
  id: number;
  title: string;
  detail: string | null;
  video_url: string;
  created_at: string;
};

export default function SettingCourses() {
  const [list, setList] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSave = useMemo(() => title.trim() && file, [title, file]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await adminFetch(`${ADMIN_API_BASE}/api/admin/courses`);
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Liste alınamadı");
      setList(d.list as Course[]);
    } catch (e: any) {
      setErr(e.message || "Hata");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    try {
      // temel doğrulama
      if (file && !file.type.startsWith("video/")) {
        alert("Lütfen bir video dosyası seçin (mp4, mov, webm…).");
        return;
      }
      setSaving(true);
      setErr(null);

      const fd = new FormData();
      fd.append("title", title.trim());
      if (detail.trim()) fd.append("detail", detail.trim());
      if (file) fd.append("video", file);

      // NOT: adminFetch FormData ile 'Content-Type' set etmez; diğer admin sayfalarıyla aynı. :contentReference[oaicite:3]{index=3}
      const r = await adminFetch(`${ADMIN_API_BASE}/api/admin/courses`, {
        method: "POST",
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Kaydedilemedi");

      // formu temizle + listeyi en üste ekle
      setTitle("");
      setDetail("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setList((xs) => [d.item as Course, ...xs]);
    } catch (e: any) {
      setErr(e.message || "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Bu kurs videosunu silmek istiyor musun?")) return;
    const prev = [...list];
    setList((xs) => xs.filter((x) => x.id !== id));
    try {
      const r = await adminFetch(`${ADMIN_API_BASE}/api/admin/courses/${id}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Silinemedi");
    } catch (e: any) {
      alert(e?.message || "Silme başarısız");
      setList(prev);
    }
  }

  return (
    <div className="admin-scope courses-wrap" style={{ padding: 20 }}>
      <div
        className="ad-card is-form"
        style={{ maxWidth: 900, margin: "0 auto 24px", padding: 16 }}
      >
        <h2 className="ad-card-title">Kurs Videosu Yükle</h2>
        <form onSubmit={onSubmit} className="panel panel-form" noValidate>
          <div className="form-grid" style={{ display: "grid", gap: 12 }}>
            <div>
              <label className="label">Başlık</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Tasarım 101 – Giriş"
                required
              />
            </div>
            <div>
              <label className="label">Detay (opsiyonel)</label>
              <textarea
                className="input"
                rows={3}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Video hakkında kısa bilgi…"
              />
            </div>
            <div>
              <label className="label">Video dosyası</label>
              <input
                ref={fileRef}
                className="input"
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
              <div className="muted" style={{ marginTop: 6 }}>
                Sunucuda <code>/server/courses/video</code> altına
                kaydedilecektir.
              </div>
            </div>
          </div>

          <div className="row-end" style={{ marginTop: 12 }}>
            <button className="btn primary" disabled={!canSave || saving}>
              {saving ? "Yükleniyor…" : "Kaydet"}
            </button>
          </div>

          {err && (
            <div className="alert error" style={{ marginTop: 8 }}>
              {err}
            </div>
          )}
        </form>
      </div>

      <div className="ad-card" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h3 className="ad-card-title">Kayıtlı Kurslar</h3>

        {loading && <p className="ad-muted">Yükleniyor…</p>}
        {err && <p className="ad-muted">Hata: {err}</p>}
        {!loading && !err && list.length === 0 && (
          <div className="alert warn">Henüz kayıt yok.</div>
        )}

        <div
          className="table"
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "1fr",
            marginTop: 12,
          }}
        >
          {list.map((c) => (
            <article
              key={c.id}
              className="ad-card"
              style={{ padding: 12, display: "grid", gap: 12 }}
            >
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={c.title}
                  >
                    {c.title}
                  </div>
                  <div className="ad-muted" style={{ fontSize: 12 }}>
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a
                    className="btn"
                    href={
                      c.video_url.startsWith("http")
                        ? c.video_url
                        : `${ADMIN_API_BASE}${c.video_url}`
                    }
                    download
                    target="_blank"
                    rel="noreferrer"
                    title="İndir / Yeni sekmede aç"
                  >
                    İndir
                  </a>
                  <button className="btn danger" onClick={() => remove(c.id)}>
                    Sil
                  </button>
                </div>
              </header>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "1fr",
                }}
              >
                {c.detail ? (
                  <p className="ad-muted" style={{ margin: 0 }}>
                    {c.detail}
                  </p>
                ) : null}
                <video
                  controls
                  preload="metadata"
                  style={{
                    width: "100%",
                    maxHeight: 380,
                    borderRadius: 8,
                    border: "1px solid var(--line, #333)",
                    background: "#000",
                  }}
                  src={
                    c.video_url.startsWith("http")
                      ? c.video_url
                      : `${ADMIN_API_BASE}${c.video_url}`
                  }
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
