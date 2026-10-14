"use client";
import Protected from "@/components/Protected";
import ItemList from "@/components/ItemList";
export default function Trash() {
  return <Protected><h1>Recently deleted</h1>
    <p className="muted">Items are kept for 30 days, then removed. Deleting here never touches the original video.</p>
    <h2>History</h2><ItemList table="video_history" trash />
    <h2>Saved videos</h2><ItemList table="saved_videos" trash /></Protected>;
}
