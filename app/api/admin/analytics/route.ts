import { summarizeAnalytics } from '@/lib/analytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorized(req: Request) {
  const key = req.headers.get('x-admin-key')
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const summary = await summarizeAnalytics()
  return Response.json(summary, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
