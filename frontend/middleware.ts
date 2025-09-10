// /opt/surterretube/frontend/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_PREFIX = '/admin'
const LOGIN_PATH = `${ADMIN_PREFIX}/login`

async function verifyJwt(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always let APIs and static assets pass unmodified
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets')
  ) {
    return NextResponse.next()
  }

  // Only guard /admin/* paths
  if (!pathname.startsWith(ADMIN_PREFIX)) {
    return NextResponse.next()
  }

  const token = req.cookies.get('st_admin')?.value

  // Visiting /admin/login:
  // - if already authenticated -> redirect to /admin
  // - otherwise allow reaching the login page
  if (pathname === LOGIN_PATH) {
    if (!token) return NextResponse.next()
    const ok = await verifyJwt(token)
    if (ok) {
      const url = req.nextUrl.clone()
      url.pathname = ADMIN_PREFIX
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Any other /admin path requires a valid token
  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = LOGIN_PATH
    // Optional: remember where to go after login
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  const ok = await verifyJwt(token)
  if (!ok) {
    const url = req.nextUrl.clone()
    url.pathname = LOGIN_PATH
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Only run on /admin/* (keeps /api/* out of middleware)
export const config = {
  matcher: ['/admin/:path*', '/admin'],
}
