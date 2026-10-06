import { NextRequest, NextResponse } from 'next/server'
import { kvGet, KV_KEYS, type DiscordMember } from '@/lib/kv'

export const dynamic = 'force-dynamic'

function validAdmin(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || ''
  const valid = process.env.ADMIN_PASSWORD || 'voidhub123'
  return key === valid
}

export async function GET(request: NextRequest) {
  if (!validAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const raw = await kvGet(KV_KEYS.DISCORD_MEMBERS)
  const members: Record<string, DiscordMember> = raw ? JSON.parse(raw) : {}
  return NextResponse.json(Object.values(members))
}
