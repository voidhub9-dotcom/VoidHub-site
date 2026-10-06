import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KV_KEYS, type DiscordMember } from '@/lib/kv'

export const dynamic = 'force-dynamic'

function validAdmin(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || ''
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

export async function POST(request: NextRequest) {
  if (!validAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const botToken = process.env.DISCORD_BOT_TOKEN
  const guildId = process.env.DISCORD_GUILD_ID
  if (!botToken || !guildId) {
    return NextResponse.json({ error: 'DISCORD_BOT_TOKEN and DISCORD_GUILD_ID must be set' }, { status: 400 })
  }

  // Fetch all guild members (paginated, max 1000/request)
  const allMembers: any[] = []
  let after = '0'
  while (true) {
    const res = await fetch(
      `https://discord.com/api/guilds/${guildId}/members?limit=1000&after=${after}`,
      { headers: { Authorization: `Bot ${botToken}` } },
    )
    if (!res.ok) break
    const batch: any[] = await res.json()
    if (!batch.length) break
    allMembers.push(...batch)
    after = batch[batch.length - 1].user.id
    if (batch.length < 1000) break
  }

  // Merge with existing (keep verifiedAt + tokens)
  const existingRaw = await kvGet(KV_KEYS.DISCORD_MEMBERS)
  const existing: Record<string, DiscordMember> = existingRaw ? JSON.parse(existingRaw) : {}

  for (const m of allMembers) {
    const u = m.user
    if (u.bot) continue
    const avatarHash = m.avatar || u.avatar
    const prev = existing[u.id]
    existing[u.id] = {
      discordId: u.id,
      username: u.username,
      displayName: m.nick || u.global_name || u.username,
      avatar: avatarHash
        ? `https://cdn.discordapp.com/avatars/${u.id}/${avatarHash}.webp?size=128`
        : null,
      roles: m.roles,
      joinedAt: prev?.joinedAt || m.joined_at || new Date().toISOString(),
      verifiedAt: prev?.verifiedAt || new Date().toISOString(),
      guildJoinedAt: m.joined_at,
      ...(prev?.accessToken ? { accessToken: prev.accessToken, refreshToken: prev.refreshToken, tokenExpiry: prev.tokenExpiry } : {}),
    }
  }

  await kvSet(KV_KEYS.DISCORD_MEMBERS, JSON.stringify(existing))
  return NextResponse.json({ ok: true, count: allMembers.length })
}
