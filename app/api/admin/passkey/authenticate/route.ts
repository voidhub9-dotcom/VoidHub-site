import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KV_KEYS, type PasskeyCredential } from '@/lib/kv'
import { createVerify, createPublicKey } from 'crypto'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

function fromb64url(s: string): Buffer {
  return Buffer.from(s, 'base64url')
}

function getRpId(req: NextRequest): string {
  if (process.env.PASSKEY_RP_ID) return process.env.PASSKEY_RP_ID
  const host = (req.headers.get('host') || new URL(req.url).hostname).split(':')[0]
  return host.startsWith('www.') ? host.slice(4) : host
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { id, rawId, response: credResponse } = body
  const rpId = getRpId(request)

  // Load stored credential
  const storedRaw = await kvGet(KV_KEYS.PASSKEY_CREDENTIAL)
  if (!storedRaw) return NextResponse.json({ ok: false, error: 'No passkey registered' }, { status: 400 })
  const cred: PasskeyCredential = JSON.parse(storedRaw)

  if (cred.id !== rawId && cred.id !== id) {
    return NextResponse.json({ ok: false, error: 'Unknown credential' }, { status: 400 })
  }

  // Verify challenge
  const challengeRaw = await kvGet(KV_KEYS.PASSKEY_CHALLENGE)
  if (!challengeRaw) return NextResponse.json({ ok: false, error: 'No challenge' }, { status: 400 })
  const { challenge: storedChallenge, ts } = JSON.parse(challengeRaw)
  if (Date.now() - ts > 5 * 60 * 1000) return NextResponse.json({ ok: false, error: 'Challenge expired' }, { status: 400 })

  // Verify clientDataJSON
  const clientDataBuf = fromb64url(credResponse.clientDataJSON)
  const clientData = JSON.parse(clientDataBuf.toString('utf8'))
  if (clientData.type !== 'webauthn.get') return NextResponse.json({ ok: false, error: 'Wrong type' }, { status: 400 })
  if (clientData.challenge !== storedChallenge) return NextResponse.json({ ok: false, error: 'Challenge mismatch' }, { status: 400 })

  // Parse authData
  const authDataBuf = fromb64url(credResponse.authenticatorData)
  // Verify rpIdHash (first 32 bytes of authData = SHA-256(rpId))
  const expectedRpIdHash = createHash('sha256').update(rpId).digest()
  if (!authDataBuf.subarray(0, 32).equals(expectedRpIdHash)) {
    return NextResponse.json({ ok: false, error: 'RP ID mismatch' }, { status: 400 })
  }
  const flags = authDataBuf[32]
  const userPresent = (flags & 0x01) !== 0
  if (!userPresent) return NextResponse.json({ ok: false, error: 'User not present' }, { status: 400 })

  const signCountNew = authDataBuf.readUInt32BE(33)
  if (signCountNew !== 0 && signCountNew <= cred.counter) {
    return NextResponse.json({ ok: false, error: 'Sign count replay' }, { status: 400 })
  }

  // Verify signature: sig is over authData || SHA-256(clientDataJSON)
  const clientDataHash = createHash('sha256').update(clientDataBuf).digest()
  const verifyData = Buffer.concat([authDataBuf, clientDataHash])

  const publicKey = createPublicKey({
    key: Buffer.from(cred.publicKey, 'base64'),
    format: 'der', type: 'spki',
  })

  const sigBuf = fromb64url(credResponse.signature)
  const verifier = createVerify('SHA256')
  verifier.update(verifyData)
  const valid = verifier.verify({ key: publicKey, dsaEncoding: 'der' }, sigBuf)

  if (!valid) return NextResponse.json({ ok: false, error: 'Bad signature' }, { status: 401 })

  // Update counter
  cred.counter = signCountNew
  await kvSet(KV_KEYS.PASSKEY_CREDENTIAL, JSON.stringify(cred))

  // Invalidate challenge
  await kvSet(KV_KEYS.PASSKEY_CHALLENGE, JSON.stringify({ challenge: '', ts: 0 }))

  return NextResponse.json({ ok: true })
}
