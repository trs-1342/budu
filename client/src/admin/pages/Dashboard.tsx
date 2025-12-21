import { useEffect, useState } from "react";
import { adminFetch, ADMIN_API_BASE } from "../../lib/adminAuth";
import "../css/layout-scoped.css";

type Stats = {
  total: number;
  unread: number;
  read: number;
  archived: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await adminFetch(`${ADMIN_API_BASE}/api/messages/stats`);
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "İstatistik alınamadı");
      setStats(d as Stats);
    } catch (e: any) {
      setErr(e.message || "Hata");
      setStats({ total: 0, unread: 0, read: 0, archived: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="ad-grid">
      <div className="ad-card">
        <h3 className="ad-card-title">Hoş geldin</h3>
        <p className="ad-muted">Soldaki menüden sayfalara geçiş yap.</p>
      </div>

      <div className="ad-card">
        <h3 className="ad-card-title">Durum</h3>
        <ul className="ad-list">
          <li>
            Sunucu: <b>aktif</b>
          </li>
          <li>
            Veritabanı: <b>bağlı</b>
          </li>
        </ul>
      </div>

      <div className="ad-card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <h3 className="ad-card-title">Mesaj İstatistikleri</h3>
          <button className="ad-logout sm" onClick={load} title="Yenile">
            Yenile
          </button>
        </div>

        {loading && <p className="ad-muted">Yükleniyor…</p>}
        {err && <p className="ad-muted">Hata: {err}</p>}

        <ul className="ad-list" style={{ marginTop: 8 }}>
          <li>
            Okunmamış: <b>{stats?.unread ?? 0}</b>
          </li>
          <li>
            Okunmuş: <b>{stats?.read ?? 0}</b>
          </li>
          <li>
            Arşiv: <b>{stats?.archived ?? 0}</b>
          </li>
          <li>
            Toplam: <b>{stats?.total ?? 0}</b>
          </li>
        </ul>
      </div>
    </div>
  );
}
