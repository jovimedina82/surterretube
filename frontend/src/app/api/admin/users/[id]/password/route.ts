export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/lib/auth'

type Params = { params: { id: string } }

export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  const { new_password } = await req.json()
  if (!new_password || String(new_password).length < 10)
    return NextResponse.json({ error: 'Password too short (min 10 chars)' }, { status: 400 })

  const hash = await bcrypt.hash(String(new_password), 12)
  await query('UPDATE admin_users SET password_hash=$2, updated_at=now() WHERE id=$1', [id, hash])
  return NextResponse.json({ ok: true })
}
