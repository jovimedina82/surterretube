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
  replies?: Comment[];
}

/**
 * GET /api/videos/[id]/comments
 * Retrieve all comments for a specific video
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const videoId = parseInt(params.id);

  if (isNaN(videoId)) {
    return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
  }

  try {
    const client = await pool.connect();

    try {
      // Verify video exists
      const videoCheck = await client.query(
        'SELECT id FROM admin_videos WHERE id = $1',
        [videoId]
      );

      if (videoCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }

      // Get all comments for this video
      const result = await client.query<Comment>(
        `SELECT
          id,
          video_id,
          user_sub,
          user_name,
          comment_text,
          parent_comment_id,
          created_at,
          updated_at
        FROM video_comments
        WHERE video_id = $1
        ORDER BY created_at ASC`,
        [videoId]
      );

      // Organize comments into a tree structure (top-level comments + replies)
      const commentMap = new Map<number, Comment>();
      const topLevelComments: Comment[] = [];

      // First pass: create all comment objects
      result.rows.forEach((comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      // Second pass: organize into tree structure
      result.rows.forEach((comment) => {
        const commentObj = commentMap.get(comment.id)!;

        if (comment.parent_comment_id) {
          // This is a reply, add it to parent's replies array
          const parent = commentMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies!.push(commentObj);
          }
        } else {
          // This is a top-level comment
          topLevelComments.push(commentObj);
        }
      });

      return NextResponse.json({
        video_id: videoId,
        comments: topLevelComments,
        total_count: result.rows.length,
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
 * POST /api/videos/[id]/comments
 * Add a new comment to a video
 * Requires authenticated user (Microsoft Entra ID token)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const videoId = parseInt(params.id);

  if (isNaN(videoId)) {
    return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { comment_text, parent_comment_id, user_sub, user_name } = body;

    // Validate required fields
    if (!comment_text || typeof comment_text !== 'string') {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      );
    }

    if (!user_sub || !user_name) {
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
      // Verify video exists
      const videoCheck = await client.query(
        'SELECT id FROM admin_videos WHERE id = $1',
        [videoId]
      );

      if (videoCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }

      // If this is a reply, verify parent comment exists
      if (parent_comment_id) {
        const parentCheck = await client.query(
          'SELECT id FROM video_comments WHERE id = $1 AND video_id = $2',
          [parent_comment_id, videoId]
        );

        if (parentCheck.rows.length === 0) {
          return NextResponse.json(
            { error: 'Parent comment not found' },
            { status: 404 }
          );
        }
      }

      // Insert the comment
      const result = await client.query<Comment>(
        `INSERT INTO video_comments
          (video_id, user_sub, user_name, comment_text, parent_comment_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          video_id,
          user_sub,
          user_name,
          comment_text,
          parent_comment_id,
          created_at,
          updated_at`,
        [videoId, user_sub, user_name, comment_text.trim(), parent_comment_id || null]
      );

      return NextResponse.json(
        {
          message: 'Comment added successfully',
          comment: result.rows[0],
        },
        { status: 201 }
      );

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}
