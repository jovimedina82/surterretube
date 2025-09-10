export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/lib/auth'

export async function POST(req: Request) {
  const me = await requireAdmin()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { current_password, new_password } = await req.json()
  if (!current_password || !new_password)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (String(new_password).length < 10)
    return NextResponse.json({ error: 'Password too short (min 10 chars)' }, { status: 400 })

  const r = await query('SELECT password_hash FROM admin_users WHERE id=$1', [Number(me.sub)])
  if (r.rowCount === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const ok = await bcrypt.compare(String(current_password), r.rows[0].password_hash)
  if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })

  const hash = await bcrypt.hash(String(new_password), 12)
  await query('UPDATE admin_users SET password_hash=$2, updated_at=now() WHERE id=$1', [Number(me.sub), hash])
  return NextResponse.json({ ok: true })
}
