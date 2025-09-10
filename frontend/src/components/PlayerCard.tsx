'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import EventsModal from './EventsModal'

/** --- Config / endpoints --- */
const STREAM_API = '/api/stream' // -> { stream_id, hls, meeting_title? }
const STATS_URLS = ['/stats', process.env.NEXT_PUBLIC_STATS_URL, '/status']
  .filter(Boolean) as string[]
const REACTIONS_URL = process.env.NEXT_PUBLIC_REACTIONS_URL || '/reactions'
const MEETING_NAME_FALLBACK =
  process.env.NEXT_PUBLIC_STREAM_TITLE ||
  process.env.NEXT_PUBLIC_MEETING_NAME ||
  'Tuesday Meeting'
const CHAT_DEBUG = process.env.NEXT_PUBLIC_CHAT_DEBUG === '1'
const REACTIONS_BOTTOM = '3.75rem';  // move up/down by changing this value

/** --- Types --- */
type StreamApi = {
  stream_id: string
  hls?: string
  meeting_title?: string
  name?: string
}
type Stats = {
  stream_id: string
  live: boolean
  started_at?: string | null
  broadcast_id?: number | null
  viewers: number
}
type ReactionCounts = { like: number; heart: number; dislike: number }
type ReactionKind = keyof ReactionCounts
type StreamEvent = {
  id: number
  name: string
  event_date: string
}

/** --- Small helpers --- */
function formatEventMessage(event: StreamEvent): string {
  const eventDate = new Date(event.event_date)
  const today = new Date()
  const isToday = eventDate.toDateString() === today.toDateString()
  
  const formattedDate = eventDate.toLocaleDateString('en-US', { 
    month: '2-digit', 
    day: '2-digit',
    year: '2-digit'
  })
  
  if (isToday) {
    return event.name
  } else {
    return `Next event will be ${event.name} on ${formattedDate}`
  }
}

function fmtUptime(start?: string | null, nowMs = Date.now()) {
  if (!start) return ''
  const ms = nowMs - new Date(start).getTime()
  if (ms < 0) return ''
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600).toString().padStart(2, '0')
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
  const ss = Math.floor(s % 60).toString().padStart(2, '0')
  return `${h}:${m}:${ss}`
}

/** --- Presence (viewer heartbeat only while playing) --- */
function ensureClientId(): string {
  try {
    const k = 'st.cid'
    const existing = window.localStorage.getItem(k)
    if (existing) return existing
    const newCid: string =
      ((globalThis as any).crypto?.randomUUID?.() as string | undefined) ??
      Math.random().toString(36).slice(2)
    window.localStorage.setItem(k, newCid)
    return newCid
  } catch {
    return Math.random().toString(36).slice(2)
  }
}
function isActuallyPlaying(v: HTMLVideoElement | null | undefined): boolean {
  return !!v && !v.paused && !v.ended && v.readyState >= 2 && v.playbackRate > 0
}
/** POST /presence/beat every 10s while <video> is playing & tab is visible */
function usePlaybackPresence(streamId: string, videoRef: React.RefObject<HTMLVideoElement>) {
  useEffect(() => {
    if (!streamId) return
    const cid = ensureClientId()
    let timer: any = null
    let visible = document.visibilityState === 'visible'

    const beat = () => {
      try {
        const payload = JSON.stringify({ stream_id: streamId, client_id: cid })
        if ('sendBeacon' in navigator) {
          navigator.sendBeacon('/presence/beat', new Blob([payload], { type: 'application/json' }))
        } else {
          fetch('/presence/beat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
          })
        }
      } catch {}
    }

    const start = () => {
      const v = videoRef.current
      if (!v || !visible || !isActuallyPlaying(v) || timer) return
      beat()
      timer = setInterval(beat, 10_000)
    }
    const stop = () => { if (timer) { clearInterval(timer); timer = null } }

    const onPlayLike = () => start()
    const onPauseLike = () => stop()
    const onVisibility = () => { visible = (document.visibilityState === 'visible'); visible ? start() : stop() }

    const v = videoRef.current
    if (v) {
      v.addEventListener('play', onPlayLike)
      v.addEventListener('playing', onPlayLike)
      v.addEventListener('pause', onPauseLike)
      v.addEventListener('ended', onPauseLike)
      v.addEventListener('seeking', onPauseLike)
      if (isActuallyPlaying(v)) start()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', stop)
    window.addEventListener('beforeunload', stop)

    return () => {
      stop()
      if (v) {
        v.removeEventListener('play', onPlayLike)
        v.removeEventListener('playing', onPlayLike)
        v.removeEventListener('pause', onPauseLike)
        v.removeEventListener('ended', onPauseLike)
        v.removeEventListener('seeking', onPauseLike)
      }
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', stop)
      window.removeEventListener('beforeunload', stop)
    }
  }, [streamId, videoRef])
}

