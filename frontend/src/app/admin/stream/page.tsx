'use client'
import { useEffect, useState } from 'react'

type Config = {
  server_url: string
  stream_key: string
  rtmps_ok?: boolean
}

export default function StreamAdminPage() {
  const [cfg, setCfg] = useState<Config | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)


  const load = async () => {
    setErr(null)
    const r = await fetch('/api/admin/stream', { cache: 'no-store' })
    if (!r.ok) { setErr('Failed to load streaming config'); return }
    const j = await r.json()
    setCfg(j.config)
  }
  useEffect(() => { load() }, [])

  const rotateKey = async () => {
    if (!confirm('Generate a new Stream Key? Your encoder will need to be updated.')) return
    setBusy(true); setMsg(null); setErr(null)
    const r = await fetch('/api/admin/stream/key', { method: 'PATCH' })
    setBusy(false)

    if (r.ok) {
      const j = await r.json()
      setMsg('Stream Key regenerated')
      setCfg(prev => prev ? { ...prev, stream_key: j.stream_key } : j)
    } else {
      let j: any = {}
      try { j = await r.json() } catch {}
      setErr(j.error || `Rotate failed (HTTP ${r.status})`)
    }
  }


  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setMsg('Copied') } catch {}
    setTimeout(() => setMsg(null), 1200)
  }


  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Streaming</h1>
        {msg && <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">{msg}</span>}
      </header>
      {err && <div className="text-sm p-2 bg-red-50 border border-red-200 rounded">{err}</div>}

{/* Server URL (fixed) */}
      <section className="bg-white border rounded-2xl shadow p-5 max-w-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">RTMP(S) Server</h2>
          {cfg && (
            <span className={[
              'text-xs px-2 py-1 rounded',
              cfg.rtmps_ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            ].join(' ')}>
              {cfg.rtmps_ok ? 'stunnel:4443 OK' : 'stunnel:4443 unreachable'}
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] mt-3">
          <input
            readOnly
            className="border rounded-xl px-3 py-2 font-mono"
            value={cfg?.server_url || 'rtmps://example.com:4443/live'}
          />
          <button
            onClick={() => copy(cfg?.server_url || '')}
            className="px-4 py-2 rounded-xl bg-white border hover:bg-gray-50"
          >Copy</button>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          This server URL is fixed by <span className="font-semibold">stunnel4</span> (port 4443).
          Update stunnel/nginx/SRS if you ever need to change it.
        </p>
      </section>

      {/* Stream key */}
      <section className="bg-white border rounded-2xl shadow p-5 max-w-2xl">
        <h2 className="text-lg font-semibold mb-3">Stream Key</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            readOnly
            type={showKey ? 'text' : 'password'}
            className="border rounded-xl px-3 py-2 font-mono"
            value={cfg?.stream_key || ''}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="px-4 py-2 rounded-xl bg-white border hover:bg-gray-50"
          >{showKey ? 'Hide' : 'Show'}</button>
          <button
            onClick={() => copy(cfg?.stream_key || '')}
            className="px-4 py-2 rounded-xl bg-white border hover:bg-gray-50"
          >Copy</button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={rotateKey}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
          >Regenerate key</button>
        </div>
      </section>
    </div>
  )
}