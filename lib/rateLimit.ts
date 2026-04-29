import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const IS_PROD = process.env.NODE_ENV === "production";

// In production both vars must be present — missing vars are a hard deployment error.
if (IS_PROD && (!UPSTASH_URL || !UPSTASH_TOKEN)) {
  throw new Error(
    "[rateLimit] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in production. " +
    "Add them to Vercel Project Settings → Environment Variables."
  );
}

// Fail open only in non-production environments when vars are absent.
const DEV_MODE = !IS_PROD && (!UPSTASH_URL || !UPSTASH_TOKEN);

let BURST:  Ratelimit;
let HOURLY: Record<"explain" | "followup" | "draft-answer" | "translate", Ratelimit>;
let warnedOnce = false;

if (!DEV_MODE) {
  const redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN });

  // Shared burst guard: 3 requests per minute per IP across all AI routes.
  BURST = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 m"),
    prefix: "rl:burst",
  });

  // Per-route hourly quotas.
  HOURLY = {
    explain:        new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(8,  "1 h"), prefix: "rl:explain" }),
    followup:       new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(4,  "1 h"), prefix: "rl:followup" }),
    "draft-answer": new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(4,  "1 h"), prefix: "rl:draft-answer" }),
    translate:      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(12, "1 h"), prefix: "rl:translate" }),
  };
}

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
 * In development with missing Upstash env vars, always returns null (fail open).
 *
 * Usage: const blocked = await checkRateLimit(req, "explain");
 *        if (blocked) return blocked;
 */
export async function checkRateLimit(
  req: NextRequest,
  route: "explain" | "followup" | "draft-answer" | "translate"
): Promise<NextResponse | null> {
  if (DEV_MODE) {
    if (!warnedOnce) {
      console.warn("[rateLimit] Rate limiting disabled: missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN. Set these env vars for production.");
      warnedOnce = true;
    }
    return null;
  }

  const ip = clientIP(req);

  const burst = await BURST!.limit(ip);
  if (!burst.success) return rateLimitedResponse(burst.limit, burst.reset);

  const hourly = await HOURLY![route].limit(ip);
  if (!hourly.success) return rateLimitedResponse(hourly.limit, hourly.reset);

  return null;
}
