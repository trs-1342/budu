import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../auth/api";

type Message = {
    id: string;
    name: string;
    email: string;
    subject: string;
    content: string;
    created_at: string;
    is_read: boolean;
    is_archived: boolean;
};

export default function MessageDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [message, setMessage] = useState<Message | null>(null);
    const [replySubject, setReplySubject] = useState("");
    const [replyContent, setReplyContent] = useState("");
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (id) {
            loadMessage();
        }
        // eslint-disable-next-line
    }, [id]);

    const loadMessage = async () => {
        try {
            const { data } = await api.get(`/admin/messages/${id}`);
            setMessage(data);
            setReplySubject(`Re: ${data.subject}`);
        } catch (error) {
            console.error("Mesaj detayları yüklenirken hata:", error);
        }
    };

    const handleReply = async () => {
        if (!message || !replyContent.trim()) return;

        setIsSending(true);
        try {
            // Email gönderme işlemi için API endpoint'i oluşturmanız gerekebilir
            console.log("Yanıt gönderiliyor:", {
                to: message.email,
                subject: replySubject,
                message: replyContent,
            });

            alert("Yanıt gönderildi!");
            setReplyContent("");
        } catch (error) {
            console.error("Yanıt gönderilirken hata:", error);
            alert("Yanıt gönderilemedi.");
        } finally {
            setIsSending(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("tr-TR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (!message) {
        return <div style={{ color: "#fff", textAlign: "center", marginTop: 40 }}>Yükleniyor...</div>;
    }

    return (
        <div
            style={{
                maxWidth: "800px",
                margin: "0 auto",
                background: "#181A20",
                minHeight: "100vh",
                padding: "40px",
                borderRadius: "8px",
                color: "#F1F1F1",
                fontFamily: "Inter, Arial, sans-serif",
            }}
        >
            <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 32, color: "#fff" }}>
                Mesaj Detayları
            </h1>

            <button
                onClick={() => navigate("/admin/messages")}
                className="admin-btn"
                style={{
                    marginBottom: "24px",
                    background: "none",
                    color: "#A3A3A3",
                    border: "none",
                    fontSize: 16,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}
            >
                <span style={{ fontSize: 20 }}>←</span> Geri Dön
            </button>

            <div
                style={{
                    background: "#23262F",
                    padding: "28px",
                    borderRadius: "14px",
                    marginBottom: "28px",
                    boxShadow: "0 2px 12px 0 rgba(0,0,0,0.18)",
                }}
            >
                <h2 style={{ fontSize: 24, fontWeight: 600, color: "#fff", marginBottom: 18 }}>
                    {message.subject}
                </h2>

                <div style={{ marginBottom: "12px", color: "#A3A3A3" }}>
                    <strong style={{ color: "#F1F1F1" }}>Gönderen:</strong> {message.name} ({message.email})
                </div>

                <div style={{ marginBottom: "18px", color: "#A3A3A3" }}>
                    <strong style={{ color: "#F1F1F1" }}>Tarih:</strong> {formatDate(message.created_at)}
                </div>

                <div
                    style={{
                        marginBottom: "10px",
                        padding: "18px",
                        background: "#1A1C23",
                        borderRadius: "8px",
                        whiteSpace: "pre-wrap",
                        color: "#E5E5E5",
                        fontSize: 16,
                        lineHeight: 1.7,
                        border: "1px solid #23262F",
                    }}
                >
                    {message.content}
                </div>
            </div>

            <div
                style={{
                    background: "#23262F",
                    padding: "28px",
                    borderRadius: "14px",
                    boxShadow: "0 2px 12px 0 rgba(0,0,0,0.18)",
                }}
            >
                <h3 style={{ fontSize: 20, fontWeight: 600, color: "#fff", marginBottom: 18 }}>Yanıtla</h3>

                <div style={{ marginBottom: "18px" }}>
                    <label className="admin-label" style={{ color: "#A3A3A3", fontWeight: 500, marginBottom: 6, display: "block" }}>
                        Konu
                    </label>
                    <input
                        className="admin-input"
                        value={replySubject}
                        onChange={(e) => setReplySubject(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #353945",
                            background: "#181A20",
                            color: "#F1F1F1",
                            fontSize: 16,
                            marginBottom: 0,
                            outline: "none",
                            transition: "border 0.2s",
                        }}
                    />
                </div>

                <div style={{ marginBottom: "18px" }}>
                    <label className="admin-label" style={{ color: "#A3A3A3", fontWeight: 500, marginBottom: 6, display: "block" }}>
                        Mesaj
                    </label>
                    <textarea
                        className="admin-input"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Yanıtınızı yazın..."
                        style={{
                            width: "100%",
                            minHeight: "150px",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #353945",
                            background: "#181A20",
                            color: "#F1F1F1",
                            fontSize: 16,
                            resize: "vertical",
                            outline: "none",
                            transition: "border 0.2s",
                        }}
                    />
                </div>

                <button
                    onClick={handleReply}
                    disabled={isSending || !replyContent.trim()}
                    className="admin-btn"
                    style={{
                        background: "linear-gradient(90deg, #4F8CFF 0%, #6C47FF 100%)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "12px 32px",
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: isSending || !replyContent.trim() ? "not-allowed" : "pointer",
                        opacity: isSending || !replyContent.trim() ? 0.6 : 1,
                        transition: "opacity 0.2s",
                        marginTop: 8,
                        boxShadow: "0 2px 8px 0 rgba(76, 130, 251, 0.12)",
                    }}
                >
                    {isSending ? "Gönderiliyor..." : "Yanıtı Gönder"}
                </button>
            </div>
        </div>
    );
}
