import { NextResponse } from "next/server";
import { admin } from "@/lib/admin";
import { tooMany } from "@/lib/ratelimit";
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (tooMany(`ua:${ip}`, 30)) return NextResponse.json({ available: false }, { status: 429 });
  const u = new URL(req.url).searchParams.get("u")?.toLowerCase() ?? "";
  if (!/^[a-z0-9_]{3,24}$/.test(u)) return NextResponse.json({ available: false });
  try {
    const { data, error } = await admin().from("profiles").select("id").eq("username", u).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ available: !data });
  } catch (e) { console.error("username_check_failed", e instanceof Error ? e.message : "unknown"); return NextResponse.json({ available: false }, { status: 500 }); }
}
