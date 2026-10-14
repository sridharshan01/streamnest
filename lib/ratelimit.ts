const hits = new Map<string, number[]>();
export function tooMany(key: string, max: number, windowMs = 60_000) {
  const now = Date.now(); const a = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  a.push(now); hits.set(key, a); return a.length > max;
}
