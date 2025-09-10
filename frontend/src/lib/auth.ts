import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

export async function requireAdmin() {
  const token = cookies().get('st_admin')?.value
  if (!token) return null
  try {
    const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    return payload as { sub: string; email: string; name: string; role?: string }
  } catch {
    return null
  }
}
