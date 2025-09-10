export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

export async function GET() {
  try {
    const token = cookies().get('st_admin')?.value
    if (!token) return NextResponse.json({ authenticated: false })

    const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)

    return NextResponse.json({
      authenticated: true,
      user: { id: payload.sub, email: payload.email, name: payload.name },
    })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
