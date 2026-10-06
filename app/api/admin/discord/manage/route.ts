import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KV_KEYS, type DiscordMember } from '@/lib/kv'

export const dynamic = 'force-dynamic'

function validAdmin(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || ''
  return key === (process.env.ADMIN_PASSWORD || 'voidhub123')
}

async function botFetch(path: string, method: string, body?: object) {
  const botToken = process.env.DISCORD_BOT_TOKEN!
  const res = await fetch(`https://discord.com/api${path}`, {
    method,
    headers: {
      Authorization: `Bot ${botToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return res
}

export async function POST(request: NextRequest) {
  if (!validAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const botToken = process.env.DISCORD_BOT_TOKEN
  const guildId = process.env.DISCORD_GUILD_ID
  if (!botToken || !guildId) {
    return NextResponse.json({ error: 'Discord bot not configured' }, { status: 400 })
  }

  const body = await request.json()
  const { action, discordId, roleId, reason } = body

  const auditReason = reason || 'VoidHub admin action'

  if (action === 'kick') {
    const res = await botFetch(`/guilds/${guildId}/members/${discordId}`, 'DELETE')
    if (!res.ok && res.status !== 204) {
      return NextResponse.json({ error: `Discord returned ${res.status}` }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'ban') {
    const res = await botFetch(`/guilds/${guildId}/bans/${discordId}`, 'PUT', { delete_message_seconds: 0 })
    if (!res.ok) return NextResponse.json({ error: `Discord returned ${res.status}` }, { status: 500 })
    // Mark as banned in KV
    const raw = await kvGet(KV_KEYS.DISCORD_MEMBERS)
    if (raw) {
      const members = JSON.parse(raw)
      if (members[discordId]) { members[discordId].banned = true; await kvSet(KV_KEYS.DISCORD_MEMBERS, JSON.stringify(members)) }
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'unban') {
    const res = await botFetch(`/guilds/${guildId}/bans/${discordId}`, 'DELETE')
    if (!res.ok && res.status !== 204) return NextResponse.json({ error: `Discord returned ${res.status}` }, { status: 500 })
    const raw = await kvGet(KV_KEYS.DISCORD_MEMBERS)
    if (raw) {
      const members = JSON.parse(raw)
      if (members[discordId]) { members[discordId].banned = false; await kvSet(KV_KEYS.DISCORD_MEMBERS, JSON.stringify(members)) }
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'add_role' && roleId) {
    const res = await botFetch(`/guilds/${guildId}/members/${discordId}/roles/${roleId}`, 'PUT')
    if (!res.ok && res.status !== 204) return NextResponse.json({ error: `Discord returned ${res.status}` }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'remove_role' && roleId) {
    const res = await botFetch(`/guilds/${guildId}/members/${discordId}/roles/${roleId}`, 'DELETE')
    if (!res.ok && res.status !== 204) return NextResponse.json({ error: `Discord returned ${res.status}` }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'remove_member') {
    // Remove from KV only (doesn't kick from Discord)
    const raw = await kvGet(KV_KEYS.DISCORD_MEMBERS)
    if (raw) {
      const members = JSON.parse(raw)
      delete members[discordId]
      await kvSet(KV_KEYS.DISCORD_MEMBERS, JSON.stringify(members))
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
