// /opt/surterretube/chat/server.js
// server.js - Surterretube Chat + SRS Hooks (CJS)
const http = require('http')
const crypto = require('crypto')
const { URL } = require('url')
const { WebSocketServer } = require('ws')
require('dotenv').config()

const { query, getPool } = require('./db')

const HOST = process.env.HOST || '127.0.0.1'
const PORT = parseInt(process.env.PORT || '3001', 10)
const WS_PATH = process.env.WS_PATH || '/ws'
const DEFAULT_STREAM = process.env.STREAM_ID || 'webinar'

// ---------- helpers ----------
function sendJSON(res, code, obj) {
  try {
    const body = JSON.stringify(obj)
    res.statusCode = code
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(body)
  } catch {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'serialize_failed' }))
  }
}
function parseURL(req) {
  return new URL(req.url, `http://${HOST}:${PORT}`)
}

// Security helper functions
function sanitizeString(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[<>"'&]/g, '').trim().substring(0, 255)
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

function isValidStreamId(str) {
  return typeof str === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(str)
}
async function readBodyJSON(req, maxSize = 1024 * 1024) {
  return await new Promise((resolve) => {
    const chunks = []
    let totalSize = 0
    
    req.on('data', (chunk) => {
      totalSize += chunk.length
      if (totalSize > maxSize) {
        req.destroy()
        return resolve(null)
      }
      chunks.push(chunk)
    })
    
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        const body = Buffer.concat(chunks).toString('utf8')
        const parsed = JSON.parse(body)
        resolve(parsed)
      } catch (err) {
        console.warn('JSON parse error:', err.message)
        resolve(null)
      }
    })
    
    req.on('error', () => resolve(null))
  })
}

// Resolve stream_id from param, otherwise pick the most recent LIVE broadcast,
// otherwise fall back to DEFAULT_STREAM.
async function resolveStreamId(param) {
  if (param && param.trim()) return param.trim()
  try {
    const r = await query(
      `SELECT stream_id
         FROM broadcasts
        WHERE ended_at IS NULL
        ORDER BY started_at DESC
        LIMIT 1`
    )
    if (r.rows[0]?.stream_id) return r.rows[0].stream_id
  } catch {}
  return DEFAULT_STREAM
}

// ---------- OIDC (optional) ----------
const OIDC = {
  enabled: !!(process.env.OIDC_ISSUER && process.env.OIDC_AUDIENCE && process.env.OIDC_JWKS_URI),
  verify: null,
}
;(async () => {
  if (!OIDC.enabled) {
    console.log('[OIDC] disabled')
    return
  }
  try {
    const jose = await import('jose')
    const JWKS = jose.createRemoteJWKSet(new URL(process.env.OIDC_JWKS_URI))
    const ISSUER = process.env.OIDC_ISSUER
    const AUD = process.env.OIDC_AUDIENCE
    OIDC.verify = async (token) => {
      const { payload } = await jose.jwtVerify(token, JWKS, { issuer: ISSUER, audience: AUD })
      return payload
    }
    console.log('[OIDC] enabled')
  } catch (e) {
    console.warn('[OIDC] failed to initialize, continuing without verification:', e?.message || e)
    OIDC.enabled = false
    OIDC.verify = null
  }
})()

// ---------- DB helpers ----------
async function getLiveBroadcastId(stream_id) {
  const r = await query(
    `SELECT id FROM broadcasts
      WHERE stream_id=$1 AND ended_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1`,
    [stream_id]
  )
  return r.rows[0]?.id || null
}
async function getLatestBroadcastId(stream_id) {
  const r = await query(
    `SELECT id FROM broadcasts
      WHERE stream_id=$1
      ORDER BY started_at DESC
      LIMIT 1`,
    [stream_id]
  )
  return r.rows[0]?.id || null
}
async function getLiveBroadcast(stream_id) {
  const r = await query(
    `SELECT id, started_at FROM broadcasts
     WHERE stream_id=$1 AND ended_at IS NULL
     ORDER BY started_at DESC
     LIMIT 1`,
    [stream_id]
  )
  return r.rows[0] || null
}
async function getReactionCounts(broadcast_id) {
  const r = await query(
    `SELECT kind, COUNT(*)::int AS n
     FROM reactions
     WHERE broadcast_id=$1
     GROUP BY kind`, [broadcast_id]
  )
  const out = { like: 0, heart: 0, dislike: 0 }
  for (const row of r.rows) out[row.kind] = row.n
  return out
}

