import { kvGet, KV_KEYS } from '@/lib/kv'
import { loadKeyPage } from '@/lib/key-page'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [config, discord] = await Promise.all([loadKeyPage(), kvGet(KV_KEYS.DISCORD)])

  // Only expose enabled providers publicly
  return Response.json(
    {
      ...config,
      providers: config.providers.filter(p => p.enabled),
      discord: discord || 'https://discord.gg/kPPsdZtndn',
    },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30' } },
  )
}
