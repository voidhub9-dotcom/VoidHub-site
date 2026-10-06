import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KV_KEYS } from '@/lib/kv'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

const RP_NAME = process.env.PASSKEY_RP_NAME || 'VoidHub Admin'

function getRpId(req: NextRequest): string {
  if (process.env.PASSKEY_RP_ID) return process.env.PASSKEY_RP_ID
  // Derive from the actual request host so it works on any domain without config
  const host = req.headers.get('host') || new URL(req.url).hostname
  return host.split(':')[0] // strip port if present
}

function adminKey(req: NextRequest) {
  return req.headers.get('x-admin-key') || ''
}
function validAdmin(key: string) {
  const valid = process.env.ADMIN_PASSWORD || 'voidhub123'
  return typeof key === 'string' && key.length > 0 && key === valid
}

/** GET — returns options for either register or authenticate. */
export async function GET(request: NextRequest) {
  const mode = new URL(request.url).searchParams.get('mode') || 'authenticate'
  const RP_ID = getRpId(request)

  if (mode === 'register' && !validAdmin(adminKey(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const challenge = randomBytes(32).toString('base64url')
  // Store challenge with a 5-minute TTL (simulated via timestamp)
  await kvSet(KV_KEYS.PASSKEY_CHALLENGE, JSON.stringify({ challenge, ts: Date.now() }))

  if (mode === 'register') {
    // Check if a credential already exists
    const existing = await kvGet(KV_KEYS.PASSKEY_CREDENTIAL)
    return NextResponse.json({
      challenge,
      rp: { id: RP_ID, name: RP_NAME },
      user: { id: 'admin', name: 'admin', displayName: 'VoidHub Admin' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },  // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
      excludeCredentials: existing
        ? [{ id: JSON.parse(existing).id, type: 'public-key' }]
        : [],
    })
  }

  // authenticate mode
  const existing = await kvGet(KV_KEYS.PASSKEY_CREDENTIAL)
  return NextResponse.json({
    challenge,
    timeout: 60000,
    userVerification: 'preferred',
    rpId: RP_ID,
    allowCredentials: existing
      ? [{ id: JSON.parse(existing).id, type: 'public-key' }]
      : [],
  })
}
