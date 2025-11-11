// src/components/AdminSidebar.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminSidebar() {
  const pathname = usePathname()

  const item = (href: string, label: string, icon: string) => {
    const active = pathname === href
    return (
      <Link
        key={href}
        href={href}
        className={[
          'group flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden',
          active 
            ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 shadow-lg shadow-cyan-500/20 border border-cyan-500/30' 
            : 'text-slate-300 hover:text-cyan-300 hover:bg-slate-700/50 hover:shadow-lg hover:shadow-cyan-500/10'
        ].join(' ')}
      >
        {active && (
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 animate-pulse" />
        )}
        <span className="text-lg mr-3 relative z-10">{icon}</span>
        <span className="relative z-10">{label}</span>
        {active && (
          <div className="absolute right-2 w-1 h-6 bg-cyan-400 rounded-full" />
        )}
      </Link>
    )
  }

  const sectionHeader = (title: string, icon: string) => (
    <div className="flex items-center px-2 py-3 mb-2">
      <span className="text-xl mr-3">{icon}</span>
      <span className="font-bold text-slate-200 text-sm uppercase tracking-wider">{title}</span>
      <div className="ml-auto w-12 h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
    </div>
  )

  return (
    <aside className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6 sticky top-8 h-fit">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-cyan-400 to-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <span className="text-xl">⚡</span>
        </div>
        <h2 className="text-lg font-bold text-slate-100 mb-1">Control Center</h2>
        <p className="text-xs text-slate-400 font-mono">v2.1.0-alpha</p>
      </div>

      <nav className="space-y-6">
        {/* User Management Section */}
        <div>
          {sectionHeader('User Management', '👥')}
          <div className="space-y-1">
            {item('/admin', 'Overview', '📊')}
            {item('/admin/users', 'All Admins', '👨‍💼')}
            {item('/admin/users/all', 'All Users', '👥')}
            {item('/admin/moderators', 'Moderators', '🛡️')}
            {item('/admin/users/new', 'Add Admin', '➕')}
            {item('/admin/password', 'Change Password', '🔐')}
          </div>
        </div>

        {/* Streaming Section */}
        <div>
          {sectionHeader('Streaming', '📡')}
          <div className="space-y-1">
            {item('/admin/stream', 'Dashboard', '🎮')}
          </div>
        </div>

        {/* Content Section */}
        <div>
          {sectionHeader('Content', '🎬')}
          <div className="space-y-1">
            {item('/admin/content', 'Library', '📚')}
            {item('/admin/content/manage', 'Manage Videos', '📹')}
            {item('/admin/content/scheduling', 'Scheduling', '📅')}
            {item('/admin/content/comments', 'Comments', '💬')}
          </div>
        </div>

        {/* System Section */}
        <div>
          {sectionHeader('System', '⚙️')}
          <div className="space-y-1">
            {item('/admin/system/diagnostics', 'Diagnostics', '🔧')}
            {item('/admin/system', 'Settings', '⚙️')}
          </div>
        </div>

        {/* Audit Section */}
        <div>
          {sectionHeader('Audit', '📋')}
          <div className="space-y-1">
            {item('/admin/audit', 'Audit Log', '📝')}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-slate-700/50">
        <div className="flex items-center justify-center space-x-2 text-slate-500">
          <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></div>
          <span className="text-xs font-mono">SECURE CONNECTION</span>
          <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    </aside>
  )
}
