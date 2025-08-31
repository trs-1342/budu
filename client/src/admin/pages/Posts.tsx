import { useEffect, useState } from "react";
import { api } from "../auth/api";

type Post = {
  id: string;
  title: string;
  status: "draft" | "published";
  updatedAt: string;
};

export default function Posts() {
  const [list, setList] = useState<Post[]>([]);
  const [title, setTitle] = useState("");

  const load = () =>
    api.get("/admin/posts").then(({ data }) => setList(data.items || []));
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    await api.post("/admin/posts", { title });
    setTitle("");
    load();
  };

  return (
    <>
      <h2>Postlar</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 8,
          maxWidth: 520,
        }}
      >
        <input
          className="admin-input"
          placeholder="Yeni post başlığı"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="admin-btn" onClick={create}>
          Oluştur
        </button>
      </div>
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Başlık</th>
              <th>Durum</th>
              <th>Güncel.</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td className="td-ellipsis">{p.title}</td>
                <td>{p.status}</td>
                <td>{new Date(p.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
