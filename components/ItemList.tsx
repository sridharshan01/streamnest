"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";

type Row = { id: string; source_url: string; provider: string; title: string | null; last_position_seconds?: number | null; last_watched_at?: string; created_at?: string; deleted_at: string | null };
type Props = { table: "video_history" | "saved_videos"; trash?: boolean; recent?: number };
const PROVIDERS = ["TeraBox", "Diskwala", "BlinkNote", "Vividcast", "Direct video URL", "Unknown"];
const PAGE = 20;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function ItemList({ table, trash = false, recent }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState(""); const [q, setQ] = useState("");
  const [prov, setProv] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const sortCol = trash ? "deleted_at" : table === "video_history" ? "last_watched_at" : "created_at";

  useEffect(() => { const t = setTimeout(() => { setQ(search); setPages(1); }, 300); return () => clearTimeout(t); }, [search]);

  useEffect(() => {
    let off = false; setLoading(true);
    let qb = sb().from(table).select("*").order(sortCol, { ascending: false }).range(0, (recent ?? pages * PAGE) - 1);
    qb = trash ? qb.not("deleted_at", "is", null) : qb.is("deleted_at", null);
    const s = q.replace(/[%,()]/g, "");
    if (s) qb = qb.or(`title.ilike.%${s}%,source_url.ilike.%${s}%`);
    if (prov) qb = qb.eq("provider", prov);
    qb.then(({ data, error }) => { if (off) return; if (error) setErr("Couldn't load your list. Try again."); else { setErr(null); setRows(data as Row[]); } setLoading(false); });
    return () => { off = true; };
  }, [table, trash, recent, pages, q, prov, tick, sortCol]);

  const run = useCallback(async (p: PromiseLike<{ error: unknown }>) => { const { error } = await p; if (error) setErr("That action failed. Try again."); else setTick((t) => t + 1); }, []);
  const t = () => sb().from(table);
  const now = () => new Date().toISOString();

  return (
    <div>
      {!recent && (
        <div className="row">
          <label className="sr" htmlFor={`s-${table}-${trash}`}>Search</label>
          <input id={`s-${table}-${trash}`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or link" />
          <select aria-label="Provider" value={prov} onChange={(e) => { setProv(e.target.value); setPages(1); }}>
            <option value="">All providers</option>{PROVIDERS.map((p) => <option key={p}>{p}</option>)}
          </select>
          {!trash && table === "video_history" && rows.length > 0 && <button className="ghost" onClick={() => confirm("Move all history to trash?") && run(t().update({ deleted_at: now() }).is("deleted_at", null))}>Clear history</button>}
          {trash && rows.length > 0 && <button className="ghost" onClick={() => confirm("Permanently delete everything in trash? This can't be undone.") && run(t().delete().not("deleted_at", "is", null))}>Empty trash</button>}
        </div>
      )}
      {err && <p role="alert" className="err">{err}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && rows.length === 0 && <p className="muted">{trash ? "Trash is empty. Deleted items are kept for 30 days." : q || prov ? "Nothing matches your filters." : "Nothing here yet. Paste a video link on the dashboard to get started."}</p>}
      <ul className="items">
        {rows.map((r) => (
          <li key={r.id} className="card">
            <b>{r.title ?? r.source_url}</b>
            <span className="muted">{r.provider} · {new Date((trash ? r.deleted_at : r.last_watched_at ?? r.created_at) ?? "").toLocaleString()}{r.last_position_seconds ? ` · resume at ${mmss(r.last_position_seconds)}` : ""}</span>
            <div className="row">
              {!trash && <Link className="btn" href={`/dashboard?url=${encodeURIComponent(r.source_url)}`}>{r.last_position_seconds ? "Resume" : "Open"}</Link>}
              {!trash && <a className="btn ghost" href={r.source_url} target="_blank" rel="noopener noreferrer">Original link</a>}
              {!trash && <button className="ghost" onClick={() => run(t().update({ deleted_at: now() }).eq("id", r.id))}>Delete</button>}
              {trash && <button onClick={() => run(t().update({ deleted_at: null }).eq("id", r.id))}>Restore</button>}
              {trash && <button className="ghost" onClick={() => confirm("Delete permanently? This can't be undone.") && run(t().delete().eq("id", r.id))}>Delete forever</button>}
            </div>
          </li>
        ))}
      </ul>
      {!recent && rows.length >= pages * PAGE && <button className="ghost" onClick={() => setPages((p) => p + 1)}>Load more</button>}
    </div>
  );
}
