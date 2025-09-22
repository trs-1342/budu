// src/pages/Handbook.tsx
import PostsFeed from "./posts/PostsFeed";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../App.css";

function Handbook() {
  return (
    <>
      <Header />

      <div dir="rtl" style={{ padding: "56px 16px 80px" }}>
        {/* Üst sağ rozet */}
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <span
            className="hb-badge reveal reveal--fade"
            style={{
              fontSize: 14,
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              color: "#111827",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
            title="El kitabı"
          >
            Handbook <span aria-hidden>✨</span>
          </span>
        </div>

        {/* Başlık */}
        <header style={{ maxWidth: 1100, margin: "16px auto 24px" }}>
          <h1
            className="section-title reveal reveal--up"
            style={{
              textAlign: "right",
              fontSize: 48,
              lineHeight: 1.1,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: 0,
              color: "#0f172a",
            }}
          >
            كيف سنعمل سوياً
          </h1>
        </header>

        {/* Giriş metni */}
        <p
          className="reveal reveal--up"
          style={{
            maxWidth: 920,
            margin: "0 auto 48px",
            textAlign: "right",
            color: "#374151",
            fontSize: 18,
            lineHeight: 1.9,
          }}
        >
          قد يكون البعض لم يتعامل سابقاً مع مختص في مجال تصميم الهويات البصرية،
          بينما قد يكون لديكم خبرة مع شركات تُنجز المهام وفقاً للطلبات
          المُقدّمة، ولكن تجربـة التعامل معي قد تكون مُغايرة تماماً. أرغب في بدء
          التعامل بشفافية تامة، حيث سأشرح لكم فلسفتي في العمل وكيفية تقديم
          الخدمات بأسلوبي الخاص.
        </p>

        {/* 3'lü blok */}
        <section
          data-reveal-group
          style={
            {
              "--reveal-stagger": "90ms",
              maxWidth: 1100,
              margin: "0 auto",
              display: "grid",
              gap: 28,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              alignItems: "start",
            } as React.CSSProperties
          }
        >
          {/* 1 */}
          <article className="hb-step-card reveal reveal--up">
            <h3
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#0f172a",
                margin: "0 0 10px",
              }}
            >
              ١. التعاون الإبداعي
            </h3>
            <p style={{ color: "#374151", lineHeight: 1.9, margin: 0 }}>
              انا لستُ “مُنفّذ” لطلباتك، انا مستشارك وشريكك الاستراتيجي. وأكّد
              أن أي قرار تصميمي أتخذه سوياً سيكون من أجل مصلحة مشروعك.
            </p>
          </article>

          {/* 2 */}
          <article className="hb-step-card reveal reveal--up">
            <h3
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#0f172a",
                margin: "0 0 10px",
              }}
            >
              ٢. الاستراتيجيّة هي المرجع لنا
            </h3>
            <p style={{ color: "#374151", lineHeight: 1.9, margin: 0 }}>
              سواء كانت لديك إستراتيجية جاهزة أم عملنا عليها سوياً، سنكون هذه هي
              مرجعنا في كل قرار تصميمي سيتم اتخاذه خلال عملنا على المشروع.
            </p>
          </article>

          {/* 3 */}
          <article className="hb-step-card reveal reveal--up">
            <h3
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#0f172a",
                margin: "0 0 10px",
              }}
            >
              ٣. المراجعات والتعديلات
            </h3>
            <p style={{ color: "#374151", lineHeight: 1.9, margin: 0 }}>
              لضمان أن التصميم يعكس رؤيتك واستراتيجية مشروعك، سنحدد نقاطاً محددة
              خلال المشروع لمراجعة وتعديل التصاميم، لضمان أن النتيجة النهائية
              تتماشى مع تطلعاتك.
            </p>
          </article>
        </section>

        <section style={{ maxWidth: 1100, margin: "72px auto 0" }}>
          {/* Üst rozet */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 8,
            }}
          >
            <span
              className="hb-badge reveal reveal--fade"
              style={{
                fontSize: 14,
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                color: "#111827",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
              title="Adımlar"
            >
              الخطوات <span aria-hidden>✨</span>
            </span>
          </div>

          {/* Büyük başlık */}
          <h2
            className="section-title reveal reveal--up"
            style={{
              textAlign: "right",
              fontSize: 44,
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#0f172a",
              margin: "0 0 10px",
            }}
          >
            آلية العمل خلال المشروع
          </h2>

          {/* alt açıklama */}
          <p
            className="reveal reveal--center"
            style={{
              textAlign: "right",
              color: "#374151",
              fontSize: 18,
              lineHeight: 1.9,
              margin: "0 0 28px",
              maxWidth: 960,
            }}
          >
            يعمل هذا الإطار الديناميكي على تعزيز الإبداع والدقة، مما يضمن أن
            رحلة العمل على هويتك البصرية تتوافق بسلاسة مع أهداف مشروعك ورغبات
            جمهورك المستهدف.
          </p>

          {/* 6 adım – 2 kolonlu responsive grid */}
          <div
            data-reveal-group
            style={
              {
                "--reveal-stagger": "90ms",
                display: "grid",
                gap: 32,
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                alignItems: "start",
              } as React.CSSProperties
            }
          >
            {/* 01 */}
            <article className="hb-step-card reveal reveal--up">
              <h3
                style={{
                  margin: "0 0 8px",
                  color: "#0f172a",
                  fontSize: 18,
                  fontWeight: 800,
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-start",
                }}
              >
                <span>٠١ | تحديد الأهداف</span>
                <span aria-hidden style={{ opacity: 0.6 }}>
                  {" "}
                  🔍
                </span>
              </h3>
              <p style={{ color: "#374151", lineHeight: 1.9, margin: 0 }}>
                محادثتنا الأولى تشمل فهم متطلبات المشروع وتحديد أهدافه، ثم
                اختيار المنهجية الأنسب وإرسال عرض السعر والمخرجات النهائية.
              </p>
            </article>

            {/* 02 */}
            <article className="hb-step-card reveal reveal--up">
              <h3
                style={{
                  margin: "0 0 8px",
                  color: "#0f172a",
                  fontSize: 18,
                  fontWeight: 800,
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-start",
                }}
              >
                <span>٠٢ | الإستراتيجيّة</span>
                <span aria-hidden style={{ opacity: 0.6 }}>
                  {" "}
                  🧭
                </span>
              </h3>
              <p style={{ color: "#374151", lineHeight: 1.9, margin: 0 }}>
                في حالة عدم وجود استراتيجية، سنعمل معاً على بنائها وتشمل: قصة
                وشخصية العلامة، الفئة المستهدفة والرسالة، الاسم المميز Tagline.
              </p>
            </article>

            {/* 03 */}
            <article className="hb-step-card reveal reveal--up">
              <h3
                style={{
                  margin: "0 0 8px",
                  color: "#0f172a",
                  fontSize: 18,
                  fontWeight: 800,
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-start",
                }}
              >
                <span>٠٣ | التوجه الفني للهوية</span>
                <span aria-hidden style={{ opacity: 0.6 }}>
                  {" "}
                  ✏️
                </span>
              </h3>
              <p style={{ color: "#374151", lineHeight: 1.9, margin: 0 }}>
                في هذه المرحلة نحدد التوجه الفني للهوية البصرية عبر Moodboard
                يشمل: نوع الشعار، الألوان، الخطوط، أساليب الأشكال والعناصر.
              </p>
            </article>

            {/* 04 */}
            <article className="hb-step-card reveal reveal--up">
              <h3
                style={{
                  margin: "0 0 8px",
                  color: "#0f172a",
                  fontSize: 18,
                  fontWeight: 800,
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-start",
                }}
              >
                <span>٠٤ | العمل على الشعار والخط</span>
                <span aria-hidden style={{ opacity: 0.6 }}>
                  {" "}
                  🖋️
                </span>
              </h3>
              <p style={{ color: "#374151", lineHeight: 1.9, margin: 0 }}>
                نحول التوجه الفني إلى عناصر الهوية الأساسية، مثل الشعار والخطوط
                والعناصر المميزة كالنمط والإيقونات.
              </p>
            </article>

            {/* 05 */}
            <article className="hb-step-card reveal reveal--up">
              <h3
                style={{
                  margin: "0 0 8px",
                  color: "#0f172a",
                  fontSize: 18,
                  fontWeight: 800,
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-start",
                }}
              >
                <span>٠٥ | تصميم نقاط الإتصال</span>
                <span aria-hidden style={{ opacity: 0.6 }}>
                  {" "}
                  📐
                </span>
              </h3>
              <p style={{ color: "#374151", lineHeight: 1.9, margin: 0 }}>
                تطوير مواد إعلانية تشمل الأوراق المكتبية، المواد التسويقية،
                القوالب الرقمية وغيرها، حسب طبيعة المشروع.
              </p>
            </article>

            {/* 06 */}
            <article className="hb-step-card reveal reveal--up">
              <h3
                style={{
                  margin: "0 0 8px",
                  color: "#0f172a",
                  fontSize: 18,
                  fontWeight: 800,
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-start",
                }}
              >
                <span>٠٦ | التسليم وأبعاد المشروع</span>
                <span aria-hidden style={{ opacity: 0.6 }}>
                  {" "}
                  ✅
                </span>
              </h3>
              <p style={{ color: "#374151", lineHeight: 1.9, margin: 0 }}>
                تزويدك بجميع أصول العلامة التجارية وملف دليل الهوية، مع مناقشة
                أي قلق نهائي ومتابعة بعد المشروع لضمان الاستخدام الصحيح للهوية.
              </p>
            </article>
          </div>
        </section>
      </div>
      <PostsFeed pageKey="handbook" limit={6} showCover showExcerpt />
      <Footer />
    </>
  );
}

export default Handbook;
