import Header from "../components/Header";
import Main from "../components/Main";
import Footer from "../components/Footer";
import "../App.css";

// import PostsFeed from "./posts/PostsFeed";

export default function Home() {
  return (
    <>
      <Header />
      <Main />
      {/* <PostsFeed pageKey="home" showCover showExcerpt /> */}
      <Footer />
    </>
  );
}