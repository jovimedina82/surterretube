import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Force dynamic rendering and no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Get upcoming events (public endpoint)
export async function GET() {
  try {
    const result = await query(`
      SELECT id, name, event_date
      FROM events 
      WHERE event_date >= CURRENT_DATE
      ORDER BY event_date ASC
      LIMIT 5
    `)
    
    const response = NextResponse.json({ events: result.rows })
    
    // Add cache control headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')
    
    return response
  } catch (error) {
    console.error('Upcoming events error:', error)
    return NextResponse.json({ error: 'Database error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}