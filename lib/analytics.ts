/**
 * Loader analytics — tracks every executor hit on /api/loader.
 *
 * Data is stored as a single JSON object in R2 (via the kv helper):
 * {
 *   total: number,                      // all-time executions
 *   days:  { '2026-07-07': number },    // executions per UTC day (kept 30 days)
 *   hours: { '2026-07-07T14': number }  // executions per UTC hour (kept 48 hours)
 * }
 *
 * Writes are best-effort: analytics must NEVER slow down or break the
 * loader itself, so every error here is swallowed.
 */

import { kvGet, kvSet, KV_KEYS } from './kv'

export interface AnalyticsData {
  total: number
  days: Record<string, number>
  hours: Record<string, number>
}

const EMPTY: AnalyticsData = { total: 0, days: {}, hours: {} }

function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10) // "2026-07-07"
}

function utcHour(d = new Date()): string {
  return d.toISOString().slice(0, 13) // "2026-07-07T14"
}

function prune(data: AnalyticsData): AnalyticsData {
  // Keep 30 days of daily buckets
  const dayCutoff = utcDay(new Date(Date.now() - 30 * 86400000))
  for (const key of Object.keys(data.days)) {
    if (key < dayCutoff) delete data.days[key]
  }
  // Keep 48 hours of hourly buckets
  const hourCutoff = utcHour(new Date(Date.now() - 48 * 3600000))
  for (const key of Object.keys(data.hours)) {
    if (key < hourCutoff) delete data.hours[key]
  }
  return data
}

export async function readAnalytics(): Promise<AnalyticsData> {
  try {
    const raw = await kvGet(KV_KEYS.ANALYTICS)
    if (!raw) return { ...EMPTY, days: {}, hours: {} }
    const parsed = JSON.parse(raw) as Partial<AnalyticsData>
    return {
      total: typeof parsed.total === 'number' ? parsed.total : 0,
      days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {},
      hours: parsed.hours && typeof parsed.hours === 'object' ? parsed.hours : {},
    }
  } catch {
    return { ...EMPTY, days: {}, hours: {} }
  }
}

/** Record one loader execution. Never throws. */
export async function recordLoaderHit(): Promise<void> {
  try {
    const data = await readAnalytics()
    const day = utcDay()
    const hour = utcHour()
    data.total += 1
    data.days[day] = (data.days[day] || 0) + 1
    data.hours[hour] = (data.hours[hour] || 0) + 1
    await kvSet(KV_KEYS.ANALYTICS, JSON.stringify(prune(data)))
  } catch {
    /* analytics must never break the loader */
  }
}

/** Aggregated stats shape served to the admin dashboard. */
export interface AnalyticsSummary {
  total: number
  today: number
  yesterday: number
  last7: number
  last30: number
  /** Last 14 days, oldest first: [{ date: '2026-07-07', count: 12 }] */
  daily: { date: string; count: number }[]
  /** Last 24 hours, oldest first: [{ hour: '14', count: 3 }] */
  hourly: { hour: string; count: number }[]
}

export async function summarizeAnalytics(): Promise<AnalyticsSummary> {
  const data = await readAnalytics()
  const now = new Date()
  const today = utcDay(now)
  const yesterday = utcDay(new Date(now.getTime() - 86400000))

  const daily: { date: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = utcDay(new Date(now.getTime() - i * 86400000))
    daily.push({ date: d, count: data.days[d] || 0 })
  }

  const hourly: { hour: string; count: number }[] = []
  for (let i = 23; i >= 0; i--) {
    const h = utcHour(new Date(now.getTime() - i * 3600000))
    hourly.push({ hour: h.slice(11), count: data.hours[h] || 0 })
  }

  let last7 = 0
  let last30 = 0
  for (let i = 0; i < 30; i++) {
    const d = utcDay(new Date(now.getTime() - i * 86400000))
    const c = data.days[d] || 0
    if (i < 7) last7 += c
    last30 += c
  }

  return {
    total: data.total,
    today: data.days[today] || 0,
    yesterday: data.days[yesterday] || 0,
    last7,
    last30,
    daily,
    hourly,
  }
}
