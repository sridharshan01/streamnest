"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Protected from "@/components/Protected";
import Analyzer from "@/components/Analyzer";
import ItemList from "@/components/ItemList";
import { sb } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

function Counts() {
  const [c, setC] = useState<{ h: number; s: number; t: number } | null>(null);
  useEffect(() => {
    const n = (tb: string, trash: boolean) => { const q = sb().from(tb).select("id", { count: "exact", head: true }); return (trash ? q.not("deleted_at", "is", null) : q.is("deleted_at", null)).then((r) => r.count ?? 0); };
    Promise.all([n("video_history", false), n("saved_videos", false), n("video_history", true)]).then(([h, s, t]) => setC({ h, s, t }));
  }, []);
  if (!c) return null;
  return <p className="muted"><Link href="/history">{c.h} in history</Link> · <Link href="/saved">{c.s} saved</Link> · <Link href="/trash">{c.t} in trash</Link></p>;
}

function Body() {
  const { user } = useUser();
  return (<>
    <h1>Welcome, {(user?.user_metadata?.username as string) ?? "there"}</h1>
    <Suspense fallback={null}><Analyzer /></Suspense>
    <Counts />
    <h2>Recently watched</h2>
    <ItemList table="video_history" recent={4} />
    <p><Link href="/recent">See all recently watched</Link></p>
  </>);
}
export default function Dashboard() { return <Protected><Body /></Protected>; }
