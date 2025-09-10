// src/app/api/admin/system/diagnostics/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import net from 'net'

type CheckLevel = 'ok' | 'warn' | 'fail' | 'info'
type Check = {
  id: string
  title: string
  details: string
  level: CheckLevel
}

function domainFrom(req: Request) {
  const env = (process.env.DOMAIN || '').trim()
  if (env) return env
  const host = (req.headers.get('host') || 'localhost').replace(/:.*/, '')
  return host
}

async function ensureDiagnosticsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_diagnostics_log (
      id           BIGSERIAL PRIMARY KEY,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      admin_id     BIGINT,
      domain       TEXT,
      stream_id    TEXT,
      ok_count     INT NOT NULL DEFAULT 0,
      warn_count   INT NOT NULL DEFAULT 0,
      fail_count   INT NOT NULL DEFAULT 0,
      results      JSONB NOT NULL
    )
  `)
}

async function tcpCheck(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = new net.Socket()
    const done = (ok: boolean) => { try { sock.destroy() } finally { resolve(ok) } }
    sock.setTimeout(timeoutMs)
    sock.once('connect', () => done(true))
    sock.once('timeout', () => done(false))
    sock.once('error',  () => done(false))
    sock.connect(port, host)
  })
}

function add(checks: Check[], c: Check) { checks.push(c) }

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureDiagnosticsTable()

  const checks: Check[] = []
  const domain = domainFrom(req)

  // 1) Resolve current stream id (dynamic key in DB)
  let streamId = 'webinar'
  try {
    const r = await query(`SELECT stream_key FROM admin_stream_config ORDER BY id ASC LIMIT 1`)
    streamId = (r.rows[0]?.stream_key || 'webinar').trim()
  } catch {
    // keep default; subsequent checks will still run
  }

  const hlsUrl = `https://${domain}/hls/live/${encodeURIComponent(streamId)}.m3u8`

  // 2) Nginx /healthz
  try {
    const r = await fetch(`https://${domain}/healthz`, { cache: 'no-store' })
    add(checks, {
      id: 'nginx-health',
      title: 'Nginx /healthz',
      details: `GET /healthz -> ${r.status}`,
      level: r.ok ? 'ok' : 'fail',
    })
  } catch (e: any) {
    add(checks, {
      id: 'nginx-health',
      title: 'Nginx /healthz',
      details: `error: ${e?.message || 'fetch failed'}`,
      level: 'fail',
    })
  }

  // 3) Web UI via HTTPS
  try {
    const r = await fetch(`https://${domain}/`, { cache: 'no-store' })
    add(checks, {
      id: 'ui-https',
      title: 'Web UI via HTTPS',
      details: `GET / -> ${r.status}`,
      level: r.ok ? 'ok' : 'fail',
    })
  } catch (e: any) {
    add(checks, {
      id: 'ui-https',
      title: 'Web UI via HTTPS',
      details: `error: ${e?.message || 'fetch failed'}`,
      level: 'fail',
    })
  }

  // 4) RTMPS tunnel TCP:4443 (stunnel)
  try {
    const ok = await tcpCheck('127.0.0.1', Number(process.env.RTMPS_PORT || 4443), 1200)
    add(checks, {
      id: 'rtmps-4443',
      title: 'RTMPS TCP :4443',
      details: ok ? 'port is listening' : 'port is not listening',
      level: ok ? 'ok' : 'fail',
    })
  } catch {
    add(checks, {
      id: 'rtmps-4443',
      title: 'RTMPS TCP :4443',
      details: 'check failed',
      level: 'fail',
    })
  }

  // 5) SRS HTTP :8080 (HLS origin)
  try {
    const ok = await tcpCheck('127.0.0.1', 8080, 1200)
    add(checks, {
      id: 'srs-8080',
      title: 'SRS HTTP :8080',
      details: ok ? 'port is listening' : 'port is not listening',
      level: ok ? 'ok' : 'fail',
    })
  } catch {
    add(checks, {
      id: 'srs-8080',
      title: 'SRS HTTP :8080',
      details: 'check failed',
      level: 'fail',
    })
  }

  // 6) HLS playlist (treat 404 as "offline", not a failure)
  try {
    const r = await fetch(hlsUrl, { method: 'HEAD', cache: 'no-store' })
    add(checks, {
      id: 'hls',
      title: 'HLS playlist',
      details: `${hlsUrl} -> ${r.status}`,
      level: r.status === 200 ? 'ok'
            : r.status === 404 ? 'info' // offline is normal when not live
            : 'warn',
    })
  } catch (e: any) {
    add(checks, {
      id: 'hls',
      title: 'HLS playlist',
      details: `error: ${e?.message || 'request failed'}`,
      level: 'warn',
    })
  }

  // 7) Chat API (local) healthz + proxied /status
  try {
    const r = await fetch('http://127.0.0.1:3001/healthz', { cache: 'no-store' })
    add(checks, {
      id: 'chat-health-local',
      title: 'Chat API /healthz (local)',
      details: `GET -> ${r.status}`,
      level: r.ok ? 'ok' : 'fail',
    })
  } catch (e: any) {
    add(checks, {
      id: 'chat-health-local',
      title: 'Chat API /healthz (local)',
      details: `error: ${e?.message || 'fetch failed'}`,
      level: 'fail',
    })
  }

  try {
    const r = await fetch(`https://${domain}/status?stream_id=${encodeURIComponent(streamId)}`, { cache: 'no-store' })
    add(checks, {
      id: 'chat-status-proxy',
      title: 'Chat API /status (via Nginx)',
      details: `GET /status?stream_id=${streamId} -> ${r.status}`,
      level: r.ok ? 'ok' : 'fail',
    })
  } catch (e: any) {
    add(checks, {
      id: 'chat-status-proxy',
      title: 'Chat API /status (via Nginx)',
      details: `error: ${e?.message || 'fetch failed'}`,
      level: 'fail',
    })
  }

  // 8) Postgres – basic connect + presence of key tables
  try {
    // simple ping
    await query('SELECT 1')

    // table presence, but don’t explode if missing
    const t = await query(`
      SELECT
        COALESCE(to_regclass('public.broadcasts')::text, 'missing') AS broadcasts,
        COALESCE(to_regclass('public.chat_messages')::text, 'missing') AS chat_messages,
        COALESCE(to_regclass('public.admin_stream_config')::text, 'missing') AS admin_stream_config
    `)

    add(checks, {
      id: 'pg-connect',
      title: 'Postgres',
      details: `tables: ${t.rows[0].broadcasts} | ${t.rows[0].chat_messages} | ${t.rows[0].admin_stream_config}`,
      level: 'ok',
    })
  } catch (e: any) {
    add(checks, {
      id: 'pg-connect',
      title: 'Postgres',
      details: `error: ${e?.message || 'query failed'}`,
      level: 'fail',
    })
  }

  // Tally + persist log
  const okCount   = checks.filter(c => c.level === 'ok').length
  const warnCount = checks.filter(c => c.level === 'warn' || c.level === 'info').length
  const failCount = checks.filter(c => c.level === 'fail').length

  await query(
    `INSERT INTO admin_diagnostics_log
       (admin_id, domain, stream_id, ok_count, warn_count, fail_count, results)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      Number(admin.sub) || null,
      domain,
      streamId,
      okCount, warnCount, failCount,
      JSON.stringify({ checks }),
    ]
  )

  return NextResponse.json({
    when: new Date().toISOString(),
    domain,
    stream_id: streamId,
    hls_url: hlsUrl,
    ok: okCount, warn: warnCount, fail: failCount,
    checks,
  })
}
