import './globals.css'
import Providers from './providers'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen">
        <Providers>
          {/* Fixed header */}
          <Header />

          {/* Content is padded so it never sits under header/footer */}
          <main className="min-h-[calc(100vh-var(--header-h)-var(--footer-h))] pt-[var(--header-h)] pb-[var(--footer-h)]">
            {children}
          </main>

          {/* Fixed footer */}
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

