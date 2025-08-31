import { useEffect, useState } from "react";

type Post = {
  id: number;
  title: string;
  body_md: string;
  created_at: string;
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:1002/api/public/pages/anasayfa?locale=tr")
      .then((res) => res.json())
      .then((data) => {
        setPosts(data.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Anasayfa</h1>
      {posts.map((post) => (
        <div key={post.id} style={{ marginBottom: "2rem" }}>
          <h2>{post.title}</h2>
          <div
            dangerouslySetInnerHTML={{
              __html: post.body_md.replace(/\n/g, "<br />"),
            }}
          />
          <small>{new Date(post.created_at).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}
