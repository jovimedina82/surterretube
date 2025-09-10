// frontend/src/app/admin/layout.tsx
import React from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import '../globals.css'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Futuristic Background Elements */}
      <div className="absolute inset-0 opacity-30">
        {/* Grid Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
        
        {/* Glowing Orbs */}
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Top Status Bar */}
      <div className="relative z-10 border-b border-cyan-500/20 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-emerald-400 text-sm font-mono">SYSTEM ONLINE</span>
              </div>
              <div className="h-4 w-px bg-slate-600"></div>
              <span className="text-slate-400 text-sm font-mono">
                ADMIN CONTROL PANEL v2.1.0
              </span>
            </div>
            <div className="flex items-center space-x-4 text-sm font-mono">
              <span className="text-slate-400">
                {new Date().toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <div className="flex items-center space-x-1">
                <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="relative z-10 flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8 grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <AdminSidebar />
          <div className="min-w-0">
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl shadow-cyan-500/10">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Animated Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/20 rounded-full animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}





