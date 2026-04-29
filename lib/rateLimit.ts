import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = Redis.fromEnv();

// Shared burst guard: 3 requests per minute per IP across all AI routes.
const BURST = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  prefix: "rl:burst",
});

// Per-route hourly quotas.
const HOURLY = {
  explain:       new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(8,  "1 h"), prefix: "rl:explain" }),
  followup:      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(4,  "1 h"), prefix: "rl:followup" }),
  "draft-answer":new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(4,  "1 h"), prefix: "rl:draft-answer" }),
  translate:     new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(12, "1 h"), prefix: "rl:translate" }),
} as const;

function clientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function rateLimitedResponse(limit: number, reset: number): NextResponse {
  return NextResponse.json(
    { error: "Rate limit exceeded. Please try again later." },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit":     String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset":     String(reset),
      },
    }
  );
}

/**
 * Checks both the shared burst limit and the route-specific hourly quota.
 * Returns a 429 NextResponse if either is exceeded, or null if the request is allowed.
 *
 * Usage: const blocked = await checkRateLimit(req, "explain");
 *        if (blocked) return blocked;
 */
export async function checkRateLimit(
  req: NextRequest,
  route: keyof typeof HOURLY
): Promise<NextResponse | null> {
  const ip = clientIP(req);

  const burst = await BURST.limit(ip);
  if (!burst.success) return rateLimitedResponse(burst.limit, burst.reset);

  const hourly = await HOURLY[route].limit(ip);
  if (!hourly.success) return rateLimitedResponse(hourly.limit, hourly.reset);

  return null;
}
