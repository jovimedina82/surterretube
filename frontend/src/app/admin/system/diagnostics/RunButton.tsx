'use client'

import React from 'react'

export default function RunButton() {
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string>('')

  const run = async () => {
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/admin/system/diagnostics/run', { method: 'POST' })
      if (!res.ok) throw new Error(`run !ok ${res.status}`)
      // refresh the page to show the new run in history
      window.location.reload()
    } catch (e: any) {
      setErr(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={busy}
        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 disabled:opacity-60"
      >
        {busy ? 'Running…' : 'Run checks'}
      </button>
      {err ? <span className="text-sm text-red-600">{err}</span> : null}
    </div>
  )
}
