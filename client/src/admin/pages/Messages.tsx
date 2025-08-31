import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../auth/api";

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  content: string;
  createdAt: string;
  is_read: boolean;
  is_archived: boolean;
};

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm); // 👈 yeni state
  const navigate = useNavigate();

  // Debounce etkisi
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 400); // 400ms sonra yazı durursa arar

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  // Arama ve veri çekme
  useEffect(() => {
    loadMessages();
  }, [debouncedTerm]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/messages", {
        params: { q: debouncedTerm },
      });
      setMessages(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const goDetail = (id: string) => navigate(`/admin/messages/${id}`);

  return (
    <div>
      <h2>Gelen Mesajlar</h2>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input
          className="admin-input"
          placeholder="Mesajlarda ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="admin-btn" onClick={loadMessages}>
          Yenile
        </button>
      </div>

      {/* Yükleme sadece tabloyu etkilesin */}
      <div className="table-scroll table-wrap">
        {loading ? (
          <div style={{ padding: 20 }}>Yükleniyor...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 88 }}>ID</th>
                <th style={{ width: 180 }}>Gönderen</th>
                <th style={{ width: 260 }}>Email</th>
                <th style={{ width: 240 }}>Konu</th>
                <th>Mesaj</th>
                <th style={{ width: 200 }}>Tarih</th>
                <th style={{ width: 120 }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr
                  key={m.id}
                  className={m.is_read ? "" : "tr-unread"}
                  onClick={() => goDetail(m.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{m.id}</td>
                  <td>{m.name}</td>
                  <td className="td-ellipsis">{m.email}</td>
                  <td className="td-ellipsis">{m.subject}</td>
                  <td className="td-ellipsis">{m.content}</td>
                  <td>{formatDate(m.createdAt)}</td>
                  <td>
                    <button
                      className="row-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        goDetail(m.id);
                      }}
                    >
                      Detay
                    </button>
                  </td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 22 }}>
                    Kayıt yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
