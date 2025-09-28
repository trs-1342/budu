import { useEffect, useMemo, useState } from "react";
import { apiFetch, API_BASE } from "../lib/auth";
import { FiSettings, FiRefreshCw, FiX, FiPlus } from "react-icons/fi";
import "../css/admin-scoped.css";
import "../css/Account.css";

type AdminUser = {
  id: number;
  username: string;
  email: string;
  role: "admin" | "editor" | "user";
  is_active?: 0 | 1;
  create_at?: string;
};

type Query = {
  q: string;
  limit: number;
  status: "all" | "active" | "passive";
};

export default function AccountAdmins() {
  const [list, setList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [query, setQuery] = useState<Query>({
    q: "",
    limit: 50,
    status: "all",
  });

  const filtered = useMemo(() => {
    let xs = list;
    if (query.q.trim()) {
      const t = query.q.toLowerCase();
      xs = xs.filter(
        (u) =>
          u.username.toLowerCase().includes(t) ||
          u.email.toLowerCase().includes(t)
      );
    }
    if (query.status !== "all") {
      xs = xs.filter((u) =>
        query.status === "active"
          ? (u.is_active ?? 1) === 1
          : (u.is_active ?? 1) === 0
      );
    }
    return xs.slice(0, query.limit);
  }, [list, query]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await apiFetch(`${API_BASE}/api/admin/users?role=admin`);
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Liste alınamadı");
      setList(d.list as AdminUser[]);
    } catch (e: any) {
      setErr(e.message || "Hata");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="admin-scope acc-wrap" style={{ padding: 16 }}>
      <div className="ad-card" style={{ marginBottom: 16 }}>
        <div
          className="ad-card-title"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Admin Hesapları</span>
          <div
            className="gap"
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <input
              className="input"
              placeholder="Ara: kullanıcı adı / e-posta"
              value={query.q}
              onChange={(e) => setQuery({ ...query, q: e.target.value })}
              style={{ width: 280 }}
            />
            <select
              className="input"
              value={query.status}
              onChange={(e) =>
                setQuery({ ...query, status: e.target.value as any })
              }
            >
              <option value="all">Hepsi</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
            </select>
            <button className="btn" onClick={load} title="Yenile">
              <FiRefreshCw />
            </button>
            <button
              className="btn primary"
              onClick={() => setCreateOpen(true)}
              title="Yeni Admin"
            >
              <FiPlus style={{ marginRight: 6 }} /> Yeni Admin
            </button>
          </div>
        </div>
        {err && (
          <div className="alert error" style={{ marginTop: 8 }}>
            {err}
          </div>
        )}
      </div>

      <div className="ad-card" style={{ overflowX: "auto" }}>
        <table
          className="ad-table"
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>ID</th>
              <th style={{ textAlign: "left" }}>Kullanıcı Adı</th>
              <th style={{ textAlign: "left" }}>E-posta</th>
              <th style={{ textAlign: "left" }}>Rol</th>
              <th style={{ textAlign: "left" }}>Durum</th>
              <th style={{ textAlign: "right" }}>Ayar</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="ad-muted">
                  Yükleniyor…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="ad-muted">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>#{u.id}</td>
                <td style={{ fontWeight: 600 }}>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.is_active ?? 1 ? "Aktif" : "Pasif"}</td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn"
                    title="Ayarlar"
                    onClick={() => setOpenId(u.id)}
                  >
                    <FiSettings />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openId !== null && (
        <EditDrawer
          id={openId}
          onClose={() => setOpenId(null)}
          onSaved={(updated) => {
            setList((xs) => xs.map((x) => (x.id === updated.id ? updated : x)));
            setOpenId(null);
          }}
        />
      )}

      {createOpen && (
        <CreateDrawer
          onClose={() => setCreateOpen(false)}
          onCreated={(created) => {
            // yeni eklenen başa eklensin
            setList((xs) => [created, ...xs]);
            setCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* === Düzenleme çekmecesi (mevcut) === */
function EditDrawer({
  id,
  onClose,
  onSaved,
}: {
  id: number;
  onClose: () => void;
  onSaved: (u: AdminUser) => void;
}) {
  const [f, setF] = useState<AdminUser | null>(null);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch(`${API_BASE}/api/admin/users/${id}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "Kullanıcı alınamadı");
        setF(d.item as AdminUser);
      } catch (e: any) {
        setErr(e.message || "Hata");
      }
    })();
  }, [id]);

  async function save() {
    if (!f) return;
    setSaving(true);
    setErr(null);
    try {
      const payload: any = {
        username: f.username,
        email: f.email,
        ...(password.trim() ? { password: password.trim() } : {}),
        ...(typeof f.is_active !== "undefined"
          ? { is_active: f.is_active }
          : {}),
      };
      const r = await apiFetch(`${API_BASE}/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Kaydedilemedi");
      onSaved(d.item as AdminUser);
    } catch (e: any) {
      setErr(e.message || "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="drawer-mask" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h3 className="drawer-title">Admin Ayarları</h3>
          <button className="btn" onClick={onClose} title="Kapat">
            <FiX />
          </button>
        </div>

        {err && <div className="alert error">{err}</div>}
        {!f ? (
          <div className="ad-muted">Yükleniyor…</div>
        ) : (
          <div className="form-grid" style={{ display: "grid", gap: 12 }}>
            <div>
              <label className="label">Kullanıcı adı</label>
              <input
                className="input"
                value={f.username}
                onChange={(e) =>
                  setF({ ...(f as AdminUser), username: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">E-posta</label>
              <input
                className="input"
                type="email"
                value={f.email}
                onChange={(e) =>
                  setF({ ...(f as AdminUser), email: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Yeni parola (opsiyonel)</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Değiştirmek istemiyorsan boş bırak"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={(f.is_active ?? 1) === 1}
                  onChange={(e) =>
                    setF({
                      ...(f as AdminUser),
                      is_active: e.target.checked ? 1 : 0,
                    })
                  }
                />
                Aktif
              </label>
            </div>
            <div className="row-end">
              <button className="btn primary" onClick={save} disabled={saving}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* === YENİ: Oluşturma çekmecesi === */
function CreateDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (u: AdminUser) => void;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        username: username.trim(),
        email: email.trim(),
        password: password.trim(),
        role: "admin",
        is_active: isActive ? 1 : 0,
      };
      const r = await apiFetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Oluşturulamadı");
      onCreated(d.item as AdminUser);
    } catch (e: any) {
      setErr(e.message || "Oluşturulamadı");
    } finally {
      setSaving(false);
    }
  }

  const canSave =
    username.trim().length >= 3 &&
    email.includes("@") &&
    password.trim().length >= 6;

  return (
    <div className="drawer-mask" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h3 className="drawer-title">Yeni Admin</h3>
          <button className="btn" onClick={onClose} title="Kapat">
            <FiX />
          </button>
        </div>

        {err && <div className="alert error">{err}</div>}

        <div className="form-grid" style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="label">Kullanıcı adı</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="en az 3 karakter"
            />
          </div>
          <div>
            <label className="label">E-posta</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="label">Parola</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="en az 6 karakter"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="switch">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Aktif
            </label>
          </div>

          <div className="row-end">
            <button
              className="btn primary"
              onClick={create}
              disabled={saving || !canSave}
              title={!canSave ? "Zorunlu alanları doldur" : "Oluştur"}
            >
              {saving ? "Oluşturuluyor…" : "Oluştur"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Drawer örnek stilleri (Account.css içine koyabilirsin)
.drawer-mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); display:flex; justify-content:flex-end; z-index:999; }
.drawer { width: 420px; max-width: 92vw; background:#1e1e1e; height:100%; padding:16px; border-left:1px solid var(--line,#333); }
.drawer-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.drawer-title { margin:0; }
*/
