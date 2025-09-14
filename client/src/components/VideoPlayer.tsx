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
    const video = videoRef.current!;
    // İndirmeyi zorlaştırma: sağ tık ve bazı kısayolları engelle
    const blockContext = (e: Event) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (["s", "p", "u", "c", "x", "i", "j"].includes(k)) e.preventDefault();
      }
    };
    const blockDrag = (e: DragEvent) => e.preventDefault();

    document.addEventListener("contextmenu", blockContext, { capture: true });
    document.addEventListener("keydown", blockKeys, { capture: true });
    video.addEventListener("contextmenu", blockContext);
    video.addEventListener("dragstart", blockDrag);

    // PiP ve Remote Playback kapat
    // @ts-ignore
    if ("disablePictureInPicture" in video)
      video.disablePictureInPicture = true;
    // @ts-ignore
    if ("disableRemotePlayback" in video) video.disableRemotePlayback = true;

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 20,
        maxMaxBufferLength: 60,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else {
      console.warn("HLS not supported");
    }

    return () => {
      document.removeEventListener("contextmenu", blockContext, {
        capture: true,
      } as any);
      document.removeEventListener("keydown", blockKeys, {
        capture: true,
      } as any);
      video.removeEventListener("contextmenu", blockContext);
      video.removeEventListener("dragstart", blockDrag);
      hlsRef.current?.destroy();
    };
  }, [src]);

  return (
    <div className={`video-shell no-context ${className || ""}`}>
      <video
        ref={videoRef}
        controls
        playsInline
        controlsList="nodownload noplaybackrate"
        preload="metadata"
        poster={poster}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
