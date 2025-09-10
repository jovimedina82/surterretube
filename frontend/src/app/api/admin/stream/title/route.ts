// src/app/api/admin/stream/title/route.ts
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const raw = typeof body?.meeting_title === 'string' ? body.meeting_title : ''
    const meeting_title = raw.trim().slice(0, 120) // soft limit

    await query(
      `UPDATE admin_stream_config
         SET meeting_title = $1
       WHERE id = (SELECT id FROM admin_stream_config ORDER BY id ASC LIMIT 1)`,
      [meeting_title]
    )

    // Return the full current config so UI can refresh
    const r = await query(
      `SELECT stream_key, meeting_title,
              COALESCE(server_url, '') AS server_url
         FROM admin_stream_config
        ORDER BY id ASC LIMIT 1`
    )
    return NextResponse.json({ ok: true, config: r.rows[0] })
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e?.message || 'update failed' }, { status: 500 })
  }
}
