'use client'

export default function AdminSignOut({ redirectTo = '/admin/login' }) {
  const signOut = async () => {
    // clears the st_admin cookie server-side
    try { await fetch('/api/admin/logout', { method: 'POST' }) } catch {}
    // send user to admin login (or wherever you pass via redirectTo)
    window.location.href = redirectTo
  };

  return (
    <button
      onClick={signOut}
      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20"
    >
      Sign out
    </button>
  );
}
