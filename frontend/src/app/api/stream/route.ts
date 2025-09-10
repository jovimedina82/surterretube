// src/app/api/stream/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

const APP = process.env.RTMP_APP || 'live'

// Build absolute HLS base (respects optional HLS_BASE env)
function playbackBase(req: Request) {
  const base = (process.env.HLS_BASE || '').trim()
  if (base) return base.replace(/\/+$/, '')
  const host = req.headers.get('host') || 'localhost'
  return `https://${host}`
}

export async function GET(req: Request) {
  let name = 'webinar'
  let meeting_title = ''

  try {
    // The current stream key + (optional) title set in admin
    const r = await query(
      `SELECT stream_key, COALESCE(meeting_title,'') AS meeting_title
       FROM admin_stream_config
       ORDER BY id ASC LIMIT 1`
    )
    if (r.rows[0]?.stream_key) name = r.rows[0].stream_key
    meeting_title = r.rows[0]?.meeting_title ?? ''
  } catch {
    // ignore and fall back; we still return a usable payload
  }

  const base = playbackBase(req)
  const safe = encodeURIComponent(name)

  // canonical HLS path: /hls/live/<key>.m3u8
  const hls = `${base}/hls/live/${safe}.m3u8`

  return NextResponse.json({
    stream_id: name,
    hls_url: hls,
    app: APP,
    name,
    hls,
    meeting_title,        // <- NEW
  })
}
