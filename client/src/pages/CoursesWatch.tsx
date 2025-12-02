import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { getAccess, API_BASE } from "../lib/api";

const API_URL = API_BASE;

export default function CoursesWatch() {
  const { id } = useParams<{ id: string }>();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // watermark için:
  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    async function fetchVideoLink() {
      try {
        const token = getAccess();
        if (!token) {
          setError("Videoyu izlemek için giriş yapmalısın.");
          return;
        }

        const res = await axios.get(`${API_URL}/api/courses/video-link/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        });

        // backend: { videoPath: "/api/courses/video-stream/:id?vt=..." }
        const fullUrl = `${API_URL}${res.data.videoPath}`;
        setVideoSrc(fullUrl);
      } catch (err: any) {
        console.error("fetchVideoLink error", err);
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Video linki alınamadı.";
        setError(msg);
      }
    }

    if (id) {
      fetchVideoLink();
    }
  }, [id]);

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (!videoSrc) {
    return <div className="p-4">Video hazırlanıyor...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="relative">
        <video className="w-full rounded-lg" controls src={videoSrc} />
        {/* Watermark overlay */}
        {user && (
          <div className="absolute bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded">
            {user.username} • {user.email}
          </div>
        )}
      </div>
    </div>
  );
}
