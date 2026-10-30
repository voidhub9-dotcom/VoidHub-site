import { buildMigrationScript } from '@/lib/migration'
import { recordLoaderHit } from '@/lib/analytics'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

/**
 * Browsers always send sec-fetch-* headers — Roblox executors NEVER do.
 * Do not check User-Agent: executors commonly spoof a Mozilla UA.
 */
function isBrowser(req: Request): boolean {
  return (
    req.headers.has('sec-fetch-site') ||
    req.headers.has('sec-fetch-mode') ||
    req.headers.has('sec-fetch-dest')
  )
}

export async function GET(request: Request) {
  if (isBrowser(request)) {
    return Response.redirect(new URL('/unauthorized', request.url), 302)
  }

  const ip = getClientIp(request)
  if (isRateLimited(ip, 20, 10_000)) {
    return new Response('-- Too many requests, slow down', {
      status: 429,
      headers: { 'Content-Type': 'text/plain', 'Retry-After': '10' },
    })
  }

  await recordLoaderHit()

  return new Response(buildMigrationScript(new URL(request.url).origin), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
