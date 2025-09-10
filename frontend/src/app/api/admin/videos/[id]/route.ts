// ==============================================
// 3) /opt/surterretube/frontend/src/app/api/admin/videos/[id]/route.ts
//    Rename (PATCH) and Delete (DELETE) a video (admin-only)
// ==============================================
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse as NextResponse2 } from 'next/server'
import { query as query2 } from '@/lib/db'
import { requireAdmin as requireAdmin2 } from '@/lib/auth'
import fs2 from 'fs'
import path2 from 'path'

const VOD_DIR2 = process.env.VOD_DIR || '/mnt/media/vod'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin2()
  if (!admin) return NextResponse2.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse2.json({ error: 'Bad id' }, { status: 400 })

  try {
    const body = await req.json().catch(()=>({}))
    const raw = typeof body.display_name === 'string' ? body.display_name : ''
    const display = raw.trim().slice(0, 200)
    if (!display) return NextResponse2.json({ error: 'Missing display_name' }, { status: 400 })

    await query2(`UPDATE public.admin_videos SET display_name=$2 WHERE id=$1`, [id, display])
    return NextResponse2.json({ ok: true })
  } catch (e:any) {
    return NextResponse2.json({ error: e?.message || 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin2()
  if (!admin) return NextResponse2.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse2.json({ error: 'Bad id' }, { status: 400 })

  try {
    // get filenames, delete files, then row
    const r = await query2(`SELECT filename, thumb_filename FROM public.admin_videos WHERE id=$1`, [id])
    const fname = r.rows[0]?.filename as string | undefined
    const tname = r.rows[0]?.thumb_filename as string | undefined
    if (fname) { try { await fs2.promises.unlink(path2.join(VOD_DIR2, fname)) } catch {} }
    if (tname) { try { await fs2.promises.unlink(path2.join(VOD_DIR2, 'thumbs', tname)) } catch {} }
    await query2(`DELETE FROM public.admin_videos WHERE id=$1`, [id])
    return NextResponse2.json({ ok: true })
  } catch (e:any) {
    return NextResponse2.json({ error: e?.message || 'Delete failed' }, { status: 500 })
  }
}