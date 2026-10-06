import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KV_KEYS, type DiscordMember } from '@/lib/kv'

export const dynamic = 'force-dynamic'

async function discordFetch(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Discord API ${res.status}: ${url}`)
  return res.json()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${request.headers.get('host')}`

  if (error) {
    return NextResponse.redirect(`${siteUrl}/-verify?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${siteUrl}/-verify?error=missing_params`)
  }

  // Verify state
  const storedStateRaw = await kvGet(KV_KEYS.DISCORD_OAUTH_STATE)
  if (!storedStateRaw) {
    return NextResponse.redirect(`${siteUrl}/-verify?error=invalid_state`)
  }
  const { state: storedState, ts } = JSON.parse(storedStateRaw)
  if (state !== storedState || Date.now() - ts > 10 * 60 * 1000) {
    return NextResponse.redirect(`${siteUrl}/-verify?error=invalid_state`)
  }

  // Invalidate state
  await kvSet(KV_KEYS.DISCORD_OAUTH_STATE, JSON.stringify({ state: '', ts: 0 }))

  const clientId = process.env.DISCORD_CLIENT_ID!
  const clientSecret = process.env.DISCORD_CLIENT_SECRET!
  const redirectUri = `${siteUrl}/api/discord/callback`

  // Exchange code for token
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      grant_type: 'authorization_code', code, redirect_uri: redirectUri,
    }),
  })
  if (!tokenRes.ok) {
    return NextResponse.redirect(`${siteUrl}/-verify?error=token_exchange_failed`)
  }
  const tokenData = await tokenRes.json()
  const { access_token, refresh_token, expires_in } = tokenData

  // Get user info
  const user = await discordFetch('https://discord.com/api/users/@me', access_token)

  // Get guild member info if a guild ID is configured
  const guildId = process.env.DISCORD_GUILD_ID
  let guildMember: any = null
  if (guildId) {
    try {
      guildMember = await discordFetch(
        `https://discord.com/api/users/@me/guilds/${guildId}/member`,
        access_token,
      )
    } catch {
      // User is not in the guild — still verify them, just without guild roles
    }
  }

  // Load existing members map
  const existingRaw = await kvGet(KV_KEYS.DISCORD_MEMBERS)
  const members: Record<string, DiscordMember> = existingRaw ? JSON.parse(existingRaw) : {}

  const avatarHash = user.avatar
  const member: DiscordMember = {
    discordId: user.id,
    username: user.username,
    displayName: guildMember?.nick || user.global_name || user.username,
    avatar: avatarHash
      ? `https://cdn.discordapp.com/avatars/${user.id}/${avatarHash}.webp?size=128`
      : null,
    roles: guildMember?.roles || [],
    joinedAt: members[user.id]?.joinedAt || new Date().toISOString(),
    verifiedAt: new Date().toISOString(),
    accessToken: access_token,
    refreshToken: refresh_token,
    tokenExpiry: Date.now() + expires_in * 1000,
    guildJoinedAt: guildMember?.joined_at,
  }
  members[user.id] = member

  await kvSet(KV_KEYS.DISCORD_MEMBERS, JSON.stringify(members))

  // Optionally assign verified role via bot token
  const botToken = process.env.DISCORD_BOT_TOKEN
  const verifiedRoleId = process.env.DISCORD_VERIFIED_ROLE_ID
  if (botToken && guildId && verifiedRoleId && guildMember) {
    try {
      await fetch(
        `https://discord.com/api/guilds/${guildId}/members/${user.id}/roles/${verifiedRoleId}`,
        { method: 'PUT', headers: { Authorization: `Bot ${botToken}`, 'X-Audit-Log-Reason': 'VoidHub site verification' } },
      )
    } catch { /* non-fatal */ }
  }

  return NextResponse.redirect(`${siteUrl}/-verify?success=1&username=${encodeURIComponent(user.global_name || user.username)}`)
}
