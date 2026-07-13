const hits = new Map<string, number>();
const WINDOW_MS = 60_000;

/** Basic in-memory throttle — good enough to blunt naive form spam. */
export function isRateLimited(key: string) {
  const now = Date.now();
  const last = hits.get(key);

  if (last && now - last < WINDOW_MS) {
    return true;
  }

  hits.set(key, now);
  if (hits.size > 5000) {
    const cutoff = now - WINDOW_MS;
    for (const [k, t] of hits) {
      if (t < cutoff) hits.delete(k);
    }
  }
  return false;
}
