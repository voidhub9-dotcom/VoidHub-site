import { kvGet, KV_KEYS } from './kv'

/** Extra editable links/branding, stored as one JSON blob in KV. */
export interface SiteLinks {
  youtube: string
  tiktok: string
  telegram: string
  siteName: string
  logoUrl: string
  /** Default "Get Script" link pre-filled in the Add Game form */
  defaultScriptLink: string
}

export const DEFAULT_LINKS: SiteLinks = {
  youtube: '',
  tiktok: '',
  telegram: '',
  siteName: 'VoidHub',
  logoUrl: '',
  defaultScriptLink: '',
}

export async function loadLinks(): Promise<SiteLinks> {
  try {
    const raw = await kvGet(KV_KEYS.SITE_LINKS)
    if (!raw) return DEFAULT_LINKS
    return { ...DEFAULT_LINKS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_LINKS
  }
}
