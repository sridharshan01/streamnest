import { NextResponse } from "next/server";
import { parseUrl, safeFetch } from "@/lib/security";
import { MAX_BYTES } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFilename(raw: string) {
  const clean = raw.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim().slice(0, 180);
  return clean || "video";
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const checked = parseUrl(params.get("url") ?? "");
  if (!checked.ok) return NextResponse.json({ error: checked.message }, { status: 400 });

  try {
    const upstream = await safeFetch(checked.url, { method: "GET" }, 3, 10 * 60 * 1000);
    if (!upstream.ok && upstream.status !== 206) {
      await upstream.body?.cancel().catch(() => undefined);
      return NextResponse.json({ error: `The host could not provide this file (HTTP ${upstream.status}).` }, { status: 502 });
    }
    const type = (upstream.headers.get("content-type") ?? "application/octet-stream").split(";")[0].trim().toLowerCase();
    const pathLooksVideo = /\.(mp4|webm|mov|m4v|ogv|ogg|avi|mkv)$/i.test(checked.url.pathname);
    if (!(type.startsWith("video/") || pathLooksVideo) || /mpegurl/.test(type) || /\.m3u8$/i.test(checked.url.pathname)) {
      await upstream.body?.cancel().catch(() => undefined);
      return NextResponse.json({ error: "This source is not a directly downloadable video file." }, { status: 415 });
    }
    const size = Number(upstream.headers.get("content-length"));
    if (Number.isFinite(size) && size > MAX_BYTES) {
      await upstream.body?.cancel().catch(() => undefined);
      return NextResponse.json({ error: "The file exceeds the 5 GB download limit." }, { status: 413 });
    }
    if (!upstream.body) return NextResponse.json({ error: "The host returned an empty file." }, { status: 502 });

    const filename = safeFilename(params.get("filename") || checked.url.pathname.split("/").pop() || "video");
    let sent = 0;
    const limitedBody = upstream.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        sent += chunk.byteLength;
        if (sent > MAX_BYTES) {
          controller.error(new Error("Download exceeds maximum size"));
          return;
        }
        controller.enqueue(chunk);
      },
    }));
    return new Response(limitedBody, { status: 200, headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(Number.isFinite(size) && size > 0 ? { "Content-Length": String(size) } : {}),
    } });
  } catch (e) {
    console.error("download_failed", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Download failed. The link may have expired, require authorization, or block access." }, { status: 502 });
  }
}
