export type RateLimitDecision =
  | Readonly<{ allowed: true; remaining: number }>
  | Readonly<{ allowed: false; retryAfterSeconds: number }>;

export type SlidingWindowLimiter = Readonly<{
  consume(key: string, nowMs?: number): RateLimitDecision;
  reset(): void;
}>;

export function createSlidingWindowRateLimiter(options: Readonly<{
  windowMs: number;
  maxRequests: number;
  maxBuckets?: number;
}>): SlidingWindowLimiter {
  const buckets = new Map<string, number[]>();
  const maxBuckets = options.maxBuckets ?? 2_000;

  return {
    consume(key: string, nowMs = Date.now()): RateLimitDecision {
      const safeKey = key.trim().slice(0, 180) || "anonymous";
      const cutoff = nowMs - options.windowMs;
      const existing = buckets.get(safeKey);
      const recent = existing ? existing.filter((ts) => ts > cutoff) : [];

      if (recent.length >= options.maxRequests) {
        buckets.set(safeKey, recent);
        const oldest = recent[0] ?? nowMs;
        const retryAfterSeconds = Math.max(1, Math.ceil((oldest + options.windowMs - nowMs) / 1000));
        return { allowed: false, retryAfterSeconds };
      }

      recent.push(nowMs);
      if (!buckets.has(safeKey) && buckets.size >= maxBuckets) {
        const firstKey = buckets.keys().next().value;
        if (firstKey !== undefined) buckets.delete(firstKey);
      }
      buckets.set(safeKey, recent);
      return { allowed: true, remaining: options.maxRequests - recent.length };
    },
    reset() {
      buckets.clear();
    },
  };
}

export const publicCheckoutRateLimiter = createSlidingWindowRateLimiter({
  windowMs: 60_000,
  maxRequests: 12,
  maxBuckets: 4_000,
});
