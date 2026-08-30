import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Server-side password check. The single source of truth is the
// ADMIN_PASSWORD environment variable (set in Vercel / .env.local).
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    const valid = process.env.ADMIN_PASSWORD || 'voidhub123'

    if (typeof password === 'string' && password.length > 0 && password === valid) {
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ ok: false, error: 'Invalid password' }, { status: 401 })
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 })
  }
}
