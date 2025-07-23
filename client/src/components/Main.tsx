import buduPhoto from "../assets/buduPhoto.png"; // kendi görseliniz
import "../css/Main.css"; // yeni stil dosyası

function Main() {
  return (
    <main className="main-container">
      {/* SOL TARAF – Fotoğraf + durum rozeti */}
      <section className="left-section">
        <img src={buduPhoto} alt="Profil fotoğrafı" />

        <span className="status-badge">نشط بالعمل</span>
      </section>

      {/* SAĞ TARAF – Başlık, metin, butonlar */}
      <section className="right-section">
        <h2 className="title">بشرى دخان</h2>

        <p className="subtitle">
          مصمم ومصور محترف، أُدير حسابات التواصل الاجتماعي وأدير الحملات
          الإعلانية باحترافية. أمتلك خبرة في التسويق الرقمي وصناعة محتوى جذاب
          يعكس هوية العلامات التجارية.
        </p>

        <div className="btn-group">
          <button className="btn btn-secondary">نموذج تطبيق المشروع</button>
          <button className="btn btn-primary">تواصل معي</button>
        </div>
      </section>
    </main>
  );
}

export default Main;
