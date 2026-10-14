import { Suspense } from "react";
import Analyzer from "@/components/Analyzer";
import { registry } from "@/lib/providers";
export default function Home() {
  return (<>
    <h1>One link. One place. Your video.</h1>
    <p className="lead">Paste a video link and StreamNest tells you what can be played or downloaded, and what can't.</p>
    <Suspense fallback={null}><Analyzer /></Suspense>
    <h2>Supported platforms</h2>
    <ul className="plat">{registry.map((p) => <li key={p.id}><b>{p.name}</b> {p.implemented ? "Playback and download" : "Detection only"}</li>)}</ul>
  </>);
}
