/**
 * Key/value storage — now powered by Cloudflare R2.
 *
 * Keeps the exact same API surface as the old Vercel-KV implementation
 * (`KV_KEYS`, `ensureSeeded`, `kvGet`, `kvSet`, `kvDel`) so every existing
 * API route works unchanged. Each key is stored as a small text object in
 * your R2 bucket under the `kv/` prefix.
 */

import { r2GetText, r2Put, r2Delete, r2Configured } from './r2'

export const KV_KEYS = {
  GAMES: 'voidhub:games',
  LOADER_SCRIPT: 'voidhub:loader_script',
  RAW_SCRIPT_URL: 'voidhub:raw_script_url',
  ENDPOINT_URL: 'voidhub:endpoint_url',
  SCRIPT_MAPPINGS: 'voidhub:script_mappings',
  GAMELIST_LUA: 'voidhub:gamelist_lua',
  DISCORD: 'voidhub:discord',
  TAGLINE: 'voidhub:tagline',
  MAINTENANCE: 'voidhub:maintenance',
  EXECUTORS: 'voidhub:executors',
  ANALYTICS: 'voidhub:analytics',
  SITE_LINKS: 'voidhub:site_links',
  KEY_PAGE: 'voidhub:key_page',
  SHOP_PRODUCTS: 'voidhub:shop_products',
  SHOP_ORDERS: 'voidhub:shop_orders',
  SEEDED: 'voidhub:seeded',
} as const

/** Default executor compatibility list (used until edited in admin). */
export const DEFAULT_EXECUTORS = [
  { name: 'Potassium', status: 'supported' },
  { name: 'Seliware', status: 'supported' },
  { name: 'Madium', status: 'supported' },
  { name: 'Cosmic', status: 'supported' },
  { name: 'Macsploit', status: 'supported' },
  { name: 'Volt', status: 'supported' },
  { name: 'Delta', status: 'supported' },
  { name: 'Codex', status: 'supported' },
  { name: 'Wave', status: 'supported' },
  { name: 'Real', status: 'supported', link: 'https://discord.gg/projectreal', linkLabel: 'Official Discord' },
  { name: 'Xeno', status: 'unsupported' },
  { name: 'Solara', status: 'unsupported' },
  { name: 'Velocity', status: 'unsupported' },
  { name: 'Ronix', status: 'unsupported' },
  { name: 'Arceus X', status: 'unsupported' },
]

function keyFor(key: string): string {
  // "voidhub:discord" -> "kv/voidhub__discord.txt"
  return `kv/${key.replace(/[^a-zA-Z0-9_-]/g, '__')}.txt`
}

const DEFAULT_LOADER_SCRIPT = `-- VoidHub Loader
-- This script is served to executors via /api/loader
local placeId = game.PlaceId
print("[VoidHub] Loader started for place " .. tostring(placeId))
`

const SEED_DEFAULTS: Record<string, string> = {
  [KV_KEYS.DISCORD]: 'https://discord.gg/kPPsdZtndn',
  [KV_KEYS.TAGLINE]: 'Free. Powerful. No Limits.',
  [KV_KEYS.MAINTENANCE]: 'false',
  [KV_KEYS.LOADER_SCRIPT]: DEFAULT_LOADER_SCRIPT,
  [KV_KEYS.ENDPOINT_URL]: '',
  [KV_KEYS.RAW_SCRIPT_URL]: '',
  [KV_KEYS.SCRIPT_MAPPINGS]: '[]',
}

let _seedPromise: Promise<void> | null = null

/** Seed default values into R2 on first boot (no-op if already seeded). */
export async function ensureSeeded(): Promise<void> {
  if (!r2Configured) return
  if (!_seedPromise) {
    _seedPromise = (async () => {
      try {
        const already = await r2GetText(keyFor(KV_KEYS.SEEDED))
        if (already) return
        console.log('[voidhub] First boot - seeding R2 KV defaults...')
        await Promise.all(
          Object.entries(SEED_DEFAULTS).map(([k, v]) =>
            r2Put(keyFor(k), v, 'text/plain'),
          ),
        )
        await r2Put(keyFor(KV_KEYS.SEEDED), 'true', 'text/plain')
        console.log('[voidhub] R2 KV seeding complete.')
      } catch (e) {
        console.error('[voidhub] ensureSeeded error:', e)
        _seedPromise = null
      }
    })()
  }
  return _seedPromise
}

/** kvGet — returns the stored value as a string, or null if missing. */
export async function kvGet(key: string): Promise<string | null> {
  await ensureSeeded()
  return r2GetText(keyFor(key))
}

/** kvSet — stores a string value. Returns true on success. */
export async function kvSet(key: string, value: string): Promise<boolean> {
  return r2Put(keyFor(key), value, 'text/plain')
}

export async function kvDel(key: string): Promise<boolean> {
  return r2Delete(keyFor(key))
}
