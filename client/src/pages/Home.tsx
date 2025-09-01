// src/pages/Home.tsx
import Header from "../components/Header";
import Main from "../components/Main";
import Products from "../components/Products";
import Projects from "../components/Projects";
import Footer from "../components/Footer";
import Services from "../components/Services";
import "../App.css";

import PostsFeed from "./posts/PostsFeed";

export default function Home() {
  return (
    <>
      <Header />
      <Main />
      <Products />
      <Projects />
      <Services />
      <PostsFeed pageKey="home" limit={6} showCover showExcerpt />
      <Footer />
    </>
  );
}
