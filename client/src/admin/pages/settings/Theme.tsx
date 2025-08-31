export default function Theme() {
  const enableDark = () =>
    (document.documentElement.style.colorScheme = "dark");
  const enableLight = () =>
    (document.documentElement.style.colorScheme = "light");
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <button className="admin-btn" onClick={enableDark}>
        Koyu
      </button>
      <button className="admin-btn" onClick={enableLight}>
        Açık
      </button>
      <p style={{ opacity: 0.7, marginLeft: 8 }}>Varsayılan tema siyah.</p>
    </div>
  );
}
