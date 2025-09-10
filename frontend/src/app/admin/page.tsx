'use client'
import React, { useEffect, useState } from 'react'

type AdminUser = { id:number; email:string; display_name:string; created_at:string }

// export default function AdminHome() {
//   const [users, setUsers] = useState<AdminUser[]>([])
//   const [msg, setMsg] = useState<string | null>(null)
//   const [err, setErr] = useState<string | null>(null)

//   const [createForm, setCreateForm] = useState({ email:'', display_name:'', password:'' })
//   const [myForm, setMyForm] = useState({ current_password:'', new_password:'' })
//   const [resetOpen, setResetOpen] = useState<number | null>(null)
//   const [resetValue, setResetValue] = useState('')

//   const load = async () => {
//     setErr(null)
//     const r = await fetch('/api/admin/users', { cache: 'no-store' })
//     if (r.ok) setUsers((await r.json()).users)
//     else setErr('Failed to load users')
//   }

//   useEffect(() => { load() }, [])

//   const createUser = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setMsg(null); setErr(null)
//     const r = await fetch('/api/admin/users', {
//       method:'POST',
//       headers:{ 'Content-Type':'application/json' },
//       body: JSON.stringify(createForm),
//     })
//     if (r.ok) { setMsg('User saved'); setCreateForm({ email:'', display_name:'', password:'' }); load() }
//     else { const j=await r.json().catch(()=>({})); setErr(j.error || 'Save failed') }
//   }

//   const deleteUser = async (id:number) => {
//     if (!confirm('Delete this admin?')) return
//     setMsg(null); setErr(null)
//     const r = await fetch(`/api/admin/users/${id}`, { method:'DELETE' })
//     if (r.ok) { setMsg('User deleted'); load() }
//     else { const j=await r.json().catch(()=>({})); setErr(j.error || 'Delete failed') }
//   }

//   const resetPassword = async (id:number) => {
//     setMsg(null); setErr(null)
//     const r = await fetch(`/api/admin/users/${id}/password`, {
//       method:'PATCH',
//       headers:{ 'Content-Type':'application/json' },
//       body: JSON.stringify({ new_password: resetValue }),
//     })
//     if (r.ok) { setMsg('Password updated'); setResetOpen(null); setResetValue('') }
//     else { const j=await r.json().catch(()=>({})); setErr(j.error || 'Password reset failed') }
//   }

//   const changeMyPassword = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setMsg(null); setErr(null)
//     const r = await fetch('/api/admin/change-password', {
//       method:'POST',
//       headers:{ 'Content-Type':'application/json' },
//       body: JSON.stringify(myForm),
//     })
//     if (r.ok) { setMsg('Your password was changed'); setMyForm({ current_password:'', new_password:'' }) }
//     else { const j=await r.json().catch(()=>({})); setErr(j.error || 'Change password failed') }
//   }

//   return (

//     <div className="grid gap-6 xl:grid-cols-3">
//       {/* ───── User list (left, wide) ─────────────────────────────── */}
//       <section id="user-list" className="xl:col-span-2 bg-white border rounded-2xl shadow">
//         <header className="flex items-center justify-between p-5 border-b">
//           <h2 className="text-lg font-semibold">Admin users</h2>
//           {msg && (
//             <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
//               {msg}
//             </span>
//           )}
//         </header>

//         {err && (
//           <div className="mx-5 mt-4 mb-1 text-sm p-2 bg-red-50 border border-red-200 rounded">
//             {err}
//           </div>
//         )}

//         <ul className="p-5 space-y-3">
//           {users.map((u) => (
//             <li key={u.id} className="border rounded-xl p-3">
//               <div className="flex items-center justify-between gap-3">
//                 <div>
//                   <div className="font-medium">{u.display_name}</div>
//                   <div className="text-xs text-gray-500">{u.email}</div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <button
//                     onClick={() => {
//                       setResetOpen(resetOpen === u.id ? null : u.id)
//                       setResetValue('')
//                     }}
//                     className="px-2 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 text-sm"
//                   >
//                     Reset password
//                   </button>
//                   <button
//                     onClick={() => deleteUser(u.id)}
//                     className="px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
//                   >
//                     Delete
//                   </button>
//                 </div>
//               </div>

//               {resetOpen === u.id && (
//                 <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
//                   <input
//                     type="password"
//                     placeholder="New password (min 10)"
//                     className="border rounded-xl px-3 py-2"
//                     value={resetValue}
//                     onChange={(e) => setResetValue(e.target.value)}
//                   />
//                   <button
//                     onClick={() => resetPassword(u.id)}
//                     className="px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700"
//                   >
//                     Save
//                   </button>
//                 </div>
//               )}
//             </li>
//           ))}

//           {users.length === 0 && (
//             <div className="text-sm text-gray-500">No admins yet.</div>
//           )}
//         </ul>
//       </section>

