import buduPhoto from "../assets/buduPhoto.png";
import src1 from "../assets/image1.png";
import src2 from "../assets/image2.png";
import src3 from "../assets/image3.png";
import src4 from "../assets/image4.png";
import "../css/Main.css";

function Main() {
  return (
    <>
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
            مصممة ومصورة محترفة، أُدير حسابات التواصل الاجتماعي وأدير الحملات
            الإعلانية باحترافية. أمتلك خبرة في التسويق الرقمي وصناعة محتوى جذاب
            يعكس هوية العلامات التجارية.
          </p>
          <div className="btn-group">
            <button className="btn btn-secondary">نموذج تطبيق المشروع</button>
            <button className="btn btn-primary">تواصل معي</button>
          </div>
        </section>
      </main>

      <section className="image-marquee">
        <div className="marquee-track">
          <img src={src1} alt="img1" />
          <img src={src2} alt="img2" />
          <img src={src3} alt="img3" />
          <img src={src4} alt="img4" />
          <img src={src1} alt="img1" />
          <img src={src2} alt="img2" />
          <img src={src3} alt="img3" />
          <img src={src4} alt="img4" />
          <img src={src1} alt="img1" />
          <img src={src2} alt="img2" />
          <img src={src3} alt="img3" />
          <img src={src4} alt="img4" />
          <img src={src1} alt="img1" />
          <img src={src2} alt="img2" />
          <img src={src3} alt="img3" />
          <img src={src4} alt="img4" />
        </div>
      </section>

      <section className="stats-section">
        <div className="stat-item">
          <p className="stat-label">Tasarlanmış Alanlar</p>
          <p className="stat-value">42</p>
        </div>
        <div className="stat-item">
          <p className="stat-label">Müşteri Memnuniyeti</p>
          <p className="stat-value">100%</p>
        </div>
        <div className="stat-item">
          <p className="stat-label">Tamamlanan Projeler</p>
          <p className="stat-value">142</p>
        </div>
        <div className="stat-item">
          <p className="stat-label">Deneyim Sürem</p>
          <p className="stat-value">15</p>
        </div>
      </section>
    </>
  );
}

export default Main;
