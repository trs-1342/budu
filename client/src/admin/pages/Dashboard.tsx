import StatCard from "../components/StatCard";
import { getPages, getSite, getUsers } from "../store";

export default function Dashboard() {
  const site = getSite();
  const users = getUsers();
  const pages = getPages();

  return (
    <div className="dash">
      <h2>Dashboard</h2>
      <div
        className="grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0,1fr))",
          gap: 12,
        }}
      >
        <StatCard title="Site adı" value={site.siteName || "—"} />
        <StatCard title="Kullanıcı sayısı" value={users.length} />
        <StatCard title="Sayfa sayısı" value={pages.length} />
        <StatCard
          title="Durum"
          value="Geçici oturum"
          sub="Backend bağlanacak"
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Hızlı Aksiyonlar</h3>
        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}
        >
          <a className="admin-btn" href="/admin/site">
            Site ayarları
          </a>
          <a className="admin-btn" href="/admin/account">
            Hesabım
          </a>
          <a className="admin-btn" href="/admin/users">
            Kullanıcılar
          </a>
          <a className="admin-btn" href="/admin/pages">
            Sayfalar
          </a>
        </div>
      </div>
    </div>
  );
}
