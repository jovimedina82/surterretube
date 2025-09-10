import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Middleware to check admin authentication
async function checkAdminAuth(request: NextRequest) {
  try {
    const adminCookie = request.cookies.get('st_admin')
    if (!adminCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return null // Auth passed
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// GET - List all events (with auto-deletion of past events)
export async function GET(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  try {
    // First, delete events that are past (older than today)
    await query(`
      DELETE FROM events 
      WHERE event_date < CURRENT_DATE
    `)
    
    // Then, get the remaining events
    const result = await query(`
      SELECT id, name, event_date, created_at, updated_at, created_by
      FROM events 
      ORDER BY event_date ASC
    `)
    
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Events GET error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// POST - Create new event
export async function POST(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  try {
    const { name, event_date } = await request.json()
    
    if (!name || !event_date) {
      return NextResponse.json({ error: 'Name and event_date are required' }, { status: 400 })
    }

    // Validate date format (should be YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(event_date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    const result = await query(`
      INSERT INTO events (name, event_date, created_by)
      VALUES ($1, $2, $3)
      RETURNING id, name, event_date, created_at, updated_at, created_by
    `, [name.trim(), event_date, 'admin'])
    
    return NextResponse.json({ event: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Events POST error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// PUT - Update existing event
export async function PUT(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  try {
    const { id, name, event_date } = await request.json()
    
    if (!id || !name || !event_date) {
      return NextResponse.json({ error: 'ID, name and event_date are required' }, { status: 400 })
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(event_date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    const result = await query(`
      UPDATE events 
      SET name = $1, event_date = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, event_date, created_at, updated_at, created_by
    `, [name.trim(), event_date, id])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    
    return NextResponse.json({ event: result.rows[0] })
  } catch (error) {
    console.error('Events PUT error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// DELETE - Remove event
export async function DELETE(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  try {
    const { id } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const result = await query(`
      DELETE FROM events WHERE id = $1
      RETURNING id
    `, [id])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Events DELETE error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}