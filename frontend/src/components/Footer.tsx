'use client'
export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 h-[var(--footer-h)]
                       border-t bg-white/90 backdrop-blur
                       supports-[backdrop-filter]:bg-white/70">
      <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between text-xs text-gray-600 relative">
        <span>© {year} SurterreTube</span>

        {/* centered company site */}
        <a
          href="https://www.surterreproperties.com"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute left-1/2 -translate-x-1/2 hover:underline"
        >
          www.surterreproperties.com
        </a>

        <nav className="space-x-4">
          <a href="/privacy" className="hover:underline">Privacy</a>
          <a href="/terms" className="hover:underline">Terms</a>
          <a href="mailto:helpdesk@surterreproperties.com" className="hover:text-[var(--primary)]">Contact</a>
        </nav>
      </div>
    </footer>
  )
}
