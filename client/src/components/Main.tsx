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
        <section
          className="left-section reveal reveal--fade"
          data-reveal-group
          style={{ "--reveal-stagger": "120ms" } as React.CSSProperties}
        >
          <img
            src={buduPhoto}
            alt="Profil fotoğrafı"
            className="reveal reveal--left"
          />
          <span className="status-badge reveal reveal--up">نشط بالعمل</span>
        </section>

        <section className="right-section reveal reveal--right">
          <h2 className="title">بشرى</h2>
          <p className="subtitle">أنا بشرى، متخصصة في كتابة المحتوى الإبداعي وتصميم الجرافيك، أعمل في مجال صناعة المحتوى الرقمي وبناء الهويات البصرية. أمتلك خبرة في إعداد المحتوى للمنصات المختلفة، ووضع خطط محتوى استراتيجية مدروسة تخدم الأهداف التسويقية وتخاطب الجمهور بوضوح واحتراف.
أقدّم خدمات متكاملة تشمل كتابة المحتوى التسويقي، تصميم الجرافيك للسوشيال ميديا والمطبوعات، بالإضافة إلى الإشراف على المتدربين ونقل الخبرة العملية وفق متطلبات السوق. أؤمن بأن المحتوى الناجح لا يعتمد على الجمال فقط، بل على الفكرة، الرسالة، والأثر الحقيقي.
أحرص في أعمالي على الجمع بين الإبداع، البساطة، والدقة، مع تركيز دائم على تقديم قيمة حقيقية تعكس هوية المشروع وتدعم نموه.</p>
          <div className="btn-group">
            {/* <button className="btn btn-secondary">نموذج تطبيق المشروع</button> */}
            <a href="https://wa.me/+905374943971" target="_blank" rel="noopener noreferrer">
              <button className="btn btn-primary">تواصل معي</button>
            </a>
          </div>
        </section>
      </main>

      <section className="image-marquee reveal reveal--fade">
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

      <section
        className="stats-section"
        data-reveal-group
        style={{ "--reveal-stagger": "90ms" } as React.CSSProperties}
      >
        <div className="stat-item">
          <p className="stat-label">المجالات المصممة</p>
          <p className="stat-value">42</p>
        </div>
        <div className="stat-item">
          <p className="stat-label">رضا العملاء</p>
          <p className="stat-value">100%</p>
        </div>
        <div className="stat-item">
          <p className="stat-label">المشاريع المنجزة</p>
          <p className="stat-value">142</p>
        </div>
        <div className="stat-item">
          <p className="stat-label">سنوات الخبرة</p>
          <p className="stat-value">15</p>
        </div>
      </section>
    </>
  );
}

export default Main;
