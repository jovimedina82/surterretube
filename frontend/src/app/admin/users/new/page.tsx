'use client'
import { useState } from 'react'

export default function AdminNewUserPage() {
  const [form, setForm] = useState({ email:'', display_name:'', password:'' })
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null); setErr(null)
    const r = await fetch('/api/admin/users', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(form),
    })
    if (r.ok) { setMsg('Admin saved'); setForm({ email:'', display_name:'', password:'' }) }
    else { const j=await r.json().catch(()=>({})); setErr(j.error || 'Save failed') }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold mb-4">Add / update admin</h1>
      {msg && <div className="mb-3 text-sm p-2 bg-green-50 border border-green-200 rounded">{msg}</div>}
      {err && <div className="mb-3 text-sm p-2 bg-red-50 border border-red-200 rounded">{err}</div>}

      <form onSubmit={save} className="bg-white border rounded-2xl shadow p-5 grid gap-3">
        <input
          required placeholder="Email" className="border rounded-xl px-3 py-2"
          value={form.email} onChange={e=>setForm({ ...form, email:e.target.value })}
        />
        <input
          required placeholder="Display name" className="border rounded-xl px-3 py-2"
          value={form.display_name} onChange={e=>setForm({ ...form, display_name:e.target.value })}
        />
        <input
          required type="password" placeholder="Password (min 10)" className="border rounded-xl px-3 py-2"
          value={form.password} onChange={e=>setForm({ ...form, password:e.target.value })}
        />
        <button className="py-2 rounded-xl bg-[#0a4] hover:bg-[#0c6] text-white">Save admin</button>
      </form>
    </div>
  )
}
