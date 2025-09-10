export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import crypto from 'crypto'
import net from 'net'

const RTMPS_PORT = Number(process.env.RTMPS_PORT || 4443)
const RTMP_APP   = process.env.RTMP_APP || 'live'

function domainFrom(req: Request) {
  const env = (process.env.DOMAIN || '').trim()
  if (env) return env
  const host = (req.headers.get('host') || 'localhost').replace(/:.*/, '')
  return host
}

/** Ensure the table exists (and column for older installs) */
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_stream_config (
      id            SERIAL PRIMARY KEY,
      server_url    TEXT,
      stream_key    TEXT NOT NULL,
      meeting_title TEXT,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  await query(`ALTER TABLE admin_stream_config ADD COLUMN IF NOT EXISTS meeting_title TEXT;`)
}

function genKey(len = 32) {
  return crypto.randomBytes(Math.ceil(len/2)).toString('hex').slice(0, len)
}

async function getOrCreateKey(): Promise<string> {
  const r = await query(`SELECT id, stream_key FROM admin_stream_config ORDER BY id ASC LIMIT 1`)
  if (r.rows.length) return r.rows[0].stream_key
  const k = genKey()
  await query(
    `INSERT INTO admin_stream_config (server_url, stream_key) VALUES ($1,$2)`,
    ['__fixed_by_stunnel__', k]
  )
  return k
}

/** tiny TCP check; never throws */
function checkPort(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = new net.Socket()
    const done = (ok:boolean) => { try { sock.destroy() } finally { resolve(ok) } }
    sock.setTimeout(timeoutMs)
    sock.once('connect', () => done(true))
    sock.once('timeout', () => done(false))
    sock.once('error',  () => done(false))
    sock.connect(port, '127.0.0.1')
  })
}

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await ensureTable()
    const server_url = `rtmps://${domainFrom(req)}:${RTMPS_PORT}/${RTMP_APP}`
    const stream_key = await getOrCreateKey()

    const meta = await query(
      `SELECT meeting_title FROM admin_stream_config ORDER BY id ASC LIMIT 1`
    )
    const meeting_title: string = meta.rows[0]?.meeting_title ?? ''

    let rtmps_ok: boolean | null = null
    try { rtmps_ok = await checkPort('127.0.0.1', RTMPS_PORT) } catch { rtmps_ok = null }

    return NextResponse.json({ config: { server_url, stream_key, meeting_title, rtmps_ok } })
  } catch {
    const fallback = `rtmps://${domainFrom(req)}:${RTMPS_PORT}/${RTMP_APP}`
    return NextResponse.json({ config: { server_url: fallback, stream_key: '', meeting_title: '', rtmps_ok: null } })
  }
}

/**
 * PATCH: update meeting_title only (keep server_url locked to stunnel).
 * Body: { "meeting_title": string }
 */
export async function PATCH(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureTable()

  let body: any = {}
  try { body = await req.json() } catch {}
  const raw = typeof body.meeting_title === 'string' ? body.meeting_title : undefined
  if (raw === undefined) {
    return NextResponse.json({ error: 'No updatable fields' }, { status: 400 })
  }

  const title = raw.trim().slice(0, 120) // small safety cap
  const value = title === '' ? null : title

  // ensure there is a row, then update it
  const row = await query(`SELECT id FROM admin_stream_config ORDER BY id ASC LIMIT 1`)
  if (row.rows.length) {
    await query(
      `UPDATE admin_stream_config SET meeting_title=$1, updated_at=now() WHERE id=$2`,
      [value, row.rows[0].id]
    )
  } else {
    // create row if missing
    const k = genKey()
    await query(
      `INSERT INTO admin_stream_config (server_url, stream_key, meeting_title)
       VALUES ($1,$2,$3)`,
      ['__fixed_by_stunnel__', k, value]
    )
  }

  return NextResponse.json({ ok: true, meeting_title: title ?? '' })
}
