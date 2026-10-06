import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KV_KEYS, type PasskeyCredential } from '@/lib/kv'
import { createVerify, createPublicKey } from 'crypto'

export const dynamic = 'force-dynamic'

function validAdmin(key: string) {
  const valid = process.env.ADMIN_PASSWORD || 'voidhub123'
  return typeof key === 'string' && key.length > 0 && key === valid
}

function b64url(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString('base64url')
}
function fromb64url(s: string): Buffer {
  return Buffer.from(s, 'base64url')
}

/** Minimal CBOR decoder for the subset WebAuthn uses. */
function decodeCBOR(buf: Buffer): any {
  let offset = 0
  function read(): any {
    const b = buf[offset++]
    const type = (b & 0xe0) >> 5
    const info = b & 0x1f
    const len = info < 24 ? info : info === 24 ? buf[offset++] : info === 25 ? ((buf[offset++] << 8) | buf[offset++]) : (() => { throw new Error('CBOR int too large') })()
    if (type === 0) return len
    if (type === 1) return -1 - len
    if (type === 2) { const v = buf.slice(offset, offset + len); offset += len; return v }
    if (type === 3) { const v = buf.slice(offset, offset + len).toString('utf8'); offset += len; return v }
    if (type === 4) { const arr: any[] = []; for (let i = 0; i < len; i++) arr.push(read()); return arr }
    if (type === 5) { const map: any = {}; for (let i = 0; i < len; i++) { const k = read(); map[k] = read() } return map }
    throw new Error(`Unsupported CBOR type ${type}`)
  }
  return read()
}

export async function POST(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key') || ''
  if (!validAdmin(adminKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, rawId, response: credResponse } = body

  // Verify challenge
  const storedRaw = await kvGet(KV_KEYS.PASSKEY_CHALLENGE)
  if (!storedRaw) return NextResponse.json({ error: 'No challenge found' }, { status: 400 })
  const { challenge: storedChallenge, ts } = JSON.parse(storedRaw)
  if (Date.now() - ts > 5 * 60 * 1000) return NextResponse.json({ error: 'Challenge expired' }, { status: 400 })

  // Verify clientDataJSON
  const clientData = JSON.parse(fromb64url(credResponse.clientDataJSON).toString('utf8'))
  if (clientData.type !== 'webauthn.create') return NextResponse.json({ error: 'Wrong type' }, { status: 400 })
  if (clientData.challenge !== storedChallenge) return NextResponse.json({ error: 'Challenge mismatch' }, { status: 400 })

  // Parse attestationObject to get authData
  const attestationObj = decodeCBOR(fromb64url(credResponse.attestationObject))
  const authData: Buffer = Buffer.from(attestationObj.authData)

  // authData layout: rpIdHash(32) + flags(1) + signCount(4) + [attestedCredentialData...]
  const flags = authData[32]
  const attested = (flags >> 6) & 1
  if (!attested) return NextResponse.json({ error: 'No attested credential data' }, { status: 400 })

  let cursor = 37 // past rpIdHash + flags + signCount
  const signCount = authData.readUInt32BE(33)
  cursor += 4 // already included in 37

  // AAGUID (16 bytes) + credentialIdLength (2) + credentialId
  cursor = 37
  const aaguid = authData.slice(cursor, cursor + 16); cursor += 16
  const credIdLen = authData.readUInt16BE(cursor); cursor += 2
  const credentialId = authData.slice(cursor, cursor + credIdLen); cursor += credIdLen

  // COSE public key
  const coseKey = decodeCBOR(authData.slice(cursor))
  // kty=2 (EC2), alg=-7 (ES256), crv=1 (P-256), x, y
  const x: Buffer = Buffer.from(coseKey[-2])
  const y: Buffer = Buffer.from(coseKey[-3])

  // Build JWK to import as Node crypto public key
  const jwk = {
    kty: 'EC', crv: 'P-256',
    x: b64url(x), y: b64url(y),
  }
  const publicKeyDer = createPublicKey({ key: jwk as any, format: 'jwk' })
    .export({ type: 'spki', format: 'der' })

  const cred: PasskeyCredential = {
    id: rawId,
    publicKey: Buffer.from(publicKeyDer).toString('base64'),
    counter: signCount,
    createdAt: new Date().toISOString(),
  }
  await kvSet(KV_KEYS.PASSKEY_CREDENTIAL, JSON.stringify(cred))

  return NextResponse.json({ ok: true })
}
