import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

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

interface Comment {
  id: number;
  video_id: number;
  user_sub: string;
  user_name: string;
  comment_text: string;
  parent_comment_id: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * PUT /api/videos/[id]/comments/[commentId]
 * Update a comment (only by the original author)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  const videoId = parseInt(params.id);
  const commentId = parseInt(params.commentId);

  if (isNaN(videoId) || isNaN(commentId)) {
    return NextResponse.json(
      { error: 'Invalid video ID or comment ID' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { comment_text, user_sub } = body;

    // Validate required fields
    if (!comment_text || typeof comment_text !== 'string') {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      );
    }

    if (!user_sub) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Validate comment length
    if (comment_text.length > 2000) {
      return NextResponse.json(
        { error: 'Comment must be 2000 characters or less' },
        { status: 400 }
      );
    }

    if (comment_text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment cannot be empty' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Check if comment exists and belongs to this user
      const commentCheck = await client.query<Comment>(
        `SELECT id, user_sub, video_id
         FROM video_comments
         WHERE id = $1 AND video_id = $2`,
        [commentId, videoId]
      );

      if (commentCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
      }

      const existingComment = commentCheck.rows[0];

      // Verify the user is the author of the comment
      if (existingComment.user_sub !== user_sub) {
        return NextResponse.json(
          { error: 'You can only edit your own comments' },
          { status: 403 }
        );
      }

      // Update the comment
      const result = await client.query<Comment>(
        `UPDATE video_comments
         SET comment_text = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING
           id,
           video_id,
           user_sub,
           user_name,
           comment_text,
           parent_comment_id,
           created_at,
           updated_at`,
        [comment_text.trim(), commentId]
      );

      return NextResponse.json({
        message: 'Comment updated successfully',
        comment: result.rows[0],
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/videos/[id]/comments/[commentId]
 * Delete a comment (admin only via admin panel)
 * Regular users cannot delete comments - only admins can via /api/admin/comments
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  // Comment deletion is only available through the admin panel
  // Regular users cannot delete comments
  return NextResponse.json(
    {
      error: 'Comment deletion is only available to administrators. Please contact an admin to remove inappropriate content.'
    },
    { status: 403 }
  );
}
