"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Player from "./Player";
import { sb } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import type { AnalysisResult } from "@/lib/providers";

const fmt = (n?: number) => (n ? `${(n / 1048576).toFixed(1)} MB` : "unknown");
type Hist = { id: string; last_position_seconds: number | null };

async function recordHistory(r: AnalysisResult): Promise<Hist> {
  const s = sb();
  const base = { provider: r.provider, title: r.title ?? null, status: r.status, can_play: !!r.playback, can_download: !!r.download, last_watched_at: new Date().toISOString() };
  const found = await s.from("video_history").select("id,last_position_seconds").eq("source_url", r.originalUrl).is("deleted_at", null).maybeSingle();
  if (found.error) throw found.error;
  if (found.data) {
    const u = await s.from("video_history").update(base).eq("id", found.data.id);
    if (u.error) throw u.error;
    return found.data;
  }
  const ins = await s.from("video_history").insert({ source_url: r.originalUrl, ...base }).select("id,last_position_seconds").single();
  if (ins.error) throw ins.error;
  return ins.data;
}

export default function Analyzer() {
  const { user, ready } = useUser();
  const params = useSearchParams();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [r, setR] = useState<AnalysisResult | null>(null);
  const [hist, setHist] = useState<Hist | null>(null);
  const auto = useRef(false);

  async function run(u: string) {
    setBusy(true); setErr(null); setNote(null); setR(null); setHist(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: u }) });
      const j = await res.json();
      if (!j.ok) { setErr(j.error.message); return; }
      setR(j.data);
      if (user && j.data.status !== "unavailable") {
        try { setHist(await recordHistory(j.data)); } catch { setNote("Couldn't save this to your history. Try again later."); }
      } else if (!user) setNote("Sign in to save history and resume where you left off.");
    } catch { setErr("Network error. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    const p = params.get("url");
    if (p && ready && !auto.current) { auto.current = true; setUrl(p); run(p); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, params]);

  async function paste() { try { setUrl(await navigator.clipboard.readText()); } catch { setErr("Clipboard access was denied. Paste with Ctrl+V."); } }
  async function save() {
    if (!r) return;
    const { error } = await sb().from("saved_videos").upsert({ source_url: r.originalUrl, provider: r.provider, title: r.title ?? null, deleted_at: null }, { onConflict: "user_id,source_url" });
    setNote(error ? "Couldn't save this video." : "Saved to your library.");
  }
  function progress(pos: number, dur: number) {
    if (!hist) return;
    sb().from("video_history").update({ last_position_seconds: pos, duration_seconds: dur, last_watched_at: new Date().toISOString() }).eq("id", hist.id).then(({ error }) => { if (error) console.error("position_save_failed"); });
  }

  return (
    <section>
      <form onSubmit={(e) => { e.preventDefault(); run(url); }} className="row">
        <label htmlFor="u" className="sr">Video link</label>
        <input id="u" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/video.mp4" inputMode="url" />
        <button type="button" className="ghost" onClick={paste}>Paste link</button>
        <button disabled={busy}>{busy ? "Checking link…" : "Analyze video"}</button>
      </form>
      {err && <p role="alert" className="err">{err}</p>}
      {r && (
        <article className="card" aria-live="polite">
          <h2>{r.title ?? r.provider}</h2>
          <p className="muted">{r.provider} · {r.status.replace("_", " ")}{r.format ? ` · ${r.format}` : ""}{r.sizeBytes ? ` · ${fmt(r.sizeBytes)}` : ""}</p>
          <p>{r.message}</p>
          {r.playback && <Player src={r.playback.src} kind={r.playback.kind} start={hist?.last_position_seconds ?? 0} onProgress={progress} />}
          <div className="row">
            {r.download && <a className="btn" href={r.download.src} download={r.download.filename} target="_blank" rel="noopener noreferrer">Download video</a>}
            <a className="btn ghost" href={r.originalUrl} target="_blank" rel="noopener noreferrer">Open original page</a>
            {user ? <button className="ghost" onClick={save}>Save to library</button> : <Link className="btn ghost" href="/login">Sign in to save</Link>}
          </div>
        </article>
      )}
      {note && <p className="muted" role="status">{note}</p>}
    </section>
  );
}
