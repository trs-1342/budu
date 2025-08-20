import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../App.css";

const NotFound: React.FC = () => (
  <>
    <Header />
    <div style={{ textAlign: "center", marginTop: "10%", marginBottom: "10%" }}>
      <h1 style={{ fontSize: "4rem", color: "#d32f2f" }}>٤٠٤</h1>
      <h2>الصفحة غير موجودة</h2>
      <p>عذراً، الصفحة التي تبحث عنها غير موجودة.</p>
      <a href="/" style={{ color: "#1976d2", textDecoration: "underline" }}>
        العودة إلى الصفحة الرئيسية
      </a>
    </div>
    <Footer />
  </>
);

export default NotFound;
