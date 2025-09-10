// src/app/api/viewers/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'

const CHAT_BASE =
  process.env.CHAT_API_URL?.replace(/\/+$/, '') || 'http://127.0.0.1:3001'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const stream_id = url.searchParams.get('stream_id') || 'webinar'

    // Ask the local Chat API for current status
    const r = await fetch(`${CHAT_BASE}/status`, { cache: 'no-store' })
    const j = r.ok ? await r.json().catch(() => ({})) : {}

    // Be flexible about field names:
    const live =
      !!(j.live ?? j?.status?.live ?? j?.isLive ?? j?.online ?? false)

    const viewersNum =
      Number(
        j.viewers ??
        j.watchers ??
        j.clients ??
        j.connections ??
        j.count ??
        0
      ) || 0

    return NextResponse.json({ stream_id, live, viewers: viewersNum })
  } catch {
    return NextResponse.json({ stream_id: 'unknown', live: false, viewers: 0 })
  }
}
