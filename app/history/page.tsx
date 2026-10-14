"use client";
import Protected from "@/components/Protected";
import ItemList from "@/components/ItemList";
export default function Page() { return <Protected><h1>Watch history</h1><ItemList table="video_history" /></Protected>; }
