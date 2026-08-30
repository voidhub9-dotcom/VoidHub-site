import { r2GetBytes } from '@/lib/r2'

export const runtime = 'nodejs'

/** Serves images uploaded via the admin dashboard (stored in R2 uploads/). */

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  // Only allow the exact id shape we generate — no path traversal
  if (!/^[a-z0-9-]+\.(png|jpg|webp|gif|svg)$/.test(id)) {
    return new Response('Not found', { status: 404 })
  }

  const bytes = await r2GetBytes(`uploads/${id}`)
  if (!bytes) return new Response('Not found', { status: 404 })

  const ext = id.split('.').pop() as string
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
      // Uploaded files are immutable (unique ids) — cache aggressively
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
