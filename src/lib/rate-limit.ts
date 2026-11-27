/**
 * Best-effort per-IP request throttling for the API routes.
 *
 * Implementation: fixed-window counter in a module-level Map. On Vercel
 * serverless this is per-instance and resets on cold starts, so it is a
 * politeness guard, not a distributed rate-limit guarantee. That limitation
 * is documented in the README and in docs/DATA_METHODOLOGY.md.
 */

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 30;
const ASSISTANT_LIMIT = 12;

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_IPS = 5_000;

function clientIp(req: Request): string {
  // Standard proxy headers (Vercel sets x-forwarded-for). Fall back to a
  // shared bucket when no header is present (local/dev).
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 60);
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim().slice(0, 60);
  return "unknown";
}

function consume(ip: string, limit: number, now = Date.now()): void {
  // Prevent unbounded memory growth from spoofed IPs.
  if (!buckets.has(ip) && buckets.size >= MAX_TRACKED_IPS) {
    buckets.clear();
  }
  const bucket = buckets.get(ip);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
    return;
  }
  bucket.count += 1;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  req: Request,
  scope: "air" | "assistant"
): RateLimitResult {
  const limit = scope === "air" ? DEFAULT_LIMIT : ASSISTANT_LIMIT;
  const ip = clientIp(req);
  const now = Date.now();

  // Read current state without mutation first, so tests can assert precisely.
  const bucket = buckets.get(ip);
  const windowActive = bucket && now - bucket.windowStart < WINDOW_MS;
  const currentCount = windowActive ? bucket.count : 0;

  if (currentCount >= limit) {
    const retryAfterSeconds = windowActive
      ? Math.max(1, Math.ceil((bucket.windowStart + WINDOW_MS - now) / 1000))
      : 1;
    return { allowed: false, remaining: 0, limit, retryAfterSeconds };
  }

  consume(ip, limit, now);
  return {
    allowed: true,
    remaining: Math.max(0, limit - currentCount - 1),
    limit,
    retryAfterSeconds: 0,
  };
}

export function resetRateLimits(): void {
  buckets.clear();
}
