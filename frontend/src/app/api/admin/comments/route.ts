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

interface Comment {
  id: number;
  video_id: number;
  video_filename: string;
  user_sub: string;
  user_name: string;
  comment_text: string;
  parent_comment_id: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/admin/comments
 * Get all comments (admin only) with pagination and filtering
 */
export async function GET(request: NextRequest) {
  // Verify admin authentication
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const videoId = searchParams.get('video_id');
  const search = searchParams.get('search') || '';

  try {
    const client = await pool.connect();

    try {
      let query = `
        SELECT
          vc.id,
          vc.video_id,
          av.filename as video_filename,
          vc.user_sub,
          vc.user_name,
          vc.comment_text,
          vc.parent_comment_id,
          vc.created_at,
          vc.updated_at
        FROM video_comments vc
        JOIN admin_videos av ON vc.video_id = av.id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (videoId) {
        query += ` AND vc.video_id = $${paramIndex}`;
        params.push(parseInt(videoId));
        paramIndex++;
      }

      if (search) {
        query += ` AND (vc.comment_text ILIKE $${paramIndex} OR vc.user_name ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      query += ` ORDER BY vc.created_at DESC`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await client.query<Comment>(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM video_comments vc
        WHERE 1=1
      `;
      const countParams: any[] = [];
      let countParamIndex = 1;

      if (videoId) {
        countQuery += ` AND vc.video_id = $${countParamIndex}`;
        countParams.push(parseInt(videoId));
        countParamIndex++;
      }

      if (search) {
        countQuery += ` AND (vc.comment_text ILIKE $${countParamIndex} OR vc.user_name ILIKE $${countParamIndex})`;
        countParams.push(`%${search}%`);
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0]?.total || '0');

      return NextResponse.json({
        comments: result.rows,
        total,
        limit,
        offset,
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/comments
 * Delete a comment by ID (admin only)
 */
export async function DELETE(request: NextRequest) {
  // Verify admin authentication
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { comment_id } = body;

    if (!comment_id || isNaN(parseInt(comment_id))) {
      return NextResponse.json(
        { error: 'Invalid comment ID' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Delete the comment (CASCADE will delete replies)
      const result = await client.query(
        'DELETE FROM video_comments WHERE id = $1 RETURNING id',
        [parseInt(comment_id)]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
      }

      return NextResponse.json({
        message: 'Comment deleted successfully',
        deleted_id: parseInt(comment_id),
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