//       {/* ───── Add / update admin (right column, top) ─────────────── */}
//       <section id="add-admin" className="bg-white border rounded-2xl shadow p-5">
//         <h2 className="text-lg font-semibold mb-3">Add / update admin</h2>
//         <form onSubmit={createUser} className="grid gap-3">
//           <input
//             required
//             placeholder="Email"
//             className="border rounded-xl px-3 py-2"
//             value={createForm.email}
//             onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
//           />
//           <input
//             required
//             placeholder="Display name"
//             className="border rounded-xl px-3 py-2"
//             value={createForm.display_name}
//             onChange={(e) =>
//               setCreateForm({ ...createForm, display_name: e.target.value })
//             }
//           />
//           <input
//             required
//             type="password"
//             placeholder="Password (min 10)"
//             className="border rounded-xl px-3 py-2"
//             value={createForm.password}
//             onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
//           />
//           <button className="py-2 rounded-xl bg-[#0a4] hover:bg-[#0c6] text-white">
//             Save admin
//           </button>
//         </form>
//       </section>

//       {/* ───── Change my password (right column, bottom) ──────────── */}
//       <section id="change-password" className="bg-white border rounded-2xl shadow p-5">
//         <h2 className="text-lg font-semibold mb-3">Change my password</h2>
//         <form onSubmit={changeMyPassword} className="grid gap-3">
//           <input
//             required
//             type="password"
//             placeholder="Current password"
//             className="border rounded-xl px-3 py-2"
//             value={myForm.current_password}
//             onChange={(e) =>
//               setMyForm({ ...myForm, current_password: e.target.value })
//             }
//           />
//           <input
//             required
//             type="password"
//             placeholder="New password (min 10)"
//             className="border rounded-xl px-3 py-2"
//             value={myForm.new_password}
//             onChange={(e) => setMyForm({ ...myForm, new_password: e.target.value })}
//           />
//           <button className="py-2 rounded-xl bg-gray-800 hover:bg-black text-white">
//             Update
//           </button>
//         </form>
//       </section>
//     </div>
  
// )

  
// }

export default function AdminOverview() {
  const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false })
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  const dashboardCards = [
    {
      href: '/admin/users',
      title: 'User Management',
      description: 'Manage admin accounts, permissions and access controls',
      icon: '👥',
      color: 'from-cyan-500 to-blue-600',
      stats: 'Active Admins',
      value: '4'
    },
    {
      href: '/admin/stream',
      title: 'Stream Control',
      description: 'Monitor live streams, manage broadcast settings',
      icon: '📡',
      color: 'from-emerald-500 to-teal-600',
      stats: 'Stream Status',
      value: 'LIVE'
    },
    {
      href: '/admin/content',
      title: 'Content Library',
      description: 'Manage video library, scheduling and content',
      icon: '🎬',
      color: 'from-purple-500 to-indigo-600',
      stats: 'Total Videos',
      value: '127'
    },
    {
      href: '/admin/system/diagnostics',
      title: 'System Health',
      description: 'Monitor system performance and diagnostics',
      icon: '⚙️',
      color: 'from-orange-500 to-red-600',
      stats: 'System Load',
      value: '23%'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            Mission Control Dashboard
          </h1>
          <p className="text-slate-400">
            {currentDate} • {currentTime}
          </p>
        </div>
        <div className="mt-4 lg:mt-0 flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-emerald-500/20 px-3 py-2 rounded-full">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300 text-sm font-mono">ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Server Uptime</p>
              <p className="text-2xl font-bold text-slate-100">99.9%</p>
            </div>
            <div className="text-2xl">⚡</div>
          </div>
        </div>
        <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-slate-100">1,247</p>
            </div>
            <div className="text-2xl">👥</div>
          </div>
        </div>
        <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Data Transfer</p>
              <p className="text-2xl font-bold text-slate-100">2.3GB</p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>
        <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Response Time</p>
              <p className="text-2xl font-bold text-slate-100">12ms</p>
            </div>
            <div className="text-2xl">🚀</div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {dashboardCards.map((card, index) => (
          <a
            key={card.href}
            href={card.href}
            className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600/50 rounded-2xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyan-500/20 overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.3) 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
              }} />
            </div>

            {/* Glow Effect on Hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center shadow-lg`}>
                  <span className="text-xl">{card.icon}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-mono">{card.stats}</p>
                  <p className="text-lg font-bold text-slate-200">{card.value}</p>
                </div>
              </div>
              
              <h2 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-cyan-300 transition-colors">
                {card.title}
              </h2>
              <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                {card.description}
              </p>

              {/* Arrow Icon */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                <div className="w-6 h-6 text-cyan-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-100 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/admin/users/new" className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors group">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <span className="text-emerald-400">➕</span>
            </div>
            <span className="text-slate-300 group-hover:text-slate-100 transition-colors">Add Admin</span>
          </a>
          <a href="/admin/password" className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors group">
            <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <span className="text-cyan-400">🔐</span>
            </div>
            <span className="text-slate-300 group-hover:text-slate-100 transition-colors">Change Password</span>
          </a>
          <a href="/admin/content/scheduling" className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors group">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span className="text-purple-400">📅</span>
            </div>
            <span className="text-slate-300 group-hover:text-slate-100 transition-colors">Schedule Event</span>
          </a>
          <a href="/admin/system/diagnostics" className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors group">
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <span className="text-orange-400">🔧</span>
            </div>
            <span className="text-slate-300 group-hover:text-slate-100 transition-colors">Run Diagnostics</span>
          </a>
        </div>
      </div>
    </div>
  )
}

