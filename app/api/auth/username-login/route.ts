import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { admin } from "@/lib/admin";
import { tooMany } from "@/lib/ratelimit";

const bad = () => NextResponse.json({ ok: false, message: "Wrong username or password." }, { status: 401 });
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (tooMany(`ul:${ip}`, 8)) return NextResponse.json({ ok: false }, { status: 429 });
  const p = z.object({ username: z.string().min(3).max(24), password: z.string().min(1).max(200) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return bad();
  try {
    const a = admin();
    const { data: prof } = await a.from("profiles").select("id").eq("username", p.data.username.toLowerCase()).maybeSingle();
    if (!prof) return bad();
    const { data: u } = await a.auth.admin.getUserById(prof.id);
    if (!u.user?.email) return bad();
    // The email stays on the server; only session tokens go back to the browser.
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data, error } = await anon.auth.signInWithPassword({ email: u.user.email, password: p.data.password });
    if (error || !data.session) return bad();
    return NextResponse.json({ ok: true, access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch (e) { console.error("username_login_failed", e instanceof Error ? e.message : "unknown"); return NextResponse.json({ ok: false, message: "Sign-in is unavailable right now." }, { status: 500 }); }
}
