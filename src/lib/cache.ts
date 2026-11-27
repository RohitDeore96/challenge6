/**
 * Minimal in-memory TTL cache for provider responses.
 *
 * Purpose: keep API calls low (efficiency dimension) and keep repeated
 * assistant requests for the same area from re-fetching the same forecast.
 *
 * NOTE: On Vercel serverless functions this cache is per-instance and
 * best-effort. It is NOT a distributed or durable cache, and it resets on
 * cold starts. No personal data is ever stored here (only keyed by rounded
 * coordinates), see docs/DATA_METHODOLOGY.md.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  storedAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** Round coordinates to ~1.1 km grid cells for cache key stability. */
export function gridKey(lat: number, lon: number, prefix: string): string {
  const rLat = Math.round(lat * 100) / 100;
  const rLon = Math.round(lon * 100) / 100;
  return `${prefix}:${rLat}:${rLon}`;
}

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(
  key: string,
  value: T,
  ttlMs: number,
  maxEntries = 200
): void {
  // Simple size guard so a long-lived instance cannot grow unbounded.
  if (store.size >= maxEntries) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs, storedAt: Date.now() });
}

export function cacheClear(): void {
  store.clear();
}

/** Test helper: age of the entry in ms, undefined when absent/expired. */
export function cacheAge(key: string): number | undefined {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.expiresAt) return undefined;
  return Date.now() - entry.storedAt;
}
