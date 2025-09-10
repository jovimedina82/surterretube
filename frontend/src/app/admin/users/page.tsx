'use client'
import { useEffect, useState } from 'react'
import { FuturisticButton, FuturisticInput, FuturisticCard, StatusBadge, DataTable } from '@/components/AdminComponents'

type AdminUser = { id:number; email:string; display_name:string; created_at:string }
type Session = { id?: string; email?: string; name?: string } | null

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [me, setMe] = useState<Session>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState<number | null>(null)
  const [resetValue, setResetValue] = useState('')

  const load = async () => {
    setErr(null)
    const [uRes, sRes] = await Promise.all([
      fetch('/api/admin/users', { cache: 'no-store' }),
      fetch('/api/admin/session', { cache: 'no-store' }),
    ])
    if (uRes.ok) setUsers((await uRes.json()).users)
    else setErr('Failed to load users')
    if (sRes.ok) {
      const j = await sRes.json()
      setMe(j?.authenticated ? { id: j.user?.id, email: j.user?.email, name: j.user?.name } : null)
    }
  }
  useEffect(() => { load() }, [])

  const resetPassword = async (id:number) => {
    setMsg(null); setErr(null)
    const r = await fetch(`/api/admin/users/${id}/password`, {
      method:'PATCH',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ new_password: resetValue }),
    })
    if (r.ok) { setMsg('Password updated'); setResetOpen(null); setResetValue('') }
    else { const j=await r.json().catch(()=>({})); setErr(j.error || `Password reset failed (${r.status})`) }
  }

  const deleteUser = async (id:number) => {
    if (!confirm('Delete this admin?')) return
    setMsg(null); setErr(null)

    // 1) Try POST /delete (works behind strict proxies)
    let r = await fetch(`/api/admin/users/${id}/delete`, { method:'POST' })
    if (r.status === 404 || r.status === 405) {
      // 2) Fallback to HTTP DELETE if POST route isn't deployed
      r = await fetch(`/api/admin/users/${id}`, { method:'DELETE' })
    }
    if (r.ok) { setMsg('User deleted'); load(); return }

    const j = await r.json().catch(()=>({}))
    setErr(j.error || `Delete failed (${r.status})`)
  }

  const myId = me?.id ? Number(me.id) : NaN

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Administrator Management</h1>
          <p className="text-slate-400">Manage system administrators and their permissions</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          {msg && (
            <StatusBadge status="online">{msg}</StatusBadge>
          )}
          <StatusBadge status="online">
            {users.length} Active Admin{users.length !== 1 ? 's' : ''}
          </StatusBadge>
        </div>
      </div>

      {/* Error Message */}
      {err && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-400">⚠️</span>
            <span className="text-red-300 font-medium">Error</span>
          </div>
          <p className="text-red-300 mt-1">{err}</p>
        </div>
      )}

      {/* Admin Users Table */}
      <FuturisticCard title="System Administrators">
        <div className="space-y-6">
          {users.map(u => {
            const isMe = Number(u.id) === myId
            const createdDate = new Date(u.created_at).toLocaleDateString()
            
            return (
              <div key={u.id} className="group relative bg-slate-700/30 border border-slate-600/50 rounded-xl p-6 hover:border-cyan-500/30 transition-all duration-300">
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                
                <div className="relative z-10">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-emerald-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {u.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      
                      {/* User Info */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-slate-100">{u.display_name}</h3>
                          {isMe && (
                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 font-mono text-sm">{u.email}</p>
                        <p className="text-slate-500 text-xs">Created: {createdDate}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3">
                      <FuturisticButton
                        variant="warning"
                        onClick={() => { 
                          setResetOpen(resetOpen === u.id ? null : u.id); 
                          setResetValue('') 
                        }}
                      >
                        🔑 Reset Password
                      </FuturisticButton>
                      
                      <FuturisticButton
                        variant="danger"
                        disabled={isMe}
                        onClick={() => deleteUser(u.id)}
                        className={isMe ? 'opacity-30' : ''}
                      >
                        🗑️ {isMe ? 'Cannot Delete Self' : 'Delete Admin'}
                      </FuturisticButton>
                    </div>
                  </div>

                  {/* Password Reset Form */}
                  {resetOpen === u.id && (
                    <div className="mt-6 pt-6 border-t border-slate-600/50">
                      <div className="bg-slate-800/50 rounded-xl p-4">
                        <h4 className="text-slate-200 font-medium mb-4">Reset Password for {u.display_name}</h4>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1">
                            <FuturisticInput
                              type="password"
                              placeholder="Enter new password (minimum 10 characters)"
                              value={resetValue}
                              onChange={e => setResetValue(e.target.value)}
                            />
                          </div>
                          <div className="flex space-x-3">
                            <FuturisticButton
                              variant="primary"
                              onClick={() => resetPassword(u.id)}
                              disabled={resetValue.length < 10}
                            >
                              💾 Save Password
                            </FuturisticButton>
                            <FuturisticButton
                              variant="secondary"
                              onClick={() => {
                                setResetOpen(null)
                                setResetValue('')
                              }}
                            >
                              ❌ Cancel
                            </FuturisticButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {users.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-700/50 rounded-full flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No Administrators</h3>
              <p className="text-slate-500 mb-4">No admin accounts have been created yet.</p>
              <a href="/admin/users/new">
                <FuturisticButton variant="primary">
                  ➕ Create First Admin
                </FuturisticButton>
              </a>
            </div>
          )}
        </div>
      </FuturisticCard>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/admin/users/new" className="group">
          <FuturisticCard className="h-full hover:border-emerald-500/30 transition-all duration-300">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                <span className="text-xl">➕</span>
              </div>
              <h3 className="font-semibold text-slate-200 mb-2 group-hover:text-emerald-300 transition-colors">Add New Admin</h3>
              <p className="text-sm text-slate-400">Create a new administrator account</p>
            </div>
          </FuturisticCard>
        </a>

        <a href="/admin/password" className="group">
          <FuturisticCard className="h-full hover:border-cyan-500/30 transition-all duration-300">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-xl">🔐</span>
              </div>
              <h3 className="font-semibold text-slate-200 mb-2 group-hover:text-cyan-300 transition-colors">Change Password</h3>
              <p className="text-sm text-slate-400">Update your own password</p>
            </div>
          </FuturisticCard>
        </a>

        <div className="group cursor-pointer">
          <FuturisticCard className="h-full hover:border-purple-500/30 transition-all duration-300">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <h3 className="font-semibold text-slate-200 mb-2 group-hover:text-purple-300 transition-colors">Activity Logs</h3>
              <p className="text-sm text-slate-400">View admin activity history</p>
            </div>
          </FuturisticCard>
        </div>
      </div>
    </div>
  )
}
