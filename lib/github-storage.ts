/**
 * File storage backend — now powered by Cloudflare R2.
 *
 * This module keeps the exact same API surface as the old GitHub-based
 * storage (`githubGet`, `githubSet`, `getFile`, `saveFile`) so all existing
 * API routes work unchanged, but everything is stored in your R2 bucket
 * under the `files/` prefix.
 *
 * Required env vars (Vercel → Settings → Environment Variables):
 *   CLOUDFLARE_R2_ACCOUNT_ID
 *   CLOUDFLARE_R2_ACCESS_KEY_ID
 *   CLOUDFLARE_R2_SECRET_ACCESS_KEY
 *   CLOUDFLARE_R2_BUCKET_NAME
 */

import { r2GetText, r2Put } from './r2'

const PREFIX = 'files/'

function keyFor(path: string): string {
  return PREFIX + path.replace(/^\/+/, '')
}

/**
 * Read a file from R2.
 * - `.json` files are parsed and returned as objects/arrays.
 * - everything else is returned as a raw string.
 * Returns null when the file does not exist or R2 is not configured.
 */
export async function githubGet(path: string): Promise<any> {
  const text = await r2GetText(keyFor(path))
  if (text === null) return null

  if (path.endsWith('.json')) {
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  }
  return text
}

/**
 * Write a file to R2.
 * Objects/arrays are serialized as pretty JSON; strings are stored as-is.
 */
export async function githubSet(path: string, content: any): Promise<void> {
  const isString = typeof content === 'string'
  const body = isString ? content : JSON.stringify(content, null, 2)
  const contentType = path.endsWith('.json')
    ? 'application/json'
    : path.endsWith('.lua')
      ? 'text/plain'
      : 'text/plain'

  const ok = await r2Put(keyFor(path), body, contentType)
  if (!ok) {
    throw new Error(
      `R2 storage is not configured or the write failed for "${path}". ` +
        'Set CLOUDFLARE_R2_* environment variables in Vercel.',
    )
  }
}

// Aliases kept for backwards compatibility with existing routes.
export const getFile = githubGet
export const saveFile = githubSet
