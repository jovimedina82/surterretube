'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'

/* -------------------- tiny utils -------------------- */
function hashFnv1a(s: string) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
const PALETTE = ['#3d6864','#2563eb','#4f46e5','#7c3aed','#d946ef','#e11d48','#ef4444','#f97316','#f59e0b','#65a30d','#10b981','#06b6d4','#14b8a6','#8b5cf6','#ec4899','#f43f5e']
const autoColor = (name: string) => PALETTE[hashFnv1a((name||'user').toLowerCase()) % PALETTE.length]
const EMOJI_PICK = ('😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥳 🤩 🥺 😭 ' +
  '👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤏 💪 🦾 🦿 🙏 ✍️ 👃 🦴 👀 👁️ 🧠 🫀 🫁 🦷 🦴 👅 👄 💋 🩸 ' +
  '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ' +
  '⭐ 🌟 💫 ✨ ☄️ 💥 🔥 🌈 ☀️ ⛅ ⚡ ❄️ 🌙 ' +
  '🎉 🎊 🎈 🎁 🏆 🥇 🎯 🎪 🎨 🎭 🪗 🎸 🎵 🎶 ' +
  '✅ ❌ ❗ ❓ 💯 💢 💨 💤 💬 🗨️ 🗯️ 💭').split(/\s+/)

type Msg = { seq?: number; user?: string; text: string; sentAt?: string }

/* -------------------- dynamic stream id -------------------- */
async function fetchStreamId(): Promise<string|null> {
  try {
    const r = await fetch('/api/stream', { cache: 'no-store' })
    if (!r.ok) return null
    const j = await r.json().catch(() => null)
    const sid = j?.stream_id || j?.name || j?.key
    if (typeof sid === 'string' && sid.trim()) return sid.trim()
  } catch {}
  return null
}

/* -------------------- live status polling -------------------- */
function useLive(streamId?: string|null) {
  const [live, setLive] = useState(false)
  const [broadcastId, setBroadcastId] = useState<string|undefined>(undefined)

  useEffect(() => {
    if (!streamId) { setLive(false); setBroadcastId(undefined); return }
    let t: any; let cancel = false
    const poll = async () => {
      try {
        const u = new URL('/status', window.location.origin)
        u.searchParams.set('stream_id', streamId)
        const r = await fetch(u.toString(), { cache: 'no-store' })
        if (!r.ok) throw new Error('bad status')
        const j = await r.json()
        if (!cancel) {
          setLive(!!j.live)
          setBroadcastId(j.broadcast_id != null ? String(j.broadcast_id) : undefined)
        }
      } catch { if (!cancel) setLive(false) }
    }
    poll()
    t = setInterval(poll, 5000)
    return () => { cancel = true; clearInterval(t) }
  }, [streamId])

  return { live, broadcastId }
}

