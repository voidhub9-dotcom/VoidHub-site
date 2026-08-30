/**
 * Live Discord stats for the homepage — member count + who's online right
 * now, resolved from the server's own invite link (no bot token needed).
 *
 * Uses Discord's public invite-resolve endpoint, which works for any valid,
 * non-expired invite: https://discord.com/api/v10/invites/{code}
 *
 * Cached server-side for a minute (same pattern as /api/public/weao) so a
 * page full of visitors doesn't hammer Discord's API on every load.
 */
import { kvGet, KV_KEYS } from '@/lib/kv'

export const dynamic = 'force-dynamic'

const DEFAULT_INVITE = 'https://discord.gg/kPPsdZtndn'
const CACHE_TTL_MS = 60 * 1000

interface WidgetPayload {
  ok: boolean
  name: string
  memberCount: number
  onlineCount: number
  iconUrl: string | null
  inviteUrl: string
}

let cache: { data: WidgetPayload; expires: number; forInvite: string } | null = null

function extractInviteCode(url: string): string | null {
  const match = url.match(/discord(?:app)?\.(?:gg|com)\/(?:invite\/)?([a-zA-Z0-9-]+)/i)
  return match ? match[1] : null
}

async function fetchWidget(inviteUrl: string): Promise<WidgetPayload> {
  const empty: WidgetPayload = { ok: false, name: '', memberCount: 0, onlineCount: 0, iconUrl: null, inviteUrl }
  const code = extractInviteCode(inviteUrl)
  if (!code) return empty

  try {
    const res = await fetch(
      `https://discord.com/api/v10/invites/${code}?with_counts=true&with_expiration=true`,
      { signal: AbortSignal.timeout(6000), cache: 'no-store' },
    )
    if (!res.ok) return empty
    const data = await res.json()
    const guild = data?.guild
    if (!guild?.id) return empty

    return {
      ok: true,
      name: String(guild.name || 'Discord'),
      memberCount: typeof data.approximate_member_count === 'number' ? data.approximate_member_count : 0,
      onlineCount: typeof data.approximate_presence_count === 'number' ? data.approximate_presence_count : 0,
      iconUrl: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : null,
      inviteUrl,
    }
  } catch {
    return empty
  }
}

export async function GET() {
  const inviteUrl = (await kvGet(KV_KEYS.DISCORD)) || DEFAULT_INVITE

  if (cache && cache.forInvite === inviteUrl && Date.now() < cache.expires) {
    return Response.json(cache.data, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
  }

  const data = await fetchWidget(inviteUrl)
  if (data.ok) {
    cache = { data, expires: Date.now() + CACHE_TTL_MS, forInvite: inviteUrl }
  }

  return Response.json(data, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
}
