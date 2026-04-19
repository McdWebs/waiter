/**
 * Lightweight in-memory rate limiter middleware.
 *
 * Uses a sliding-window counter keyed by IP address.  Suitable for a
 * single-process Node server.  For multi-process / clustered deployments you
 * would want to back this with Redis, but for now it's a significant
 * improvement over having no limiting at all.
 */
import type { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  /** Time window in milliseconds (default: 60_000 = 1 minute) */
  windowMs?: number;
  /** Max requests per IP within the window (default: 30) */
  max?: number;
  /** Message returned when limit is exceeded */
  message?: string;
}

interface HitRecord {
  count: number;
  windowStart: number;
}

export function createRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 30;
  const message =
    options.message ?? "Too many requests, please try again later";

  const hits = new Map<string, HitRecord>();

  // Periodically purge stale entries to prevent unbounded memory growth
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.windowStart > windowMs) {
        hits.delete(key);
      }
    }
  }, windowMs);

  // Allow the process to exit even if this timer is still active
  cleanupInterval.unref();

  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const ip =
      (req.headers["x-forwarded-for"] as string | undefined)
        ?.split(",")[0]
        ?.trim() ??
      req.socket.remoteAddress ??
      "unknown";

    const now = Date.now();
    const existing = hits.get(ip);

    if (!existing || now - existing.windowStart > windowMs) {
      // New window
      hits.set(ip, { count: 1, windowStart: now });
      return next();
    }

    existing.count += 1;

    if (existing.count > max) {
      const retryAfterSec = Math.ceil(
        (windowMs - (now - existing.windowStart)) / 1000,
      );
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({ message });
    }

    return next();
  };
}
