import React from "react";
// import Header from "../../components/Header";
// import Footer from "../../components/Footer";
import "../css/admin-not-found-scoped.css";
import "../../App.css";

const AdminNotFound: React.FC = () => (
    <>
        {/* <Header /> */}
        <div className="admin-not-found-bg" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div
                style={{
                    background: "#222",
                    borderRadius: "16px",
                    padding: "48px 32px",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
                    textAlign: "center",
                    color: "#fff",
                    maxWidth: "480px",
                    width: "100%",
                }}
            >
                <h1 style={{ fontSize: "7rem", color: "#d32f2f", fontWeight: "bold", margin: "0 0 16px 0" }}>٤٠٤</h1>
                <h2 style={{ fontWeight: "bold", marginBottom: "16px" }}>لم يتم العثور على صفحة المسؤول</h2>
                <p style={{ marginBottom: "24px" }}>نأسف، صفحة المسؤول التي تبحث عنها غير موجودة.</p>
                <a
                    href="/admin"
                    style={{
                        display: "inline-block",
                        background: "#1976d2",
                        color: "#fff",
                        padding: "12px 32px",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontWeight: "bold",
                        fontSize: "1.1rem",
                        boxShadow: "0 2px 8px rgba(25, 118, 210, 0.2)",
                        transition: "background 0.2s",
                    }}
                >
                    العودة إلى الصفحة الرئيسية للمسؤول
                </a>
            </div>
        </div>
        {/* <Footer /> */}
    </>
);

export default AdminNotFound;