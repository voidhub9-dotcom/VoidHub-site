import { NextRequest, NextResponse } from 'next/server'
import { kvSet, KV_KEYS } from '@/lib/kv'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Discord OAuth not configured' }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${request.headers.get('host')}`
  const redirectUri = `${siteUrl}/api/discord/callback`

  const state = randomBytes(16).toString('hex')
  // Store state with TTL (10 minutes)
  await kvSet(KV_KEYS.DISCORD_OAUTH_STATE, JSON.stringify({ state, ts: Date.now() }))

  const url = new URL('https://discord.com/api/oauth2/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'identify guilds.members.read')
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString())
}
