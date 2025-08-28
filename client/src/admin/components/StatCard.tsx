import React from "react";

export default function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div
      className="stat-card"
      style={{
        background: "#0f0f10",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div style={{ opacity: 0.85, fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{value}</div>
      {sub && (
        <div style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}