// ---------- WS room map (must be above router so HTTP can broadcast) ----------
/** Map<stream_id, Set<WebSocket>> */
const room = globalThis.__st_chat_room ?? new Map();
globalThis.__st_chat_room = room;
function joinRoom(stream_id, ws) {
  if (!room.has(stream_id)) room.set(stream_id, new Set())
  room.get(stream_id).add(ws)
  ws.on('close', () => {
    room.get(stream_id)?.delete(ws)
    if (room.get(stream_id)?.size === 0) room.delete(stream_id)
  })
}

// ---------- HTTP server ----------
const server = http.createServer(async (req, res) => {
  const url = parseURL(req)

  // Health
  if (req.method === 'GET' && url.pathname === '/healthz') {
    try {
      await getPool().query('SELECT 1')
      return sendJSON(res, 200, { ok: true })
    } catch (e) {
      return sendJSON(res, 500, { ok: false, db: 'down' })
    }
  }

  // SRS hooks
  if (req.method === 'POST' && url.pathname === '/srs/publish') {
    const body = await readBodyJSON(req)
    if (!body) return sendJSON(res, 400, { error: 'invalid_json' })
    const stream_id = body.stream || body.stream_id || DEFAULT_STREAM
    try {
      let bid = await getLiveBroadcastId(stream_id)
      if (!bid) {
        const ins = await query(
          `INSERT INTO broadcasts(stream_id) VALUES ($1) RETURNING id`,
          [stream_id]
        )
        bid = ins.rows[0].id
      }
      return sendJSON(res, 200, { code: 0, stream_id, broadcast_id: bid })
    } catch (e) {
      console.error('publish error', e)
      return sendJSON(res, 500, { error: 'db_error' })
    }
  }

  if (req.method === 'POST' && url.pathname === '/srs/unpublish') {
    const body = await readBodyJSON(req)
    if (!body) return sendJSON(res, 400, { error: 'invalid_json' })
    const stream_id = body.stream || body.stream_id || DEFAULT_STREAM
    try {
      const upd = await query(
        `UPDATE broadcasts SET ended_at = NOW()
          WHERE id = (
            SELECT id FROM broadcasts
            WHERE stream_id=$1 AND ended_at IS NULL
            ORDER BY started_at DESC
            LIMIT 1
          )`,
        [stream_id]
      )
      return sendJSON(res, 200, { code: 0, stream_id, updated: upd.rowCount })
    } catch (e) {
      console.error('unpublish error', e)
      return sendJSON(res, 500, { error: 'db_error' })
    }
  }

  // DVR webhook - automatically add recorded videos to database
  if (req.method === 'POST' && url.pathname === '/srs/dvr') {
    const body = await readBodyJSON(req)
    if (!body) return sendJSON(res, 400, { error: 'invalid_json' })

    console.log('DVR webhook received:', JSON.stringify(body))

    try {
      const fs = require('fs')
      const path = require('path')

      // Extract file path from webhook
      const filePath = body.file || body.cwd
      if (!filePath) {
        console.error('DVR webhook missing file path')
        return sendJSON(res, 200, { code: 0, message: 'no_file_path' })
      }

      // Get just the filename
      const filename = path.basename(filePath)

      // Check if file exists and get stats
      let stats
      try {
        stats = fs.statSync(filePath)
      } catch (err) {
        console.error('DVR file not found:', filePath, err)
        return sendJSON(res, 200, { code: 0, message: 'file_not_found' })
      }

      // Extract display name from filename (remove timestamp and extension)
      // Format: live/stream_20231111_123456.mp4 -> stream
      let displayName = filename
        .replace(/^live[_\/]/, '')  // Remove live/ or live_
        .replace(/_\d{8}_\d{6}\.mp4$/, '')  // Remove _YYYYMMDD_HHMMSS.mp4
        .replace(/\.mp4$/i, '')  // Remove .mp4

      // Check if video already exists
      const existing = await query(
        'SELECT id FROM admin_videos WHERE filename = $1',
        [filename]
      )

      if (existing.rows.length > 0) {
        console.log('DVR video already in database:', filename)
        return sendJSON(res, 200, { code: 0, message: 'already_exists', id: existing.rows[0].id })
      }

      // Insert into database as unpublished
      const result = await query(
        `INSERT INTO admin_videos
          (filename, display_name, size_bytes, uploaded_at, is_published)
        VALUES ($1, $2, $3, $4, false)
        RETURNING id`,
        [filename, displayName, stats.size, new Date(stats.mtime)]
      )

      const videoId = result.rows[0].id
      console.log(`DVR video added to database: ${filename} (ID: ${videoId}, unpublished)`)

      return sendJSON(res, 200, { code: 0, message: 'video_added', id: videoId, filename })
    } catch (e) {
      console.error('DVR webhook error:', e)
      return sendJSON(res, 500, { error: 'db_error', details: e.message })
    }
  }

  if (req.method === 'POST' && url.pathname === '/srs/hls') {
    return sendJSON(res, 200, { code: 0 })
  }
  if ((req.method === 'GET' || req.method === 'POST') && url.pathname === '/srs/hls_notify') {
    return sendJSON(res, 200, { code: 0 })
  }

  // Status: live? + watchers
  if (req.method === 'GET' && url.pathname === '/status') {
    try {
      const stream_id = await resolveStreamId(url.searchParams.get('stream_id'))
      const bid = await getLiveBroadcastId(stream_id)
      const watchers = (room.get(stream_id) || new Set()).size
      return sendJSON(res, 200, {
        stream_id,
        live: !!bid,
        broadcast_id: bid || null,
        watchers,
        viewers: watchers, // alias for compatibility
      })
    } catch (e) {
      console.error('status error', e)
      return sendJSON(res, 500, { error: 'db_error' })
    }
  }

  // Stats: current viewers + started_at (per stream)
  if (req.method === 'GET' && url.pathname === '/stats') {
    try {
      const stream_id = await resolveStreamId(url.searchParams.get('stream_id'))
      const live = await getLiveBroadcast(stream_id)
      const viewers = (room.get(stream_id) || new Set()).size
      return sendJSON(res, 200, {
        stream_id,
        live: !!live,
        broadcast_id: live?.id || null,
        started_at: live?.started_at || null,
        viewers,
      })
    } catch (e) {
      console.error('stats error', e)
      return sendJSON(res, 500, { error: 'db_error' })
    }
  }

  // Chat history for current (if live) or latest broadcast
  if (req.method === 'GET' && url.pathname === '/chat/history') {
    try {
      const stream_id = await resolveStreamId(url.searchParams.get('stream_id'))
      const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get('limit') || '50', 10)))
      let bid = await getLiveBroadcastId(stream_id)
      if (!bid) bid = await getLatestBroadcastId(stream_id)
      if (!bid) return sendJSON(res, 200, { stream_id, messages: [] })

      const r = await query(
        `SELECT id, user_name, text, sent_at
           FROM chat_messages
          WHERE broadcast_id=$1
          ORDER BY id DESC
          LIMIT $2`,
        [bid, limit]
      )
      return sendJSON(res, 200, { stream_id, broadcast_id: bid, messages: r.rows })
    } catch (e) {
      console.error('history error', e)
      return sendJSON(res, 500, { error: 'db_error' })
    }
  }

  // Reactions
  if (url.pathname === '/reactions' && req.method === 'POST') {
    try {
      const body = await readBodyJSON(req)
      if (!body) return sendJSON(res, 400, { error: 'invalid_json' })
      const stream_id = sanitizeString(body.stream_id || DEFAULT_STREAM)
      const kind = sanitizeString(body.kind || '')
      if (!['like','heart','dislike'].includes(kind)) {
        return sendJSON(res, 400, { error: 'bad_kind' })
      }
      let bid = await getLiveBroadcastId(stream_id)
      if (!bid) bid = await getLatestBroadcastId(stream_id)
      if (!bid) return sendJSON(res, 409, { error: 'no_broadcast' })

      await query(
        `INSERT INTO reactions(broadcast_id, stream_id, user_sub, kind)
         VALUES ($1,$2,$3,$4)`,
        [bid, stream_id, null, kind]
      )
      const counts = await getReactionCounts(bid)
      for (const client of room.get(stream_id) || []) {
        if (client.readyState === 1) client.send(JSON.stringify({
          type: 'reaction', stream_id, broadcast_id: bid, kind, counts
        }))
      }
      return sendJSON(res, 200, { stream_id, broadcast_id: bid, counts })
    } catch (e) {
      console.error('reaction post error', e)
      return sendJSON(res, 500, { error: 'db_error' })
    }
  }
  if (url.pathname === '/reactions' && req.method === 'GET') {
    try {
      const stream_id = await resolveStreamId(url.searchParams.get('stream_id'))
      let bid = await getLiveBroadcastId(stream_id)
      if (!bid) bid = await getLatestBroadcastId(stream_id)
      if (!bid) return sendJSON(res, 200, { stream_id, counts: { like:0, heart:0, dislike:0 } })
      const counts = await getReactionCounts(bid)
      return sendJSON(res, 200, { stream_id, broadcast_id: bid, counts })
    } catch (e) {
      console.error('reaction get error', e)
      return sendJSON(res, 500, { error: 'db_error' })
    }
  }

  // 404
  return sendJSON(res, 404, { error: 'not_found' })
})

