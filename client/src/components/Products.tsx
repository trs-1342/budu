// import React from "react";
import "../css/Products.css";

import product1 from "../assets/image1.png";
import product2 from "../assets/image2.png";

type Product = {
  id: string;
  title: string;
  description: string;
  image: string;
  href: string;
};

const products: Product[] = [
  {
    id: "design-book",
    title: "كتاب يتكون من طرق تقنية في اتخاذ قرارات التصميم",
    description:
      "كتاب إلكتروني تم إعداده لمساعدتك على رفع مستوى احترافيتك في التصميم.",
    image: product1,
    href: "/products/design-book",
  },
  {
    id: "identity-course",
    title: "دورة تصميم وبناء الهوية البصرية",
    description: "دورة تفاعلية تركز على تمكين المستقلين في تصميم الهوية.",
    image: product2,
    href: "/products/identity-course",
  },
];

export default function Products() {
  return (
    <section className="products-section" aria-labelledby="products-heading">
      {/* Sol üst buton */}
      <div className="products-topbar">
        <a className="products-all-btn" href="/my-products">
          تصفح جميع منتجاتي
        </a>
      </div>

      {/* Başlık */}
      <header className="products-header">
        <h1 id="products-heading" className="products-title">
          بقلمي
        </h1>
        <p className="products-subtitle">
          منتجات وملفات لمساعدتك في رحلتك التصميمية
        </p>
      </header>

      {/* Kart grid */}
      <div
        className="products-grid"
        data-reveal-group
        style={{ "--reveal-stagger": "90ms" } as React.CSSProperties}
      >
        {products.map((p) => (
          <article className="product-card reveal reveal--up" key={p.id}>
            <a href={p.href} className="product-media" aria-label={p.title}>
              <img src={p.image} alt={p.title} loading="lazy" />
            </a>

            <div className="product-content">
              <h3 className="product-name">
                <a href={p.href} className="product-name-link">
                  {p.title}
                </a>
              </h3>

              <p className="product-desc">{p.description}</p>

              <div className="product-actions">
                <a className="product-link" href={p.href}>
                  <span className="product-link-icon" aria-hidden="true">
                    ↗
                  </span>
                  تفاصيل المنتج
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
