import StatCard from "./components/StatCard";
import { getPages, getSite, getUsers } from "./store";

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
    </div>
  );
}
