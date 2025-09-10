// /opt/surterretube/frontend/src/app/api/admin/login/route.ts
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
export const runtime = 'nodejs'


export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return NextResponse.json({ error: 'Missing creds' }, { status: 400 })

    const r = await query('SELECT id, email, password_hash, display_name FROM admin_users WHERE email=$1', [email])
    if (r.rowCount === 0) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    const u = r.rows[0]
    const ok = await bcrypt.compare(password, u.password_hash)
    if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!)
    const token = await new SignJWT({
      sub: String(u.id),
      email: u.email,
      name: u.display_name,
      role: 'admin',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(secret)

    const res = NextResponse.json({ ok: true })
    res.cookies.set('st_admin', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 8,
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
