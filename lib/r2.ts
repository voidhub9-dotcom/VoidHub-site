import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'

/**
 * Cloudflare R2 integration (S3-compatible).
 *
 * Required environment variables (add these in Vercel → Settings → Env Vars):
 *   CLOUDFLARE_R2_ACCOUNT_ID
 *   CLOUDFLARE_R2_ACCESS_KEY_ID
 *   CLOUDFLARE_R2_SECRET_ACCESS_KEY
 *   CLOUDFLARE_R2_BUCKET_NAME   (e.g. voidhub-storage)
 *
 * If these are not present the app degrades gracefully: reads return null and
 * writes are no-ops, so the site still runs on default/seed data.
 */

const ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'voidhub-storage'

export const r2Configured = Boolean(
  ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY,
)

/**
 * Local filesystem fallback for development previews when R2 isn't configured.
 * Stores objects under .local-r2/ so admin edits persist while testing.
 * Never used in production — there, missing R2 stays a graceful no-op.
 */
const useLocalFallback = !r2Configured && process.env.NODE_ENV !== 'production'
const LOCAL_DIR = '.local-r2'

function localPath(key: string): string {
  // Flatten the key into a safe filename
  return `${LOCAL_DIR}/${key.replace(/[^a-zA-Z0-9._-]/g, '__')}`
}

async function localGet(key: string): Promise<string | null> {
  try {
    const fs = await import('fs/promises')
    return await fs.readFile(localPath(key), 'utf-8')
  } catch {
    return null
  }
}

async function localPut(key: string, body: string | Uint8Array | Buffer): Promise<boolean> {
  try {
    const fs = await import('fs/promises')
    await fs.mkdir(LOCAL_DIR, { recursive: true })
    await fs.writeFile(localPath(key), body)
    return true
  } catch {
    return false
  }
}

async function localDelete(key: string): Promise<boolean> {
  try {
    const fs = await import('fs/promises')
    await fs.unlink(localPath(key))
    return true
  } catch {
    return false
  }
}

let _client: S3Client | null = null

function client(): S3Client | null {
  if (!r2Configured) return null
  if (_client) return _client
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID!,
      secretAccessKey: SECRET_ACCESS_KEY!,
    },
  })
  return _client
}

async function streamToString(body: unknown): Promise<string> {
  if (!body) return ''
  // Node.js runtime: body is a Readable / has transformToString (SDK v3)
  const anyBody = body as { transformToString?: () => Promise<string> }
  if (typeof anyBody.transformToString === 'function') {
    return anyBody.transformToString()
  }
  const chunks: Buffer[] = []
  for await (const chunk of body as AsyncIterable<Buffer>) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf-8')
}

/** Read a text object from R2. Returns null if missing or R2 unconfigured. */
export async function r2GetText(key: string): Promise<string | null> {
  const c = client()
  if (!c) return useLocalFallback ? localGet(key) : null
  try {
    const res = await c.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    return await streamToString(res.Body)
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name
    if (name === 'NoSuchKey' || name === 'NotFound') return null
    console.error('[v0] r2GetText error for', key, err)
    return null
  }
}

/** Read a binary object from R2 (e.g. uploaded images). Returns null if missing. */
export async function r2GetBytes(key: string): Promise<Buffer | null> {
  const c = client()
  if (!c) {
    if (!useLocalFallback) return null
    try {
      const fs = await import('fs/promises')
      return await fs.readFile(localPath(key))
    } catch {
      return null
    }
  }
  try {
    const res = await c.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    const body = res.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined
    if (body && typeof body.transformToByteArray === 'function') {
      return Buffer.from(await body.transformToByteArray())
    }
    const chunks: Buffer[] = []
    for await (const chunk of res.Body as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name
    if (name === 'NoSuchKey' || name === 'NotFound') return null
    console.error('[v0] r2GetBytes error for', key, err)
    return null
  }
}

/** Read + parse a JSON object from R2. Returns fallback if missing. */
export async function r2GetJSON<T>(key: string, fallback: T): Promise<T> {
  const text = await r2GetText(key)
  if (!text) return fallback
  try {
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

/** Write a text/binary object to R2. No-op if R2 unconfigured. */
export async function r2Put(
  key: string,
  body: string | Uint8Array | Buffer,
  contentType = 'application/octet-stream',
): Promise<boolean> {
  const c = client()
  if (!c) return useLocalFallback ? localPut(key, body) : false
  try {
    await c.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'max-age=0, s-maxage=0, no-store',
      }),
    )
    return true
  } catch (err) {
    console.error('[v0] r2Put error for', key, err)
    return false
  }
}

export async function r2PutJSON(key: string, value: unknown): Promise<boolean> {
  return r2Put(key, JSON.stringify(value, null, 2), 'application/json')
}

export async function r2Delete(key: string): Promise<boolean> {
  const c = client()
  if (!c) return useLocalFallback ? localDelete(key) : false
  try {
    await c.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
    return true
  } catch (err) {
    console.error('[v0] r2Delete error for', key, err)
    return false
  }
}

export interface R2Object {
  key: string
  size: number
  lastModified: string | null
}

export async function r2List(prefix = ''): Promise<R2Object[]> {
  const c = client()
  if (!c) return []
  try {
    const res = await c.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }),
    )
    return (res.Contents || []).map((o) => ({
      key: o.Key || '',
      size: o.Size || 0,
      lastModified: o.LastModified ? o.LastModified.toISOString() : null,
    }))
  } catch (err) {
    console.error('[v0] r2List error for', prefix, err)
    return []
  }
}

export const R2_KEYS = {
  games: 'data/games.json',
  settings: 'data/settings.json',
  activity: 'data/activity.json',
  executorKeys: 'data/executor-keys.json',
  loaderLatest: 'scripts/loader-latest.lua',
  loaderVersion: (ts: number) => `scripts/loader-v${ts}.lua`,
  analyticsHits: 'analytics/loader-hits.jsonl',
}
