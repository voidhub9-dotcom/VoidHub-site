import { kvGet, KV_KEYS } from '@/lib/kv'
import { recordLoaderHit } from '@/lib/analytics'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

/**
 * Protected script loader.
 *
 * Priority:
 *   1. Raw Script URL  — a hidden link set in the admin panel. The server
 *      fetches its raw content and serves it here. The link itself is NEVER
 *      exposed to users; they only ever see /api/loader.
 *   2. Pasted script   — Lua saved directly in the admin loader editor.
 *   3. Fallback        — harmless Lua that won't crash an executor.
 *
 * Browsers always send sec-fetch-* headers — Roblox executors NEVER do.
 *
 * DO NOT check User-Agent here. Executors like Delta, Synapse, Fluxus, etc.
 * all spoof a "Mozilla/..." UA. Checking ua.includes('Mozilla') would block
 * every executor and cause "attempt to call a nil value" errors because the
 * executor would receive a redirect → HTML → loadstring(html) returns nil.
 */
function isBrowser(req: Request): boolean {
  return (
    req.headers.has('sec-fetch-site') ||
    req.headers.has('sec-fetch-mode') ||
    req.headers.has('sec-fetch-dest')
  )
}

function blocked(text: string): boolean {
  const l = text.toLowerCase()
  return l.includes('setclipboard') || l.includes('toclipboard') || l.includes('clipboard')
}

/** True when the stored value is just a bare URL instead of Lua code. */
function isBareUrl(value: string): boolean {
  const v = value.trim()
  return /^https?:\/\/\S+$/i.test(v) && !v.includes('\n')
}

/** True when the fetched content is an HTML page (404 page, "Redirecting..." page, etc.) — never valid Lua. */
function looksLikeHtml(text: string): boolean {
  const t = text.trimStart().toLowerCase()
  return t.startsWith('<!doctype') || t.startsWith('<html')
}

/**
 * Fetch the hidden raw source URL server-side ("view raw").
 * Returns null on failure so the caller falls through to the next source.
 */
async function fetchRemoteScript(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VoidHub-Loader/1.0' },
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const text = await res.text()
    if (!text.trim() || looksLikeHtml(text)) return null
    return text
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  // ── Block browsers ────────────────────────────────────────────────────────
  // Browsers are redirected to the unauthorized page.
  // Roblox executors do not send sec-fetch-* headers, so they won't be redirected.
  if (isBrowser(request)) {
    return Response.redirect(new URL('/unauthorized', request.url), 302)
  }

  // ── Per-IP rate limit ────────────────────────────────────────────────────
  // Doesn't stop a single deliberate curl, but caps how fast one source can
  // hammer this endpoint in a tight loop (the actual scraping pattern).
  const ip = getClientIp(request)
  if (isRateLimited(ip, 20, 10_000)) {
    return new Response('-- Too many requests, slow down', {
      status: 429,
      headers: { 'Content-Type': 'text/plain', 'Retry-After': '10' },
    })
  }

  // Count this execution (real executor hit — browsers were filtered above).
  // Awaited but error-proof: recordLoaderHit never throws.
  await recordLoaderHit()

  let script: string | null = null

  // ── 1. Hidden Raw Script URL (set in admin, fetched server-side) ─────────
  try {
    const rawUrl = await kvGet(KV_KEYS.RAW_SCRIPT_URL)
    if (rawUrl && rawUrl.trim() !== '') {
      script = await fetchRemoteScript(rawUrl.trim())
    }
  } catch { /* fall through */ }

  // ── 2. Admin-saved pasted script (stored in R2) ───────────────────────────
  if (!script) {
    try {
      const custom = await kvGet(KV_KEYS.LOADER_SCRIPT)
      if (custom && custom.trim() !== '') {
        // If a bare URL was pasted into the script box instead of Lua,
        // fetch its content server-side — never serve a URL string to an
        // executor (loadstring("https://...") errors out).
        if (isBareUrl(custom)) {
          script = await fetchRemoteScript(custom.trim())
        } else {
          script = custom
        }
      }
    } catch { /* R2 not configured */ }
  }

  // ── 3. Last resort — valid Lua that won't crash the executor ─────────────
  if (!script) {
    script = '-- VoidHub Loader\nreturn {}'
  }

  if (blocked(script)) {
    return new Response('-- 403 Forbidden', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return new Response(script, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
      'Vary': 'User-Agent',
    },
  })
}