// ---------- WebSocket chat ----------
const wss = new WebSocketServer({ server, path: WS_PATH })

async function verifyAuthFromReq(req) {
  const u = new URL(req.url, `http://${HOST}:${PORT}`)
  const header = req.headers['authorization']
  const token = (header && header.startsWith('Bearer ')) ? header.slice(7) : (u.searchParams.get('token') || '')
  if (OIDC.enabled && token) {
    try {
      const payload = await OIDC.verify(token)
      return {
        sub: payload.sub || null,
        name: payload.name || payload.preferred_username || payload.email || 'user',
      }
    } catch {
      return { sub: null, name: 'guest' }
    }
  }
  return { sub: null, name: 'guest' }
}

wss.on('connection', async (ws, req) => {
  const u = new URL(req.url, `http://${HOST}:${PORT}`)
  const stream_id = u.searchParams.get('stream_id') || DEFAULT_STREAM
  const user = await verifyAuthFromReq(req)
  const anonSuffix = crypto.randomBytes(3).toString('hex')
  const displayName = user.name || `guest-${anonSuffix}`

  joinRoom(stream_id, ws)

  let bid = await getLiveBroadcastId(stream_id)
  ws.send(JSON.stringify({
    type: 'hello',
    stream_id,
    live: !!bid,
    broadcast_id: bid || null,
    user: { name: displayName },
  }))

  ws.on('message', async (data) => {
    let msg
    try { msg = JSON.parse(String(data)) } catch { return }
    if (!msg || msg.type !== 'chat') return

    let liveBid = await getLiveBroadcastId(stream_id)
    if (!liveBid) {
      ws.send(JSON.stringify({ type: 'chat_closed', reason: 'stream_offline' }))
      return
    }

    const rawText = (msg.text || '').toString().trim()
    if (!rawText) return
    if (rawText.length > 500) {
      ws.send(JSON.stringify({ type: 'error', reason: 'message_too_long' }))
      return
    }
    
    // Basic XSS protection - escape HTML entities
    const text = escapeHtml(rawText)
    
    // Additional validation - block potentially malicious patterns
    const dangerousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /vbscript:/i,
      /data:/i,
      /onclick/i,
      /onerror/i,
      /onload/i
    ]
    
    if (dangerousPatterns.some(pattern => pattern.test(text))) {
      ws.send(JSON.stringify({ type: 'error', reason: 'message_blocked' }))
      return
    }

    try {
      const ins = await query(
        `INSERT INTO chat_messages(broadcast_id, stream_id, user_sub, user_name, text)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id, sent_at`,
        [liveBid, stream_id, user.sub, displayName, text]
      )
      const payload = {
        type: 'chat',
        id: ins.rows[0].id,
        stream_id,
        broadcast_id: liveBid,
        user_name: displayName,
        text,
        sent_at: ins.rows[0].sent_at,
      }
      for (const client of room.get(stream_id) || []) {
        if (client.readyState === 1) client.send(JSON.stringify(payload))
      }
    } catch (e) {
      console.error('ws insert error', e)
      ws.send(JSON.stringify({ type: 'error', reason: 'db_error' }))
    }
  })
})

// ---------- start ----------
server.listen(PORT, HOST, () => {
  console.log(`Chat+Hooks server listening on http://${HOST}:${PORT}`)
  console.log(`WS path: ${WS_PATH}`)
})
