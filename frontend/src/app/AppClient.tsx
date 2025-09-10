'use client'

import React, { useEffect, useRef } from 'react'
import PlayerCard from '@/components/PlayerCard'
import ChatCard from '@/components/ChatCard'
import PublishedVideos from '@/components/PublishedVideos'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { EventType, AuthenticationResult, InteractionStatus } from '@azure/msal-browser'

function AuthGate({ children }: { children: React.ReactNode }) {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthed = useIsAuthenticated()
  const kickedOff = useRef(false)

  useEffect(() => {
    const id = instance.addEventCallback((evt) => {
      if (
        evt.eventType === EventType.LOGIN_SUCCESS ||
        evt.eventType === EventType.ACQUIRE_TOKEN_SUCCESS
      ) {
        const payload = evt.payload as AuthenticationResult
        if (payload?.account) instance.setActiveAccount(payload.account)
      }
    })
    return () => {
      if (id) instance.removeEventCallback(id)
    }
  }, [instance])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (inProgress !== InteractionStatus.None) return
    const active = instance.getActiveAccount() || accounts[0]
    if (!active && !kickedOff.current) {
      kickedOff.current = true
      instance
        .loginRedirect({ scopes: ['openid', 'profile', 'email'], prompt: 'select_account' })
        .catch(() => {
          kickedOff.current = false
        })
    } else if (active) {
      instance.setActiveAccount(active)
    }
  }, [inProgress, instance, accounts])

  if (!isAuthed) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-gray-500">
        Redirecting to Microsoft…
      </div>
    )
  }
  return <>{children}</>
}

function Shell() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-200/20 to-teal-300/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-cyan-200/20 to-emerald-300/20 rounded-full blur-3xl animate-float" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-gradient-to-br from-teal-300/10 to-emerald-400/10 rounded-full blur-2xl animate-float" style={{animationDelay: '0.8s'}}></div>
      </div>
      
      <div className="relative max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
      {/* Player (2/3 on large screens) */}
      <div className="lg:col-span-2 h-full min-h-0">
        <PlayerCard />
      </div>

      {/* Chat (1/3 on large screens) */}
      <div className="lg:col-span-1 h-full min-h-0">
        <ChatCard autoConnect />
      </div>

      {/* Published videos shelf (full width row below player/chat) */}
      <div className="lg:col-span-3">
        <section className="bg-white/80 backdrop-blur-sm border border-emerald-100/50 rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300">
          <PublishedVideos />
        </section>
      </div>
    </div>
    </div>
  )
}

export default function AppClient() {
  return (
    <AuthGate>
      <Shell />
    </AuthGate>
  )
}
