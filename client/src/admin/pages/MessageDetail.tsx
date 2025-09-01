import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, API_BASE } from "../lib/auth";
import "../css/message-detail-scoped.css";

type Msg = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: 0 | 1;
  is_archived: 0 | 1;
  created_at: string;
};

export default function MessageDetail() {
  const { id } = useParams();
  const [item, setItem] = useState<Msg | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await apiFetch(`${API_BASE}/api/messages/${id}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Bulunamadı");
      setItem(d.item as Msg);
    } catch (e: any) {
      setErr(e.message || "Hata");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [id]);

  async function setRead(read: boolean) {
    await apiFetch(`${API_BASE}/api/messages/${id}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    });
    await load();
  }

  async function setArchived(archived: boolean) {
    await apiFetch(`${API_BASE}/api/messages/${id}/archive`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
    await load();
  }

  async function remove() {
    await apiFetch(`${API_BASE}/api/messages/${id}`, { method: "DELETE" });
    navigate("/admin/messages");
  }

  if (loading)
    return (
      <div className="admin-scope md-wrap">
        <div className="md-card">Yükleniyor…</div>
      </div>
    );
  if (err || !item)
    return (
      <div className="admin-scope md-wrap">
        <div className="md-card">Hata: {err}</div>
      </div>
    );

  return (
    <div className="admin-scope md-wrap">
      <div className="md-head">
        <button className="btn" onClick={() => navigate(-1)}>
          ← Geri
        </button>
        <div className="md-actions">
          <button className="btn" onClick={() => setRead(!item.is_read)}>
            {item.is_read ? "Okunmadı" : "Okundu"}
          </button>
          <button
            className="btn"
            onClick={() => setArchived(!item.is_archived)}
          >
            {item.is_archived ? "Arşivden çıkar" : "Arşivle"}
          </button>
          <button className="btn danger" onClick={remove}>
            Sil
          </button>
        </div>
      </div>

      <article className="md-card">
        <header className="md-meta">
          <div>
            <div className="md-from">
              <b>{item.name}</b> &lt;{item.email}&gt;
            </div>
            <div className="md-time">
              {new Date(item.created_at).toLocaleString()}
            </div>
          </div>
          <div className="md-badges">
            {item.is_read ? (
              <span className="badge">Okundu</span>
            ) : (
              <span className="badge">Okunmadı</span>
            )}
            {item.is_archived ? <span className="badge">Arşiv</span> : null}
          </div>
        </header>

        <h3 className="md-subject">{item.subject}</h3>
        <pre className="md-body">{item.message}</pre>
      </article>
    </div>
  );
}
