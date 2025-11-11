import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'surterre',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'surterretube_prod',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// JWT Secret
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'surterretube_secret_key_changeme'
);

// Verify admin token
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('st_admin')?.value;
    if (!token) return false;

    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/videos/all
 * Get ALL videos (published and unpublished) for admin management
 */
export async function GET(request: NextRequest) {
  // Verify admin authentication
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = await pool.connect();

    try {
      // Get all videos from database (published and unpublished)
      const result = await client.query(
        `SELECT
          id,
          filename,
          display_name,
          size_bytes,
          uploaded_at,
          thumb_filename,
          is_published
        FROM admin_videos
        ORDER BY uploaded_at DESC`
      );

      const videos = result.rows.map((row) => ({
        id: row.id,
        filename: row.filename,
        display_name: row.display_name,
        size_bytes: row.size_bytes,
        uploaded_at: row.uploaded_at,
        thumb_filename: row.thumb_filename,
        is_published: row.is_published,
        url: `/vod/${encodeURIComponent(row.filename)}`,
        thumb: row.thumb_filename ? `/vod/thumbs/${encodeURIComponent(row.thumb_filename)}` : null,
      }));

      return NextResponse.json({ ok: true, videos });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching all videos:', error);
    return NextResponse.json(
      { ok: false, error: 'server_error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/videos/all
 * Update video details (display_name, is_published)
 */
export async function PUT(request: NextRequest) {
  // Verify admin authentication
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, display_name, is_published } = body;

    if (!id) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      // Build update query dynamically based on provided fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (display_name !== undefined) {
        updates.push(`display_name = $${paramIndex}`);
        values.push(display_name);
        paramIndex++;
      }

      if (is_published !== undefined) {
        updates.push(`is_published = $${paramIndex}`);
        values.push(is_published);
        paramIndex++;
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      values.push(id);
      const query = `
        UPDATE admin_videos
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, filename, display_name, is_published
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        message: 'Video updated successfully',
        video: result.rows[0],
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating video:', error);
    return NextResponse.json(
      { ok: false, error: 'server_error' },
      { status: 500 }
    );
  }
}
