import { r2Put } from '@/lib/r2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Admin image upload — lets the dashboard upload logos/banners straight
 * from the device instead of pasting URLs. Stores the file in R2
 * (uploads/<id>) and returns a permanent same-origin URL served by
 * /api/uploads/[id].
 */

const ADMIN_KEY = process.env.ADMIN_KEY || 'voidhub123'
const MAX_BYTES = 4 * 1024 * 1024 // 4MB is plenty for logos/banners

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
}

export async function POST(request: Request) {
  if (request.headers.get('x-admin-key') !== ADMIN_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return Response.json({ error: 'Missing "file" field' }, { status: 400 })
  }

  const ext = ALLOWED_TYPES[file.type]
  if (!ext) {
    return Response.json(
      { error: 'Only PNG, JPG, WebP, GIF, or SVG images are allowed' },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'Image too large (max 4MB)' }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const ok = await r2Put(`uploads/${id}`, bytes, file.type)
  if (!ok) {
    return Response.json({ error: 'Storage unavailable — try again later' }, { status: 500 })
  }

  return Response.json({ success: true, url: `/api/uploads/${id}` })
}
