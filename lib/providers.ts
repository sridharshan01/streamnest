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

const VIDEO_EXT = /\.(mp4|webm|m3u8|mov|m4v)$/i;
export const MAX_BYTES = 5 * 1024 ** 3;

export const directProvider: ProviderAdapter = {
  id: "direct", name: "Direct video URL", hosts: [], implemented: true,
  canHandle: (u) => VIDEO_EXT.test(u.pathname),
  async analyze(url) {
    const base = { provider: "Direct video URL", originalUrl: url.toString() };
    let res: Response;
    try { res = await safeFetch(url, { method: "HEAD" }); }
    catch (e) {
      const m = e instanceof Error ? e.message : "";
      return { ...base, status: "unavailable", message: m.startsWith("UNSAFE") ? "This address isn't allowed." : "Couldn't reach the link (timeout or network error)." };
    }
    if (res.status === 401 || res.status === 403) return { ...base, status: "auth_required", message: "This file needs authorization. Open the original link instead." };
    if (res.status === 404 || res.status === 410) return { ...base, status: "unavailable", message: "The link has expired or no longer exists." };
    if (!res.ok) return { ...base, status: "unavailable", message: `The host answered with status ${res.status}.` };
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const len = Number(res.headers.get("content-length")) || undefined;
    const isHls = /mpegurl/.test(type) || /\.m3u8$/i.test(url.pathname);
    if (!isHls && !type.startsWith("video/")) return { ...base, status: "unavailable", message: `Not a video file (content type: ${type || "unknown"}).` };
    if (len && len > MAX_BYTES) return { ...base, status: "unavailable", message: "File exceeds the size limit." };
    const filename = decodeURIComponent(url.pathname.split("/").pop() || "video");
    return { ...base, status: "ready", message: "Ready to play.", title: filename, format: isHls ? "HLS" : type, sizeBytes: len,
      playback: { src: url.toString(), kind: isHls ? "hls" : "native" },
      // HLS playlists are not a single downloadable file.
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
