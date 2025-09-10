'use client'
import { useState } from 'react'

export default function AdminChangePasswordPage() {
  const [form, setForm] = useState({ current_password:'', new_password:'' })
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const updatePw = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null); setErr(null)
    const r = await fetch('/api/admin/change-password', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(form),
    })
    if (r.ok) { setMsg('Password updated'); setForm({ current_password:'', new_password:'' }) }
    else { const j=await r.json().catch(()=>({})); setErr(j.error || 'Update failed') }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold mb-4">Change my password</h1>
      {msg && <div className="mb-3 text-sm p-2 bg-green-50 border border-green-200 rounded">{msg}</div>}
      {err && <div className="mb-3 text-sm p-2 bg-red-50 border border-red-200 rounded">{err}</div>}

      <form onSubmit={updatePw} className="bg-white border rounded-2xl shadow p-5 grid gap-3">
        <input
          required type="password" placeholder="Current password" className="border rounded-xl px-3 py-2"
          value={form.current_password} onChange={e=>setForm({ ...form, current_password:e.target.value })}
        />
        <input
          required type="password" placeholder="New password (min 10)" className="border rounded-xl px-3 py-2"
          value={form.new_password} onChange={e=>setForm({ ...form, new_password:e.target.value })}
        />
        <button className="py-2 rounded-xl bg-gray-800 hover:bg-black text-white">Update</button>
      </form>
    </div>
  )
}
