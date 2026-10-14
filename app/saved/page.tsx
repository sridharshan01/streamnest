"use client";
import Protected from "@/components/Protected";
import ItemList from "@/components/ItemList";
export default function Page() { return <Protected><h1>Saved videos</h1><ItemList table="saved_videos" /></Protected>; }
