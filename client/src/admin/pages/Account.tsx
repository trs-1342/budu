// src/admin/pages/Account.tsx
import { useEffect, useState } from "react";
import { adminFetch, ADMIN_API_BASE } from "../../lib/adminAuth";
import "../css/Account.css";

type Me = {
  id: number;
  username: string;
  email: string;
  create_at: string; // MySQL DATETIME
};

export default function Account() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await adminFetch(`${ADMIN_API_BASE}/api/auth/me`);
        if (!r.ok) throw new Error("Yetkisiz veya oturum süresi doldu.");

        const data = await r.json().catch(() => ({} as any));

        // /api/auth/me yanıtını esnek karşıla
        const user = (data && (data.user || data.me || data.data)) || data;

        if (!user || !user.id) {
          throw new Error("Kullanıcı bilgileri alınamadı.");
        }

        if (alive) setMe(user as Me);
      } catch (e: any) {
        if (alive) setErr(e.message || "Bilgiler alınamadı.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="acc-wrap">
        <div className="acc-card">Yükleniyor…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="acc-wrap">
        <div className="acc-card">
          <div className="acc-row">
            <div className="acc-key">Hata</div>
            <div className="acc-val">{err}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!me) {
    // Teorik olarak buraya düşmemeliyiz ama yine de fallback bırakıyoruz
    return (
      <div className="acc-wrap">
        <div className="acc-card">
          <div className="acc-row">
            <div className="acc-key">Durum</div>
            <div className="acc-val">
              Kullanıcı bilgileri bulunamadı. Lütfen oturumu kapatıp tekrar
              giriş yapın.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const joined = new Date(me.create_at).toLocaleString();

  return (
    <div className="acc-wrap">
      <h2 className="acc-title">Hesap Bilgileri</h2>
      <div className="acc-card">
        <div className="acc-row">
          <div className="acc-key">Kullanıcı adı</div>
          <div className="acc-val">{me.username}</div>
        </div>
        <div className="acc-row">
          <div className="acc-key">E-posta</div>
          <div className="acc-val">{me.email}</div>
        </div>
        <div className="acc-row">
          <div className="acc-key">Üyelik</div>
          <div className="acc-val">{joined}</div>
        </div>
        <div className="acc-row">
          <div className="acc-key">ID</div>
          <div className="acc-val">#{me.id}</div>
        </div>
      </div>
    </div>
  );
}
