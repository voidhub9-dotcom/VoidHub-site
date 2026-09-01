/**
 * Lightweight in-memory rate limiter for /api/loader.
 *
 * This does NOT stop a determined scraper (nothing can, short of breaking
 * real executors — see the /unauthorized page). What it does is cap how
 * fast one IP can hammer the endpoint in a tight loop, which is the actual
 * curl/scraping pattern this guards against. In-memory (not R2-backed) on
 * purpose: adding a storage round-trip to every loader request would slow
 * down real executors on their happy path, and Vercel keeps a function
 * instance warm across a burst of requests from the same source, which is
 * exactly when this matters.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const MAX_TRACKED_IPS = 5000

function sweep(now: number) {
  if (buckets.size < MAX_TRACKED_IPS) return
  for (const [ip, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(ip)
  }
}

/**
 * Returns true if `ip` has exceeded `limit` requests within the current
 * `windowMs` window, and bumps its counter either way.
 */
export function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  sweep(now)

  const existing = buckets.get(ip)
  if (!existing || existing.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs })
    return false
  }

  existing.count += 1
  return existing.count > limit
}

/** Best-effort client IP from standard proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}
