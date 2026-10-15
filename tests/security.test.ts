import { describe, it, expect } from "vitest";
import { parseUrl, isPrivateIp } from "../lib/security";
import { registry } from "../lib/providers";
describe("url validation", () => {
  it.each(["javascript:alert(1)", "file:///etc/passwd", "http://localhost/a.mp4", "http://127.0.0.1/a", "http://169.254.169.254/", "http://[::1]/x", "", "nonsense"])("rejects %s", (u) => expect(parseUrl(u).ok).toBe(false));
  it("accepts https and keeps query", () => { const r = parseUrl("https://a.com/v.mp4?token=1#x"); expect(r.ok && r.url.search).toBe("?token=1"); });
  it("flags private ips", () => { expect(isPrivateIp("10.0.0.1")).toBe(true); expect(isPrivateIp("8.8.8.8")).toBe(false); });
});
describe("provider detection", () => {
  const find = (u: string) => registry.find((p) => p.canHandle(new URL(u)))?.id;
  it("detects known providers and falls back to direct-link analysis", () => { expect(find("https://www.terabox.com/s/1abc")).toBe("terabox"); expect(find("https://x.com/a.mp4")).toBe("direct"); expect(find("https://x.com/page")).toBe("direct"); });
});
