export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const me = await requireAdmin()
  if (!me) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true, user: me })
}
