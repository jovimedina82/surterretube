export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import crypto from 'crypto'

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_stream_config (
      id          SERIAL PRIMARY KEY,
      server_url  TEXT,
      stream_key  TEXT NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
}

function genKey(len = 32) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len)
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await ensureTable()

    const body = await req.json().catch(() => ({})) as { new_key?: string; length?: number }
    let newKey = (body.new_key || '').trim()
    if (!newKey) newKey = genKey(Math.max(12, Math.min(64, Number(body.length) || 32)))

    // Update the first row if it exists; otherwise insert a new row.
    const r = await query(`SELECT id FROM admin_stream_config ORDER BY id ASC LIMIT 1`)
    if (r.rows.length === 0) {
      await query(
        `INSERT INTO admin_stream_config (server_url, stream_key) VALUES ($1,$2)`,
        ['__fixed_by_stunnel__', newKey]
      )
    } else {
      // Safe single-row UPDATE using a CTE
      await query(
        `WITH target AS (SELECT id FROM admin_stream_config ORDER BY id ASC LIMIT 1)
         UPDATE admin_stream_config
            SET stream_key=$1, updated_at=now()
           WHERE id=(SELECT id FROM target)`,
        [newKey]
      )
    }

    return NextResponse.json({ ok: true, stream_key: newKey })
  } catch (e: any) {
    // Return the message so you can see it in the UI
    const msg = e?.message || 'unexpected error'
    return NextResponse.json({ error: `rotate failed: ${msg}` }, { status: 500 })
  }
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const r = await query(`SELECT stream_key FROM admin_stream_config ORDER BY id ASC LIMIT 1`)
  return NextResponse.json({ stream_key: r.rows[0]?.stream_key ?? null })
}
