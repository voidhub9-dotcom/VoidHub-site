import { kvGet, kvSet, KV_KEYS } from '@/lib/kv'

function isAuthorized(request: Request): boolean {
  const key = request.headers.get('x-admin-key') || ''
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  }

  const [script, rawScriptUrl, endpointUrl] = await Promise.all([
    kvGet(KV_KEYS.LOADER_SCRIPT),
    kvGet(KV_KEYS.RAW_SCRIPT_URL),
    kvGet(KV_KEYS.ENDPOINT_URL),
  ])

  return new Response(
    JSON.stringify({
      script: script ?? '',
      rawScriptUrl: rawScriptUrl ?? '',
      endpointUrl: endpointUrl || 'https://www.voidon.top/api/loader',
      source: rawScriptUrl ? 'raw-url' : script ? 'database' : 'none',
    }),
    { status: 200, headers: HEADERS }
  )
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  }

  let body: { script?: string; rawScriptUrl?: string; endpointUrl?: string; testRawUrl?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
  }

  // ── Test a raw URL without saving it ───────────────────────────────────────
  if (typeof body.testRawUrl === 'string') {
    const url = body.testRawUrl.trim()
    if (!/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ ok: false, error: 'URL must start with http(s)://' }), { status: 400, headers: HEADERS })
    }
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'VoidHub-Loader/1.0' }, cache: 'no-store' })
      if (!res.ok) {
        return new Response(JSON.stringify({ ok: false, error: `Source returned HTTP ${res.status}` }), { status: 200, headers: HEADERS })
      }
      const text = await res.text()
      if (!text.trim()) {
        return new Response(JSON.stringify({ ok: false, error: 'Source returned an empty response' }), { status: 200, headers: HEADERS })
      }
      const lower = text.trimStart().toLowerCase()
      if (lower.startsWith('<!doctype') || lower.startsWith('<html')) {
        return new Response(JSON.stringify({ ok: false, error: 'Source returned an HTML page, not raw Lua. Make sure you are using the RAW link (e.g. raw.githubusercontent.com).' }), { status: 200, headers: HEADERS })
      }
      return new Response(
        JSON.stringify({
          ok: true,
          bytes: text.length,
          lines: text.split('\n').length,
          preview: text.slice(0, 200),
        }),
        { status: 200, headers: HEADERS }
      )
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: `Fetch failed: ${e?.message || 'unknown error'}` }), { status: 200, headers: HEADERS })
    }
  }

  const results: Record<string, boolean> = {}

  if (typeof body.script === 'string') {
    results.script = await kvSet(KV_KEYS.LOADER_SCRIPT, body.script)
  }
  if (typeof body.rawScriptUrl === 'string') {
    const url = body.rawScriptUrl.trim()
    if (url && !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: 'Raw URL must start with http(s)://' }), { status: 400, headers: HEADERS })
    }
    results.rawScriptUrl = await kvSet(KV_KEYS.RAW_SCRIPT_URL, url)
  }
  if (typeof body.endpointUrl === 'string') {
    results.endpointUrl = await kvSet(KV_KEYS.ENDPOINT_URL, body.endpointUrl)
  }

  const allOk = Object.keys(results).length === 0 || Object.values(results).every(Boolean)

  if (!allOk) {
    return new Response(
      JSON.stringify({
        error: 'Storage write failed. Make sure your Cloudflare R2 env vars are set.',
        results,
      }),
      { status: 500, headers: HEADERS }
    )
  }

  return new Response(JSON.stringify({ ok: true, results }), { status: 200, headers: HEADERS })
}
