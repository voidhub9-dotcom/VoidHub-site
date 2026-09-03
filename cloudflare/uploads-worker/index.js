/**
 * Serves uploaded images straight out of R2 (voidhub-storage, uploads/
 * prefix) at the edge — no Vercel function invocation, no S3 API round
 * trip, just a native R2 binding. Deployed as the "voidhub" Worker.
 *
 * Only ever reads the uploads/ prefix. Everything else in the bucket
 * (games.json, shop products, admin-only data) is intentionally
 * unreachable from here — this Worker has no business serving it, and
 * some of it (e.g. product notes) is meant to never be public.
 */

const CONTENT_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
}

// Same shape the id generator in app/api/admin/upload/route.ts produces:
// <base36 timestamp>-<6 char random>.<ext>
const ID_PATTERN = /^[a-z0-9-]+\.(png|jpe?g|webp|gif|svg)$/

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
    }

    // Expected path: /uploads/<id>.<ext>
    const match = pathname.match(/^\/uploads\/([^/]+)$/)
    const id = match?.[1]
    if (!id || !ID_PATTERN.test(id)) {
      return new Response('Not found', { status: 404 })
    }

    const object = await env.VOIDHUB_BUCKET.get(`uploads/${id}`)
    if (!object) {
      return new Response('Not found', { status: 404 })
    }

    const ext = id.split('.').pop().toLowerCase()
    const headers = new Headers()
    headers.set('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream')
    // Uploaded files are immutable (unique generated ids) — cache hard, both
    // at the browser and at Cloudflare's edge cache.
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('ETag', object.httpEtag)

    if (request.method === 'HEAD') {
      headers.set('Content-Length', String(object.size))
      return new Response(null, { headers })
    }

    return new Response(object.body, { headers })
  },
}
