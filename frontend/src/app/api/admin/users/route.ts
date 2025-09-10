export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const r = await query(
    'SELECT id, email, display_name, created_at FROM admin_users ORDER BY id ASC'
  )
  return NextResponse.json({ users: r.rows })
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, password, display_name } = await req.json()
  if (!email || !password || !display_name)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (String(password).length < 10)
    return NextResponse.json({ error: 'Password too short (min 10 chars)' }, { status: 400 })

  const hash = await bcrypt.hash(password, 12)
  await query(
    `INSERT INTO admin_users (email, password_hash, display_name)
     VALUES ($1,$2,$3)
     ON CONFLICT (email) DO UPDATE
       SET password_hash=EXCLUDED.password_hash,
           display_name=EXCLUDED.display_name,
           updated_at=now()`,
    [email.trim().toLowerCase(), hash, display_name.trim()]
  )
  return NextResponse.json({ ok: true })
}
