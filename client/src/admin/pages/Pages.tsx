import { useEffect, useState } from "react";
import { api } from "../auth/api";

type Page = { id: string; slug: string; title: string; updatedAt: string };
type Post = { id: string; title: string; createdAt: string };

export default function Pages() {
  const [list, setList] = useState<Page[]>([]);
  const [postsByPage, setPostsByPage] = useState<Record<string, Post[]>>({});
  const [expandedPages, setExpandedPages] = useState<string[]>([]); // Açılmış sayfa ID'leri
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = () =>
    api.get("/admin/pages").then(({ data }) => setList(data.items || []));

  const create = async () => {
    await api.post("/admin/pages", { title, slug, body: "# Yeni sayfa" });
    setTitle("");
    setSlug("");
    load();
  };

  const toggleExpand = async (pageId: string) => {
    if (expandedPages.includes(pageId)) {
      setExpandedPages(expandedPages.filter((id) => id !== pageId));
    } else {
      setExpandedPages([...expandedPages, pageId]);

      // Eğer bu sayfanın postları daha önce çekilmemişse, getir
      if (!postsByPage[pageId]) {
        const { data } = await api.get(`/admin/pages/${pageId}/posts`);
        setPostsByPage((prev) => ({ ...prev, [pageId]: data.items || [] }));
      }
    }
  };

  return (
    <>
      <h2>Sayfalar</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr auto",
          gap: 8,
          maxWidth: 720,
        }}
      >
        <input
          className="admin-input"
          placeholder="Başlık"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="admin-input"
          placeholder="Slug (ornek)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <button className="admin-btn" onClick={create}>
          Ekle
        </button>
      </div>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Başlık</th>
              <th>Slug</th>
              <th>Güncel.</th>
              <th>Postlar</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <>
                <tr key={p.id}>
                  <td className="td-ellipsis">{p.title}</td>
                  <td>/{p.slug}</td>
                  <td>{new Date(p.updatedAt).toLocaleString()}</td>
                  <td>
                    <button
                      className="row-btn"
                      onClick={() => toggleExpand(p.id)}
                    >
                      {expandedPages.includes(p.id) ? "Gizle" : "Göster"}
                    </button>
                  </td>
                </tr>

                {/* Postlar satırı */}
                {expandedPages.includes(p.id) && (
                  <tr>
                    <td colSpan={4}>
                      {postsByPage[p.id] && postsByPage[p.id].length > 0 ? (
                        <ul style={{ marginTop: 6 }}>
                          {postsByPage[p.id].map((post) => (
                            <li key={post.id}>
                              <strong>{post.title}</strong> –{" "}
                              {new Date(post.createdAt).toLocaleString()}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <em>Post yok</em>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
