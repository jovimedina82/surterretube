// src/components/GlobalSignOut.tsx
'use client'
import { useMsal } from '@azure/msal-react'

type Props = { redirectTo?: string }

export default function GlobalSignOut({ redirectTo = '/' }: Props) {
  const { instance, accounts } = useMsal()

  const onClick = async () => {
    // clear admin cookie
    try { await fetch('/api/admin/logout', { method: 'POST' }) } catch {}
    // sign out MSAL (if configured)
    try { await instance.logoutRedirect({ account: accounts[0] }) }
    catch { window.location.href = redirectTo }
  }

  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500/20 to-pink-500/20 hover:from-red-400/30 hover:to-pink-400/30 transition-all duration-200 hover:scale-105 shadow-sm backdrop-blur-sm border border-red-300/30"
    >
      🚪 Sign out
    </button>
  )
}