/* -------------------- component -------------------- */
export default function ChatCard({ autoConnect = true }: { autoConnect?: boolean }) {
  const [isLive, setIsLive] = useState(false)
  const { instance, accounts, inProgress } = useMsal()
  const isAuthed = useIsAuthenticated()
  const DEBUG = process.env.NEXT_PUBLIC_CHAT_DEBUG === '1';

  // identity
  const activeAccount = instance.getActiveAccount() ?? accounts[0] ?? null
  const selfName = activeAccount?.name || 'user'
  const colorKey = useMemo(
    () => `chat.color.${activeAccount?.homeAccountId || selfName}`,
    [activeAccount?.homeAccountId, selfName]
  )

  // ui state
  const [status, setStatus] = useState<'disconnected'|'connecting'|'connected'>('disconnected')
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [selfColor, setSelfColor] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  // stream / ws
  const [streamId, setStreamId] = useState<string|undefined>(undefined)
  const { live, broadcastId } = useLive(streamId)
  const wsRef = useRef<WebSocket|null>(null)
  const connectingRef = useRef(false)
  const backoffRef = useRef(1000)
  const pickerRef = useRef<HTMLDivElement|null>(null)
  const emojiRef = useRef<HTMLDivElement|null>(null)
  const listRef = useRef<HTMLDivElement|null>(null)
  const authBusyRef = useRef(false)
  const streamRef = useRef<string|undefined>(streamId); streamRef.current = streamId
  const bcRef = useRef<string|undefined>(broadcastId); bcRef.current = broadcastId

  // persist color
  useEffect(() => {
    if (typeof window !== 'undefined') setSelfColor(localStorage.getItem(colorKey) || '')
  }, [colorKey])
  useEffect(() => {
    if (typeof window === 'undefined') return
    selfColor ? localStorage.setItem(colorKey, selfColor) : localStorage.removeItem(colorKey)
  }, [selfColor, colorKey])

  // popover close handlers
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (pickerOpen && pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
      if (emojiOpen && emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPickerOpen(false); setEmojiOpen(false) } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [pickerOpen, emojiOpen])

  // autoscroll
  useEffect(() => {
    if (autoScroll && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, autoScroll])

  // get stream id once (and refresh every 10s to detect key rotation)
  useEffect(() => {
    let cancel = false
    const update = async () => {
      const sid = await fetchStreamId()
      if (!cancel && sid && sid !== streamRef.current) setStreamId(sid)
    }
    update()
    const t = setInterval(update, 10000)
    return () => { cancel = true; clearInterval(t) }
  }, [])

  // reset history when broadcast changes or flips offline→online
  const lastLiveRef = useRef(false)
  const lastBcRef = useRef<string|undefined>(undefined)
  useEffect(() => {
    const becameLive = !lastLiveRef.current && live
    const bcChanged = (broadcastId ?? '') !== (lastBcRef.current ?? '')
    if (becameLive || bcChanged) {
      setMessages([])
    }
    lastLiveRef.current = live
    lastBcRef.current = broadcastId
  }, [live, broadcastId])

  // helpers
  const ensureAuth = useCallback(async () => {
    if (isAuthed) return true
    if (inProgress !== InteractionStatus.None || authBusyRef.current) return false
    authBusyRef.current = true
    try {
      const res = await instance.loginPopup({ scopes: ['openid','profile','email'], prompt: 'select_account' })
      if (res?.account) instance.setActiveAccount(res.account)
      return true
    } catch { return false }
    finally { authBusyRef.current = false }
  }, [isAuthed, inProgress, instance])

  async function loadHistory(limit = 100) {
    try {
      if (!streamRef.current) return
      const u = new URL('/chat/history', location.origin)
      u.searchParams.set('stream_id', streamRef.current)
      u.searchParams.set('limit', String(limit))
      const r = await fetch(u.toString(), { cache: 'no-store' })
      if (!r.ok) return
      const j = await r.json().catch(()=>null)
      const rows = Array.isArray(j?.messages) ? j.messages : []
      rows.reverse()
      setMessages(rows.map((m:any)=>({ seq:m.id, user:m.user_name||'user', text:String(m.text??''), sentAt:m.sent_at })))
    } catch {}
  }

  const connect = useCallback(async () => {
    if (!streamRef.current || !live) return
    if (!isAuthed) return
    if (inProgress !== InteractionStatus.None) return
    if (connectingRef.current) return
    if (wsRef.current && (wsRef.current.readyState===WebSocket.OPEN || wsRef.current.readyState===WebSocket.CONNECTING)) return

    connectingRef.current = true
    setStatus('connecting')

    let idToken = ''
    try {
      const acct = instance.getActiveAccount() ?? instance.getAllAccounts()[0] ?? accounts[0]
      const res = await instance.acquireTokenSilent({ scopes:['openid','profile','email'], account: acct, forceRefresh: false })
      idToken = res.idToken
    } catch {
      connectingRef.current = false
      setStatus('disconnected')
      return
    }

    const base = (process.env.NEXT_PUBLIC_WS_URL ??
      (location.protocol==='https:' ? `wss://${location.host}/ws` : `ws://${location.host}/ws`))
    const u = new URL(base)
    u.searchParams.set('token', idToken)
    u.searchParams.set('stream_id', streamRef.current!)

    const sock = new WebSocket(u.toString()); wsRef.current = sock

    sock.onopen = () => {
      setStatus('connected'); connectingRef.current = false; backoffRef.current = 1000
      loadHistory(100)
    }
    sock.onerror = () => { /* ignore; onclose will handle retry */ }
    sock.onclose = () => {
      if (wsRef.current === sock) wsRef.current = null
      setStatus('disconnected'); connectingRef.current = false
      if (isAuthed && live) {
        const ms = Math.min(backoffRef.current, 15000)
        backoffRef.current = ms * 2
        setTimeout(() => connect(), ms)
      }
    }

    // --- fixed, fully-typed message handler ---
    sock.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)

        if (msg.type === 'hello') {
          setIsLive(!!msg.broadcast_id)
          return
        }
        if (msg.type === 'chat_closed') {
          setIsLive(false)
          return
        }
        if (msg.type === 'chat' || msg.type === 'chat.message' || msg.type === 'message') {
          setIsLive(true)
          const m: Msg = {
            seq: (msg as any).id as number | undefined,
            user: ((msg as any).user?.name ?? (msg as any).user_name ?? 'user') as string,
            text: String((msg as any).text ?? ''),
            sentAt: (msg as any).sent_at as string | undefined,
          }
          setMessages((prev) => [...prev, m])
          if (autoScroll && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
          }
          return
        }
        if (msg.type === 'chat.delete') {
          const id = (msg as any).targetId as number | undefined
          if (id != null) setMessages((prev) => prev.filter((x) => x.seq !== id))
          return
        }
      } catch { /* ignore malformed */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, inProgress, live, instance, accounts])

  useEffect(() => () => { wsRef.current?.close(); wsRef.current = null }, [])
  useEffect(() => { wsRef.current?.close(); wsRef.current = null; setStatus('disconnected'); setMessages([]) }, [activeAccount?.homeAccountId])

  // auto-connect policy
  useEffect(() => {
    if (autoConnect && streamId && live && isAuthed && inProgress === InteractionStatus.None) connect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, streamId, live, isAuthed, inProgress])

  const send = useCallback(() => {
    const t = text.trim(); if (!t) return
    const s = wsRef.current; if (!s || s.readyState !== WebSocket.OPEN) return
    s.send(JSON.stringify({ type:'chat', stream_id: streamRef.current, broadcast_id: bcRef.current, text: t }))
    setText('')
  }, [text])

  const effectiveSelfColor = selfColor || autoColor(selfName)

  /* -------------------- UI -------------------- */
  return (
  <section
    className="relative flex h-full min-h-[380px] max-h-[calc(100vh-150px)] sm:max-h-[calc(100vh-160px)] lg:max-h-[calc(100vh-180px)] flex-col overflow-hidden rounded-2xl border-2 border-emerald-100/50 bg-gradient-to-b from-white/95 to-emerald-50/30 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl"
    style={{ maxHeight: 'calc(100dvh - 150px)' }}
  >
    {/* Header (sticky) */}
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-emerald-100/50 bg-gradient-to-r from-white/95 to-emerald-50/50 px-4 py-3 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
          💬
        </div>
        <h2 className="truncate text-base font-bold text-emerald-700 sm:text-lg">
          Live Chat
          {DEBUG && <span className="ml-2 align-middle text-xs font-normal text-gray-400">(debug)</span>}
        </h2>
      </div>

      <div className="ml-3 flex shrink-0 items-center gap-3 text-xs text-gray-600 sm:text-sm">
        <span className="hidden sm:inline">Status:</span>
        <span className="font-medium">{isAuthed ? status : 'signed out'}</span>
        <span
          aria-label="connection"
          className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white"
          style={{
            backgroundColor: isAuthed
              ? (status === 'connected' ? '#22c55e' : '#f59e0b')
              : '#ef4444',
          }}
        />
      </div>
    </header>

    {/* Messages */}
    <div
      ref={listRef}
      className="flex-1 min-h-0 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4"
    >
      {messages.length === 0 ? (
        <div className="grid h-full place-items-center">
          <p className="max-w-[28ch] text-center text-sm text-gray-500">
            {live ? 'No messages yet.' : 'Meeting is offline. You can start a conversation when the meeting begins.'}
          </p>
        </div>
      ) : (
        messages.map((m, i) => {
          const name = m.user || 'user'
          const nameColor =
            isAuthed && name === selfName ? effectiveSelfColor : autoColor(name)

          return (
            <div
              key={m.seq ?? i}
              className="group relative rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm transition sm:hover:shadow"
            >
              <div className="flex items-start gap-2">
                <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                <div className="min-w-0">
                  <span
                    className="mr-2 whitespace-nowrap font-medium"
                    style={{ color: nameColor }}
                  >
                    {name}
                  </span>
                  <span className="whitespace-pre-wrap break-words text-[15px] leading-snug text-gray-800">
                    {m.text}
                  </span>
                  {m.sentAt && (
                    <span className="ml-2 align-middle text-[10px] text-gray-400">
                      {new Date(m.sentAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>

    {/* Composer (sticky) */}
    <footer className="sticky bottom-0 border-t bg-white/90 px-3 py-3 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Emoji */}
        <div ref={emojiRef} className="relative">
          <button
            type="button"
            onClick={() => setEmojiOpen(v => !v)}
            disabled={!isAuthed}
            title="Insert emoji"
            className="grid h-10 w-10 place-items-center rounded-xl border bg-white text-base shadow-sm transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-40"
          >
            🙂
          </button>

          {emojiOpen && (
            <div className="absolute bottom-12 left-0 z-20 w-80 max-h-64 overflow-y-auto rounded-xl border border-emerald-100 bg-white/95 p-3 shadow-2xl backdrop-blur-sm">
              <div className="mb-2 text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                Pick an emoji
              </div>
              <div className="grid grid-cols-10 gap-1 text-lg leading-none">
                {EMOJI_PICK.map(e => (
                  <button
                    key={e}
                    className="grid h-8 w-8 place-items-center rounded-lg transition-all duration-150 hover:bg-emerald-100 hover:scale-125 active:scale-110"
                    onClick={() => {
                      setText(t => t + e)
                      setEmojiOpen(false)
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Name color picker (right of emoji) */}
        <div ref={pickerRef} className="relative">
          <button
            title="Set my name color"
            onClick={() => setPickerOpen(v => !v)}
            className="h-10 w-10 rounded-full border shadow-sm transition hover:brightness-105 active:scale-[0.98]"
            style={{ backgroundColor: effectiveSelfColor, borderColor: '#e5e7eb' }}
            disabled={!isAuthed}
          />
          {pickerOpen && (
            <div className="absolute bottom-12 left-0 z-20 w-56 rounded-xl border bg-white p-3 shadow-xl">
              <div className="mb-2 text-xs font-medium text-gray-600">
                Your name color
              </div>
              <div className="grid grid-cols-7 gap-2">
                {PALETTE.map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      setSelfColor(c)
                      setPickerOpen(false)
                    }}
                    className="h-6 w-6 rounded-full border"
                    style={{ backgroundColor: c, borderColor: '#e5e7eb' }}
                    aria-label={`Pick ${c}`}
                  />
                ))}
              </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="color"
                    value={effectiveSelfColor}
                    onChange={e => setSelfColor(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border p-0"
                  />
                  <button
                    type="button"
                    onClick={() => setSelfColor('')}
                    className="text-xs text-gray-500 underline hover:text-gray-700"
                  >
                    Reset to automatic
                  </button>
                </div>
            </div>
          )}
        </div>

        {/* Input */}
        <input
          className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-emerald-300 disabled:opacity-50"
          maxLength={500}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          onFocus={async () => { if (!isAuthed) await ensureAuth() }}
          onClick={async () => { if (!isAuthed) await ensureAuth() }}
          placeholder={isAuthed ? 'Type a message…' : 'Sign in to chat'}
          disabled={!isAuthed}
        />

        {/* Send */}
        <button
          onClick={send}
          disabled={!isAuthed || !text.trim() || status !== 'connected'}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </footer>
  </section>
  )
}
