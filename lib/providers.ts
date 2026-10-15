import { safeFetch } from "./security";

export type Availability = "ready" | "detected_only" | "auth_required" | "unavailable";
export type AnalysisResult = {
  provider: string; status: Availability; message: string; originalUrl: string;
  title?: string; format?: string; sizeBytes?: number;
  playback?: { src: string; kind: "native" | "hls" };
  download?: { src: string; filename: string };
};
export interface ProviderAdapter {
  id: string; name: string; hosts: string[]; implemented: boolean;
  canHandle(url: URL): boolean;
  analyze(url: URL): Promise<AnalysisResult>;
}

const hostMatch = (hosts: string[]) => (u: URL) =>
  hosts.some((h) => u.hostname === h || u.hostname.endsWith("." + h));

/** Providers with no verified public API: honest detection only. */
const detectOnly = (id: string, name: string, hosts: string[]): ProviderAdapter => ({
  id, name, hosts, implemented: false, canHandle: hostMatch(hosts),
  async analyze(url) {
    return { provider: name, status: "detected_only", originalUrl: url.toString(),
      message: "Provider detected — direct playback not available. Open the original page to watch." };
  },
});

const VIDEO_EXT = /\.(mp4|webm|m3u8|mov|m4v|ogv|ogg|avi|mkv)(?:$)/i;
export const MAX_BYTES = 5 * 1024 ** 3;

function isVideoPath(url: URL) { return VIDEO_EXT.test(url.pathname); }

/**
 * Direct-media adapter. It probes by HEAD first, then uses a one-byte Range GET
 * because a number of legitimate file hosts do not implement HEAD correctly.
 * It never downloads the entire file during analysis.
 */
export const directProvider: ProviderAdapter = {
  id: "direct", name: "Direct video URL", hosts: [], implemented: true,
  // This is the fallback adapter. Known third-party providers are checked first.
  canHandle: () => true,
  async analyze(url) {
    const base = { provider: "Direct video URL", originalUrl: url.toString() };
    let res: Response;
    try {
      res = await safeFetch(url, { method: "HEAD" });
      if (!res.ok || res.status === 405 || res.status === 501) {
        try {
          res = await safeFetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
        } catch {
          // Preserve the HEAD response below so auth/expired errors remain useful.
        }
      }
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      return { ...base, status: "unavailable", message: m.startsWith("UNSAFE") ? "This address isn't allowed." : "Couldn't reach the link (timeout or network error)." };
    }

    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const rawLength = Number(res.headers.get("content-length"));
    const rangeTotal = res.headers.get("content-range")?.match(/\/([0-9]+)$/)?.[1];
    const len = (rangeTotal ? Number(rangeTotal) : rawLength) || undefined;
    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel().catch(() => undefined);
      return { ...base, status: "auth_required", message: "This file requires access or authorization. Sign in to the original service if needed." };
    }
    if (res.status === 404 || res.status === 410) {
      await res.body?.cancel().catch(() => undefined);
      return { ...base, status: "unavailable", message: "The link has expired or no longer exists." };
    }
    if (!res.ok && res.status !== 206) {
      await res.body?.cancel().catch(() => undefined);
      return { ...base, status: "unavailable", message: `The host could not provide the file (HTTP ${res.status}).` };
    }

    const isHls = /mpegurl/.test(type) || /\.m3u8$/i.test(url.pathname);
    const isVideo = !type.includes("text/html") && !type.includes("application/xhtml") && (type.startsWith("video/") || isVideoPath(url) || isHls);
    await res.body?.cancel().catch(() => undefined);
    if (!isVideo) {
      return { provider: "Web page or unsupported file", status: "detected_only", originalUrl: url.toString(),
        message: "This link leads to a webpage or an unsupported file, not a directly accessible video stream. This hosting service needs a compatible integration or an authorized direct video URL." };
    }
    if (len && len > MAX_BYTES) return { ...base, status: "unavailable", message: "File exceeds the 5 GB limit." };

    let filename = "video";
    try { filename = decodeURIComponent(url.pathname.split("/").pop() || "video").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_"); } catch { /* keep safe default */ }
    const playbackKind = isHls ? "hls" : "native";
    return { ...base, status: "ready", message: "A direct video source was detected. Playback depends on the host allowing streaming from this server/browser.", title: filename, format: isHls ? "HLS" : (type || "video file"), sizeBytes: len,
      playback: { src: url.toString(), kind: playbackKind },
      // HLS playlists are not a single downloadable video file.
      download: isHls ? undefined : { src: url.toString(), filename } };
  },
};

export const registry: ProviderAdapter[] = [
  detectOnly("terabox", "TeraBox", ["terabox.com", "teraboxapp.com", "1024terabox.com", "4funbox.com"]),
  detectOnly("diskwala", "Diskwala", ["diskwala.com"]),
  detectOnly("blinknote", "BlinkNote", ["blinknote.com"]),
  detectOnly("vividcast", "Vividcast", ["vividcast.com"]),
  directProvider,
];

export async function analyzeUrl(url: URL): Promise<AnalysisResult> {
  const adapter = registry.find((a) => a.canHandle(url));
  if (!adapter) return { provider: "Unknown", status: "detected_only", originalUrl: url.toString(), message: "Unsupported provider. You can still open the original page." };
  return adapter.analyze(url);
}