/** --- Hooks --- */
function useStreamMeta() {
  const [meta, setMeta] = useState<{ id: string; name: string; hls: string }>({
    id: 'webinar',
    name: MEETING_NAME_FALLBACK,
    hls: `/hls/live/webinar.m3u8`,
  })

  useEffect(() => {
    let stop = false
    const pull = async () => {
      try {
        const r = await fetch(STREAM_API, { cache: 'no-store' })
        if (!r.ok) throw new Error('meta !ok')
        const j: StreamApi = await r.json()
        if (j?.stream_id) {
          const hls = j.hls || `/hls/live/${encodeURIComponent(j.stream_id)}.m3u8`
          const displayName = j.meeting_title?.trim() || j.name?.trim() || MEETING_NAME_FALLBACK
          if (!stop) setMeta({ id: j.stream_id, name: displayName, hls })
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('st.stream_id', j.stream_id)
            sessionStorage.setItem('st.hls', hls)
            sessionStorage.setItem('st.name', displayName)
          }
        }
      } catch {
        if (typeof window !== 'undefined') {
          const id = sessionStorage.getItem('st.stream_id') || meta.id
          const hls = sessionStorage.getItem('st.hls') || meta.hls
          const name = sessionStorage.getItem('st.name') || meta.name
          if (!stop) setMeta({ id, hls, name })
        }
      }
    }
    pull()
    const t = setInterval(pull, 15000)
    return () => { stop = true; clearInterval(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return meta
}

function useStreamStats(streamId: string) {
  const [stats, setStats] = useState<Stats>({
    stream_id: streamId,
    live: false,
    started_at: null,
    broadcast_id: null,
    viewers: 0,
  })

  useEffect(() => {
    let canceled = false
    const poll = async () => {
      for (const base of STATS_URLS) {
        try {
          const u = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
          u.searchParams.set('stream_id', streamId)
          const r = await fetch(u.toString(), { cache: 'no-store' })
          if (!r.ok) continue
          const j = await r.json()
          const s: Stats = {
            stream_id: j.stream_id || streamId,
            live: !!(j.live ?? j?.status?.live ?? j?.isLive),
            started_at: j.started_at || j?.startedAt || null,
            broadcast_id: j.broadcast_id ?? j?.broadcastId ?? null,
            viewers: Number(j.viewers ?? j.watchers ?? j.clients ?? 0),
          }
          if (!canceled) setStats(s)
          return
        } catch { /* try next */ }
      }
    }
    poll()
    const t = setInterval(poll, 5000)
    return () => { canceled = true; clearInterval(t) }
  }, [streamId])

  return stats
}

function useReactions(streamId: string) {
  const [counts, setCounts] = useState<ReactionCounts>({ like: 0, heart: 0, dislike: 0 })
  const lastSendRef = useRef(0)

  const load = useCallback(async () => {
    try {
      const u = new URL(REACTIONS_URL, location.origin)
      u.searchParams.set('stream_id', streamId)
      const r = await fetch(u.toString(), { cache: 'no-store' })
      if (!r.ok) return
      const j = await r.json()
      const c = j?.counts || {}
      setCounts({ like: c.like || 0, heart: c.heart || 0, dislike: c.dislike || 0 })
    } catch {}
  }, [streamId])

  const send = useCallback(async (kind: ReactionKind) => {
    const now = Date.now()
    if (now - lastSendRef.current < 400) return
    lastSendRef.current = now
    setCounts(c => ({ ...c, [kind]: (c as any)[kind] + 1 }))
    try {
      const r = await fetch(REACTIONS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream_id: streamId, kind }),
      })
      if (r.ok) {
        const j = await r.json()
        if (j?.counts) {
          setCounts({
            like: j.counts.like || 0,
            heart: j.counts.heart || 0,
            dislike: j.counts.dislike || 0,
          })
        }
      }
    } catch {}
  }, [streamId])

  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [load])

  return { counts, send }
}

