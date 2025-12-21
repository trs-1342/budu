import { useEffect, useState } from "react";
import { ADMIN_API_BASE } from "../../lib/adminAuth";

type ImageItem = {
  name: string;
  url: string;
};

export default function Gallery() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchImages = () => {
    fetch(`${ADMIN_API_BASE}/api/admin/gallery`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setImages(data.images || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleDelete = async (name: string) => {
    if (!window.confirm("Bu fotoğrafı silmek istediğinize emin misiniz?"))
      return;
    try {
      const res = await fetch(
        `${ADMIN_API_BASE}/api/admin/gallery/${encodeURIComponent(name)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        }
      );
      if (!res.ok) throw new Error("Silme başarısız");
      setImages((prev) => prev.filter((img) => img.name !== name));
    } catch (err: any) {
      alert(err.message || "Hata oluştu");
    }
  };

  if (loading) return <p>Yükleniyor...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Fotoğraf Galerisi</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "16px",
          marginTop: "1rem",
        }}
      >
        {images.map((img) => (
          <div
            key={img.name}
            style={{
              border: "1px solid #333",
              borderRadius: "10px",
              overflow: "hidden",
              background: "#111",
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "8px",
            }}
          >
            <img
              src={img.url}
              alt={img.name}
              style={{
                width: "100%",
                height: "150px",
                objectFit: "cover",
                borderRadius: "6px",
              }}
            />
            <div
              style={{
                marginTop: "8px",
                display: "flex",
                gap: "8px",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <button
                onClick={() => handleDelete(img.name)}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: "6px",
                  background: "#e11d48",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Sil
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(img.url, { mode: "cors" });
                    if (!response.ok) throw new Error("İndirme başarısız");
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = img.name || "download";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (err: any) {
                    alert(err.message || "İndirme sırasında hata oluştu");
                  }
                }}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: "6px",
                  background: "#2563eb",
                  color: "#fff",
                  textAlign: "center",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                İndir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
