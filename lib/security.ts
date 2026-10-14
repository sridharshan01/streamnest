import { lookup } from "dns/promises";
import net from "net";

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const l = ip.toLowerCase();
  if (l.startsWith("::ffff:")) return isPrivateIp(l.slice(7));
  return l === "::1" || l === "::" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80");
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; code: "EMPTY" | "INVALID" | "UNSAFE"; message: string };

export function parseUrl(raw: string): UrlCheck {
  const s = (raw ?? "").trim();
  if (!s) return { ok: false, code: "EMPTY", message: "Paste a video link first." };
  if (s.length > 2048) return { ok: false, code: "INVALID", message: "That link is too long." };
  let url: URL;
  try { url = new URL(s); } catch { return { ok: false, code: "INVALID", message: "That doesn't look like a valid link." }; }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    return { ok: false, code: "UNSAFE", message: "Only http and https links are allowed." };
  const h = url.hostname.toLowerCase();
  if (url.username || url.password || h === "localhost" || h.endsWith(".local") || h.endsWith(".internal"))
    return { ok: false, code: "UNSAFE", message: "This address isn't allowed." };
  if ((net.isIP(h.replace(/^\[|\]$/g, "")) !== 0) && isPrivateIp(h.replace(/^\[|\]$/g, "")))
    return { ok: false, code: "UNSAFE", message: "Private network addresses aren't allowed." };
  url.hash = "";
  return { ok: true, url };
}

export async function assertPublicHost(url: URL): Promise<void> {
  const addrs = await lookup(url.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("UNSAFE_HOST");
}

/** Fetch with manual redirects; each hop is re-validated (SSRF-safe), with timeout. */
export async function safeFetch(start: URL, init: RequestInit = {}, maxHops = 3): Promise<Response> {
  let url = start;
  for (let i = 0; i <= maxHops; i++) {
    await assertPublicHost(url);
    const res = await fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(8000) });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      const next = parseUrl(new URL(res.headers.get("location")!, url).toString());
      if (!next.ok) throw new Error("UNSAFE_REDIRECT");
      url = next.url; continue;
    }
    return res;
  }
  throw new Error("TOO_MANY_REDIRECTS");
}
