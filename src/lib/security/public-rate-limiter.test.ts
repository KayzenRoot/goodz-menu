import { describe, expect, it } from "vitest";
import { createSlidingWindowRateLimiter } from "@/lib/security/public-rate-limiter";

describe("public-rate-limiter", () => {
  it("enforces sliding-window request ceilings and recovers after window expiry", () => {
    const limiter = createSlidingWindowRateLimiter({ windowMs: 10_000, maxRequests: 2, maxBuckets: 3 });

    expect(limiter.consume("ip:1", 1_000)).toEqual({ allowed: true, remaining: 1 });
    expect(limiter.consume("ip:1", 2_000)).toEqual({ allowed: true, remaining: 0 });
    expect(limiter.consume("ip:1", 3_000)).toEqual({ allowed: false, retryAfterSeconds: 8 });
    expect(limiter.consume("ip:1", 11_500)).toEqual({ allowed: true, remaining: 0 });
  });
});
