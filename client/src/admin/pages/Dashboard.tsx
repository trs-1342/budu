export default function Dashboard() {
  // örnek metrik kartları
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(4, minmax(0,1fr))",
      }}
    >
      {[
        { k: "Mesajlar", v: "128" },
        { k: "Sayfalar", v: "12" },
        { k: "Postlar", v: "34" },
        { k: "Aktif Kullanıcı", v: "4" },
      ].map((m) => (
        <div
          key={m.k}
          style={{
            background: "#0f0f10",
            border: "1px solid #1f1f1f",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div style={{ opacity: 0.7, fontSize: 12 }}>{m.k}</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{m.v}</div>
        </div>
      ))}
    </div>
  );
}
