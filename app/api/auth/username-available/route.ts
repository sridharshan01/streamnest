import { NextResponse } from "next/server";
import { admin } from "@/lib/admin";
import { tooMany } from "@/lib/ratelimit";

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (tooMany(`ua:${ip}`, 30)) return NextResponse.json({ available: false, code: "RATE_LIMITED", message: "Too many checks. Wait a minute and try again." }, { status: 429 });
  const u = (new URL(req.url).searchParams.get("u") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(u)) return NextResponse.json({ available: false, code: "INVALID_USERNAME", message: "Username must be 3–24 letters, numbers, or underscores." }, { status: 400 });
  try {
    const { data, error } = await admin().from("profiles").select("id").eq("username", u).maybeSingle();
    if (error) {
      console.error("username_check_failed", error.code ?? error.message);
      return NextResponse.json({ available: false, code: "DATABASE_ERROR", message: "Username availability could not be checked. Verify the Supabase configuration and migrations, then try again." }, { status: 503 });
    }
    return NextResponse.json({ available: !data });
  } catch (e) {
    console.error("username_check_unavailable", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ available: false, code: "SERVER_CONFIG", message: "Username checking is temporarily unavailable. Check the server environment variables and try again." }, { status: 503 });
  }
}
