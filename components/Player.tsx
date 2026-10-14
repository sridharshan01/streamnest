"use client";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

type Props = { src: string; kind: "native" | "hls"; start?: number; onProgress?: (pos: number, dur: number) => void };

export default function Player({ src, kind, start = 0, onProgress }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const cb = useRef(onProgress); cb.current = onProgress;
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    const v = ref.current; if (!v) return;
    setError(null);
    let hls: Hls | null = null; let last = 0;
    const report = () => { if (v.duration) cb.current?.(Math.floor(v.currentTime), Math.floor(v.duration)); };
    const onTime = () => { if (Date.now() - last > 10_000) { last = Date.now(); report(); } };
    const onMeta = () => { if (start > 0 && v.duration && start < v.duration - 5) v.currentTime = start; };
    v.addEventListener("timeupdate", onTime); v.addEventListener("pause", report);
    v.addEventListener("ended", report); v.addEventListener("loadedmetadata", onMeta);
    if (kind === "hls" && Hls.isSupported()) {
      hls = new Hls();
      hls.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) setError("Stream failed to load (it may have expired or block cross-site playback)."); });
      hls.loadSource(src); hls.attachMedia(v);
    } else v.src = src;
    return () => {
      v.removeEventListener("timeupdate", onTime); v.removeEventListener("pause", report);
      v.removeEventListener("ended", report); v.removeEventListener("loadedmetadata", onMeta);
      hls?.destroy(); v.removeAttribute("src"); v.load();
    };
  }, [src, kind, start, tries]);

  return (
    <div>
      <video ref={ref} controls playsInline preload="metadata" className="player"
        onError={() => setError("This file can't be played here (unsupported codec, expired link or the host blocks embedding).")} />
      {error && <p role="alert" className="err">{error} <button onClick={() => setTries((t) => t + 1)}>Retry</button></p>}
    </div>
  );
}
