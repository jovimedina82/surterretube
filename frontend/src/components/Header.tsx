'use client'

import React, { useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import GlobalSignOut from '@/components/GlobalSignOut'

export default function Header() {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthed = useIsAuthenticated()
  const account = instance.getActiveAccount() || accounts[0]

  const signInOrSwitch = useCallback(async () => {
    if (inProgress !== InteractionStatus.None) return // 🔒 do not start another interaction
    try {
      const res = await instance.loginPopup({
        scopes: ['openid', 'profile', 'email'],
        prompt: 'select_account',
      })
      if (res?.account) instance.setActiveAccount(res.account)
    } catch {
      /* user closed popup or blocked it — do nothing */
    }
  }, [instance, inProgress])

  const goAdmin = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/session', { cache: 'no-store' })
      const j = await r.json()
      window.location.href = j.authenticated ? '/admin' : '/admin/login'
    } catch {
      window.location.href = '/admin/login'
    }
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[var(--header-h)]
             bg-gradient-to-r from-[#3d6864] via-[#2d5a56] to-[#1e4742]
             shadow-lg shadow-emerald-500/20 border-b border-emerald-300/20
             backdrop-blur-xl supports-[backdrop-filter]:bg-gradient-to-r supports-[backdrop-filter]:from-[#3d6864]/90 supports-[backdrop-filter]:via-[#2d5a56]/90 supports-[backdrop-filter]:to-[#1e4742]/90
             text-white [&_a]:text-white [&_button]:text-white
             [&_a:hover]:bg-white/15 [&_button:hover]:bg-white/15
             [&_svg]:text-white transition-all duration-300
             before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent before:translate-x-[-100%] before:animate-[shimmer_3s_ease-in-out_infinite]
             overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full opacity-30 group-hover:opacity-60 blur-sm animate-pulse transition-opacity duration-300"></div>
            <div className="absolute -inset-0.5 bg-gradient-to-r from-white/40 to-white/20 rounded-full animate-spin-slow"></div>
            <Image src="/play-logo.png" alt="SurterreTube avatar" width={50} height={50}
                   className="relative rounded-full ring-2 ring-white/40 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 shadow-lg" priority />
          </div>
          <Link href="/" className="block rounded-xl p-2 transition-all duration-200 hover:bg-white/10 hover:scale-105">
            <Image src="/wordmark.png" alt="SurterreTube" width={140} height={40} priority className="drop-shadow-sm" />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {isAuthed ? (
            <>
              <span className="text-sm hidden sm:inline">{account?.name}</span>
              <button onClick={signInOrSwitch}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-white/15 to-white/10 hover:from-white/25 hover:to-white/20 transition-all duration-200 hover:scale-105 shadow-sm backdrop-blur-sm border border-white/20">
                Switch
              </button>
              <GlobalSignOut redirectTo="/" />
              <button onClick={goAdmin}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-400/30 hover:to-teal-400/30 transition-all duration-200 hover:scale-105 shadow-sm backdrop-blur-sm border border-emerald-300/30"
                      aria-label="Admin">
                ⚙️ Admin
              </button>
            </>
          ) : (
            <button onClick={signInOrSwitch}
                    disabled={inProgress !== InteractionStatus.None}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-60 transition-all duration-200 hover:scale-105 shadow-lg font-medium">
              🚀 Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
