import { useEffect, useRef } from "react";
import Hls from "hls.js";

type Props = {
  src: string;
  poster?: string;
  className?: string;
};

export default function VideoPlayer({ src, poster, className }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Önceki kaynak/HLS temizliği
    hlsRef.current?.destroy();
    hlsRef.current = null;
    video.removeAttribute("src");
    video.load();

    const isHls = /\.m3u8($|\?)/i.test(src);

    // Yalnız video üzerinde basit koruma
    const blockContext = (e: Event) => e.preventDefault();
    const blockDrag = (e: DragEvent) => e.preventDefault();
    video.addEventListener("contextmenu", blockContext);
    video.addEventListener("dragstart", blockDrag);

    // PiP / Remote Playback kapat (destekleyenlerde)
    (video as any).disablePictureInPicture = true;
    (video as any).disableRemotePlayback = true;

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          lowLatencyMode: true,
          maxBufferLength: 20,
          maxMaxBufferLength: 60,
        });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        video.src = src;
        video.load();
      } else {
        console.warn("HLS bu tarayıcıda desteklenmiyor.");
      }
    } else {
      // MP4/WEBM gibi progressive kaynak
      video.src = src;
      video.load();
    }

    return () => {
      video.removeEventListener("contextmenu", blockContext);
      video.removeEventListener("dragstart", blockDrag);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src]);

  return (
    <div className={`video-shell ${className || ""}`}>
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        poster={poster}
        crossOrigin="anonymous"
        controlsList="nodownload noplaybackrate"
        onContextMenu={(e) => e.preventDefault()}
        style={{ width: "100%" }}
      />
    </div>
  );
}
