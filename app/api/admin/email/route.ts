import { sendCustomEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

function authorized(req: Request) {
  const key = req.headers.get('x-admin-key')
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** POST — send a one-off email to any recipient via Resend. Admin-only. */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const to = typeof (body as any)?.to === 'string' ? (body as any).to.trim() : ''
  const subject = typeof (body as any)?.subject === 'string' ? (body as any).subject.trim() : ''
  const text = typeof (body as any)?.text === 'string' ? (body as any).text : ''
  const html = typeof (body as any)?.html === 'string' ? (body as any).html : ''

  if (!to || !EMAIL_REGEX.test(to)) {
    return Response.json({ error: 'A valid recipient email is required' }, { status: 400 })
  }
  if (!subject) {
    return Response.json({ error: 'Subject is required' }, { status: 400 })
  }
  if (!text.trim() && !html.trim()) {
    return Response.json({ error: 'Email body is required' }, { status: 400 })
  }

  const result = await sendCustomEmail({ to, subject, text: text || undefined, html: html || undefined })

  if (!result.ok) {
    return Response.json({ error: result.error || 'Failed to send email' }, { status: 502 })
  }

  return Response.json({ success: true, id: result.id })
}
