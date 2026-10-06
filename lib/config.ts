/**
 * Site-managed credentials.
 * Reads from R2-backed KV first; falls back to process.env so existing
 * Vercel env vars keep working until you migrate them to the admin panel.
 */

import { kvGet, kvSet, KV_KEYS, type SiteConfig } from './kv'

let _cache: SiteConfig | null = null
let _cacheTs = 0
const CACHE_TTL = 30_000 // 30 s

export async function getConfig(): Promise<SiteConfig> {
  if (_cache && Date.now() - _cacheTs < CACHE_TTL) return _cache

  try {
    const raw = await kvGet(KV_KEYS.CONFIG)
    _cache = raw ? (JSON.parse(raw) as SiteConfig) : {}
    _cacheTs = Date.now()
    return _cache
  } catch {
    _cache = {}
    _cacheTs = Date.now()
    return _cache
  }
}

export async function setConfig(patch: Partial<SiteConfig>): Promise<void> {
  const current = await getConfig()
  const next = { ...current, ...patch }
  // Strip empty strings so they don't shadow env var fallbacks
  for (const k of Object.keys(next) as (keyof SiteConfig)[]) {
    if (next[k] === '') delete next[k]
  }
  await kvSet(KV_KEYS.CONFIG, JSON.stringify(next))
  _cache = next
  _cacheTs = Date.now()
}

/** Resolve a config field: KV value takes priority, env var is the fallback. */
export async function cfg(
  field: keyof SiteConfig,
  envKey: string,
): Promise<string | undefined> {
  const c = await getConfig()
  return c[field] || process.env[envKey] || undefined
}
