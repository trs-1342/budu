import Header from "../components/Header";
import Main from "../components/Main";
import Footer from "../components/Footer";
import "../App.css";

import PostsFeed from "./posts/PostsFeed";

export default function Home() {
  return (
    <>
      <Header />
      <Main />
      <PostsFeed pageKey="home" showCover showExcerpt />
      <Footer />
    </>
  );
}

// export default function Home() {
//   return (
//     <>
//       <section className="hero reveal" data-reveal>
//         <div className="container">
//           <h1 className="hero-title">Merhaba 👋</h1>
//           <p className="hero-sub">Layout + Reveal artık stabil.</p>
//         </div>
//       </section>

//       <section className="container" data-reveal-group>
//         <div className="card reveal">
//           <h3>Başlık 1</h3>
//           <p>Scroll ettikçe görünür.</p>
//         </div>
//         <div className="card reveal">
//           <h3>Başlık 2</h3>
//           <p>
//             Stagger için <code>--i</code> değişkeni.
//           </p>
//         </div>
//         <div className="card reveal">
//           <h3>Başlık 3</h3>
//           <p>Route değişiminde hook yeniden bağlanır.</p>
//         </div>
//       </section>
//     </>
//   );
// }