function useUpcomingEvents() {
  const [nextEvent, setNextEvent] = useState<StreamEvent | null>(null)
  
  useEffect(() => {
    let canceled = false
    
    const fetchEvents = async () => {
      try {
        const r = await fetch('/api/events/upcoming', { cache: 'no-store' })
        if (!r.ok) return
        const j = await r.json()
        const events = j.events || []
        if (!canceled && events.length > 0) {
          setNextEvent(events[0]) // Get the soonest event
        }
      } catch (e) {
        console.error('Failed to fetch upcoming events:', e)
      }
    }
    
    fetchEvents()
    // Refresh every 5 seconds for instant updates
    const interval = setInterval(fetchEvents, 5000)
    
    return () => {
      canceled = true
      clearInterval(interval)
    }
  }, [])
  
  return nextEvent
}

/** --- PlayerCard --- */
export default function PlayerCard() {
  const { id: streamId, name, hls } = useStreamMeta()
  const stats = useStreamStats(streamId)
  const { counts, send } = useReactions(streamId)
  const nextEvent = useUpcomingEvents()
  
  // Modal state
  const [isEventsModalOpen, setIsEventsModalOpen] = useState(false)

  // ticking uptime while live
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!stats.live || !stats.started_at) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [stats.live, stats.started_at])
  const uptime = stats.live ? fmtUptime(stats.started_at, now) : ''

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [playErr, setPlayErr] = useState<string>('')

  // presence heartbeat tied to REAL playback
  usePlaybackPresence(streamId, videoRef)

  const tryPlay = useCallback(async (v: HTMLVideoElement) => {
    try { await v.play() } catch { /* require gesture; retry on live flip */ }
  }, [])

  // Attach HLS/media
  useEffect(() => {
    setPlayErr('')
    const video = videoRef.current
    if (!video || !hls) return

    // Native HLS (Safari / iOS)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hls
      const onCan = () => { if (stats.live) tryPlay(video) }
      const onErr = () => setPlayErr('Playback error (native).')
      video.addEventListener('canplay', onCan)
      video.addEventListener('error', onErr)
      if (stats.live) tryPlay(video)
      return () => {
        video.removeEventListener('canplay', onCan)
        video.removeEventListener('error', onErr)
        video.removeAttribute('src')
      }
    }

    // hls.js (most browsers)
    if (Hls.isSupported()) {
      const h = new Hls({
        liveDurationInfinity: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        fragLoadingRetryDelay: 1000,
        enableWorker: true,
      })
      hlsRef.current = h
      h.on(Hls.Events.ERROR, (_e, data) => {
        if (!data?.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) h.startLoad()
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) h.recoverMediaError()
        else { setPlayErr('Playback error (fatal).'); h.destroy() }
      })
      h.on(Hls.Events.MEDIA_ATTACHED, () => { if (stats.live && video) tryPlay(video) })
      h.loadSource(hls)
      h.attachMedia(video)
      return () => { h.destroy(); hlsRef.current = null }
    }

    setPlayErr('HLS not supported on this browser.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hls])

  // If live flips OFF→ON, try play again
  useEffect(() => {
    const v = videoRef.current
    if (v && stats.live) tryPlay(v)
  }, [stats.live, tryPlay])

  /** bubbles */
  const [bursts, setBursts] = useState<Array<{ id: number; kind: ReactionKind }>>([])
  const burst = (kind: ReactionKind) => {
    const id = Math.random()
    setBursts(b => [...b, { id, kind }])
    setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 1400)
  }
  const doReact = (k: ReactionKind) => { burst(k); send(k) }

  const viewers = Number(stats.viewers || 0)

  return (
    <div className="bg-white rounded-2xl shadow border p-4 h-full min-h-[420px] sm:min-h-[520px] max-h-[calc(100vh-200px)] overflow-hidden flex flex-col">
      {/* Next Event Banner */}
      {nextEvent && (
        <div className="mb-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <span className="text-sm font-medium text-emerald-800">
              {formatEventMessage(nextEvent)}
            </span>
          </div>
        </div>
      )}
      
      {/* Video container */}
      <div className="relative flex-1 min-h-0">
        <video
          ref={videoRef}
          controls
          playsInline
          // @ts-ignore
          webkit-playsinline="true"
          preload="metadata"
          crossOrigin="anonymous"
          className="h-full w-full rounded-xl bg-black object-contain"
        />

        {/* Title + status bar */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 px-3 py-1 text-white text-[11px] sm:text-sm flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent rounded-t-xl">
          <span className="font-semibold truncate">
            {nextEvent ? (
              <button
                onClick={() => setIsEventsModalOpen(true)}
                className="pointer-events-auto hover:text-emerald-300 transition-colors cursor-pointer underline decoration-dotted underline-offset-2"
                title="Click to see all upcoming events"
              >
                {formatEventMessage(nextEvent)}
              </button>
            ) : (
              'No event planned so far'
            )}
          </span>
          <span className="tabular-nums flex items-center gap-2">
            <span>{stats.live ? '🟢 Live' : '⚫︎ Offline'}{uptime ? ` • ${uptime}` : ''}</span>
            <span>👀 {viewers}</span>
          </span>
        </div>

        {/* Reactions dock */}
        <div
          className="absolute right-3 flex items-center gap-2"
          style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${REACTIONS_BOTTOM})` }}
        >
          <button
            onClick={() => doReact('like')}
            disabled={!stats.live}
            className="rounded-full bg-white/90 hover:bg-white px-3 py-2 shadow text-sm flex items-center gap-2 disabled:opacity-60"
            title="Like"
          >
            👍 <span className="tabular-nums">{counts.like}</span>
          </button>
          <button
            onClick={() => doReact('heart')}
            disabled={!stats.live}
            className="rounded-full bg-white/90 hover:bg-white px-3 py-2 shadow text-sm flex items-center gap-2 disabled:opacity-60"
            title="Love"
          >
            ❤️ <span className="tabular-nums">{counts.heart}</span>
          </button>
          <button
            onClick={() => doReact('dislike')}
            disabled={!stats.live}
            className="rounded-full bg-white/90 hover:bg-white px-3 py-2 shadow text-sm flex items-center gap-2 disabled:opacity-60"
            title="Dislike"
          >
            👎 <span className="tabular-nums">{counts.dislike}</span>
          </button>
        </div>


        {/* Floating bubbles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {bursts.map(b => (
            <span
            key={b.id}
            className="absolute right-6 text-2xl animate-[floatUp_1.4s_ease-out_forwards]"
            style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${REACTIONS_BOTTOM})` }}
          >
            {b.kind === 'heart' ? '❤️' : b.kind === 'like' ? '👍' : '👎'}
          </span>

                    ))}
        </div>

        {/* optional debug: show the HLS URL (small, bottom-left) */}
        {CHAT_DEBUG && (
          <div className="absolute bottom-1 left-2 text-[10px] text-white/80">{hls}</div>
        )}

        <style jsx>{`
          @keyframes floatUp {
            0%   { transform: translate(0, 0) scale(1); opacity: 1; }
            60%  { transform: translate(-10px, -40px) scale(1.3); opacity: 0.9; }
            100% { transform: translate(-20px, -90px) scale(1.1); opacity: 0; }
          }
        `}</style>
      </div>

      {/* Error hint */}
      {playErr && <div className="mt-2 text-xs text-red-600">{playErr}</div>}

      {/* Events Modal */}
      <EventsModal 
        isOpen={isEventsModalOpen}
        onClose={() => setIsEventsModalOpen(false)}
      />
    </div>
  )
}
