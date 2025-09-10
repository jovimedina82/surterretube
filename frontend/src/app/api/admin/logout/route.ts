export const runtime = 'nodejs'
import { NextResponse } from 'next/server'

export async function POST() {
  // delete the admin session cookie
  const res = NextResponse.json({ ok: true })
  res.cookies.set('st_admin', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
