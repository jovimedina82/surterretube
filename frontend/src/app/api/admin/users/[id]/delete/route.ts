export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

type Ctx = { params: { id: string } }

export async function POST(_req: Request, { params }: Ctx) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })

  // Block deleting yourself
  if (admin.sub && Number(admin.sub) === id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 })
  }

  await query('DELETE FROM admin_users WHERE id=$1', [id])
  return NextResponse.json({ ok: true })
}
