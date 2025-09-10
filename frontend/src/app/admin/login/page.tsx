'use client'

import React, { useState } from 'react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!r.ok) {
        const j = await r.json().catch(()=>({}))
        throw new Error(j.error || 'Login failed')
      }
      // go to admin home
      window.location.href = '/admin'
    } catch (e:any) {
      setError(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 grid place-items-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border p-6">
        <h1 className="text-xl font-semibold text-center mb-1">Admin Sign In</h1>
        <p className="text-xs text-gray-500 text-center mb-6">Restricted area</p>

        {error && <div className="mb-4 p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0c6]"
              value={email} onChange={e=>setEmail(e.target.value)} required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0c6]"
              value={password} onChange={e=>setPassword(e.target.value)} required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-xl bg-[#0a4] hover:bg-[#0c6] text-white disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          Tip: use the admin created by the DB script.
        </div>
      </div>
    </div>
  )
}
