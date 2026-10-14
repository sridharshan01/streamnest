import { NextResponse } from "next/server";
import { z } from "zod";
import { parseUrl } from "@/lib/security";
import { analyzeUrl } from "@/lib/providers";

const hits = new Map<string, number[]>();
function limited(ip: string) { // in-memory limiter; use Redis/Upstash for multi-instance deploys
  const now = Date.now(); const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now); hits.set(ip, arr); return arr.length > 20;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (limited(ip)) return NextResponse.json({ ok: false, error: { code: "RATE_LIMITED", message: "Too many requests. Try again in a minute." } }, { status: 429 });
  const body = await req.json().catch(() => null);
  const parsed = z.object({ url: z.string() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Invalid request." } }, { status: 400 });
  const check = parseUrl(parsed.data.url);
  if (!check.ok) return NextResponse.json({ ok: false, error: { code: check.code, message: check.message } }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, data: await analyzeUrl(check.url) });
  } catch (e) {
    console.error("analyze_failed", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ ok: false, error: { code: "INTERNAL", message: "Something went wrong analyzing this link." } }, { status: 500 });
  }
}
