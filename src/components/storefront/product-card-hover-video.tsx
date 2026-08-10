"use client";

import { useRef } from "react";

export function ProductCardHoverVideo({ src, poster }: { src: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <span
      className="absolute inset-0"
      onMouseEnter={() => { if (videoRef.current) void videoRef.current.play().catch(() => undefined); }}
      onMouseLeave={() => {
        if (!videoRef.current) return;
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }}
    >
      <video ref={videoRef} src={src} muted loop playsInline preload="metadata" poster={poster} className="h-full w-full object-cover opacity-0 transition-all duration-500 group-hover:scale-[1.025] group-hover:opacity-100" />
    </span>
  );
}
