import { kvGet, KV_KEYS } from './kv'

/**
 * Fully editable "Get Key" page config — stored as one JSON blob in KV.
 * No keys are stored or generated here; providers link out to your own
 * external key system(s) (Linkvertise, Work.ink, Lootlabs, Discord, etc).
 */
export interface KeyProvider {
  id: string
  /** Display name, e.g. "Linkvertise" */
  name: string
  /** Where the button sends the user */
  url: string
  /** Short description under the name, e.g. "Complete 2 ads — key lasts 24h" */
  description: string
  /** Small badge label, e.g. "FASTEST", "NO ADS", "24H" (optional) */
  badge: string
  /** Optional logo/image URL shown next to the name */
  iconUrl: string
  /** How long the key lasts, e.g. "24 hours" (shown as a chip) */
  keyDuration: string
  /** Number of checkpoints/ads, e.g. "2 checkpoints" (shown as a chip) */
  checkpoints: string
  /** Custom button label (defaults to "Get Key") */
  buttonText: string
  /** Show/hide without deleting */
  enabled: boolean
}

export interface KeyPageConfig {
  /** Master switch — hides the /getkey page and nav button entirely */
  enabled: boolean
  /** Page heading */
  title: string
  /** Page subheading */
  subtitle: string
  /** Require the "join discord first" gate step like chiyo */
  requireDiscord: boolean
  /** Text on the discord gate card */
  discordGateText: string
  /** Instructions shown above the provider list */
  instructions: string
  /** Optional banner/hero image URL at the top of the page */
  bannerImageUrl: string
  /** Optional note shown under the provider list, e.g. "Keys reset daily at 00:00 UTC" */
  footerNote: string
  /** Optional Discord invite override for the gate (falls back to site Discord) */
  discordUrlOverride: string
  /** The key provider options (fully editable, add as many as you want) */
  providers: KeyProvider[]
}

export const DEFAULT_KEY_PAGE: KeyPageConfig = {
  enabled: false,
  title: 'Get Your Key',
  subtitle: 'Complete one of the options below to receive your key.',
  requireDiscord: true,
  discordGateText: 'You need to join our Discord server before you can access the key system.',
  instructions: '',
  bannerImageUrl: '',
  footerNote: '',
  discordUrlOverride: '',
  providers: [],
}

export async function loadKeyPage(): Promise<KeyPageConfig> {
  try {
    const raw = await kvGet(KV_KEYS.KEY_PAGE)
    if (!raw) return DEFAULT_KEY_PAGE
    const parsed = JSON.parse(raw)
    const providerDefaults = { badge: '', iconUrl: '', keyDuration: '', checkpoints: '', buttonText: '', enabled: true }
    return {
      ...DEFAULT_KEY_PAGE,
      ...parsed,
      providers: Array.isArray(parsed.providers)
        ? parsed.providers.map((p: Partial<KeyProvider>) => ({ ...providerDefaults, ...p }))
        : [],
    }
  } catch {
    return DEFAULT_KEY_PAGE
  }
}
