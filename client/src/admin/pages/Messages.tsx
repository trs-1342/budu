import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, API_BASE } from "../lib/auth";
import { BiSolidArchiveIn } from "react-icons/bi";
import { MdMarkunread, MdMarkEmailUnread } from "react-icons/md";
import "../css/messages-scoped.css";

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

type Status = "unread" | "read" | "archived" | "all";

export default function Messages() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("unread");
  const [list, setList] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQ = useDebounced(q, 250);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const url = new URL(`${API_BASE}/api/messages`);
      if (debouncedQ.trim()) url.searchParams.set("q", debouncedQ.trim());
      url.searchParams.set("status", status);
      const r = await apiFetch(url.toString());
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Liste alınamadı");
      setList(data.list as Msg[]);
    } catch (e: any) {
      setErr(e.message || "Hata");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [debouncedQ, status]);

  // focus kaybolmasın
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // canlı (polling)
  useEffect(() => {
    if (!live) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [live, debouncedQ, status]);

  async function toggleRead(m: Msg, read: boolean) {
    const prev = [...list];
    setList((cur) =>
      cur.map((x) => (x.id === m.id ? { ...x, is_read: read ? 1 : 0 } : x))
    );
    try {
      const r = await apiFetch(`${API_BASE}/api/messages/${m.id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });
      if (!r.ok) throw new Error("Güncellenemedi");
    } catch {
      setList(prev);
    }
  }

  async function toggleArchive(m: Msg, archived: boolean) {
    const prev = [...list];
    setList((cur) =>
      cur.map((x) =>
        x.id === m.id ? { ...x, is_archived: archived ? 1 : 0 } : x
      )
    );
    try {
      const r = await apiFetch(`${API_BASE}/api/messages/${m.id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      if (!r.ok) throw new Error("Güncellenemedi");
    } catch {
      setList(prev);
    }
  }

  async function remove(m: Msg) {
    const prev = [...list];
    setList((cur) => cur.filter((x) => x.id !== m.id));
    try {
      const r = await apiFetch(`${API_BASE}/api/messages/${m.id}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Silinemedi");
    } catch {
      setList(prev);
    }
  }

  const empty = !loading && !err && list.length === 0;

  return (
    <div className="admin-scope msg-wrap">
      <div className="msg-header">
        {/* Filtre kartları (ikon yerleri hazır) */}
        <div className="msg-tabs">
          <button
            className={`tab ${status === "unread" ? "active" : ""}`}
            onClick={() => setStatus("unread")}
            title="Okunmadı"
          >
            {<MdMarkEmailUnread fontSize={25} />}
          </button>
          <button
            className={`tab ${status === "read" ? "active" : ""}`}
            onClick={() => setStatus("read")}
            title="Okundu"
          >
            {<MdMarkunread fontSize={25} />}
          </button>
          <button
            className={`tab ${status === "archived" ? "active" : ""}`}
            onClick={() => setStatus("archived")}
            title="Arşiv"
          >
            {<BiSolidArchiveIn size={25} />}
          </button>
          <button
            className={`tab ${status === "all" ? "active" : ""}`}
            onClick={() => setStatus("all")}
            title="Hepsi"
          >
            Hepsi
          </button>
        </div>

        {/* Arama solda, odak sabit */}
        <input
          ref={inputRef}
          className="msg-search"
          placeholder="Ara: ad, email, konu, içerik…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Mesajlarda ara"
        />

        <div className="msg-actions-bar">
          <button className="btn" onClick={load} title="Yenile">
            Yenile
          </button>
          <label className="live">
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
            />
            Canlı
          </label>
        </div>
      </div>

      {err && <div className="alert error">{err}</div>}
      {empty && <div className="alert warn">Hiç mesaj yok.</div>}

      <div className="msg-list">
        {list.map((m) => (
          <article
            key={m.id}
            className={`msg-item ${m.is_read ? "is-read" : ""}`}
          >
            <header className="msg-head">
              <div className="msg-from">
                <b>{m.name}</b> <span className="dim">&lt;{m.email}&gt;</span>
              </div>
              <time className="msg-time">
                {new Date(m.created_at).toLocaleString()}
              </time>
            </header>

            <div className="msg-subject">{m.subject}</div>

            {/* tek satırda ... kısaltma */}
            <p className="msg-text line-1">{m.message}</p>

            <div className="msg-actions">
              <button
                className="btn"
                onClick={() => navigate(`/admin/messages/${m.id}`)}
              >
                Detay
              </button>
              <button className="btn" onClick={() => toggleRead(m, !m.is_read)}>
                {m.is_read ? "Okunmadı yap" : "Okundu işaretle"}
              </button>
              <button
                className="btn"
                onClick={() => toggleArchive(m, !m.is_archived)}
              >
                {m.is_archived ? "Arşivden çıkar" : "Arşivle"}
              </button>
              <button className="btn danger" onClick={() => remove(m)}>
                Sil
              </button>
            </div>
          </article>
        ))}

        {loading && <div className="msg-loading">Yükleniyor…</div>}
      </div>
    </div>
  );
}

function useDebounced<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
