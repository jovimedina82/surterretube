import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const VOD_DIR = "/mnt/media/vod";

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

export async function GET() {
  try {
    const client = await pool.connect();

    try {
      // Query published videos from database
      const result = await client.query(
        `SELECT
          id,
          filename,
          display_name as file,
          size_bytes as size,
          uploaded_at as mtime,
          thumb_filename
        FROM admin_videos
        ORDER BY uploaded_at DESC`
      );

      const items = result.rows.map((row) => ({
        id: row.id.toString(), // Convert numeric ID to string for compatibility
        file: row.file || row.filename,
        size: row.size,
        mtime: row.mtime,
        url: `/vod/${row.filename}`,
        thumb: row.thumb_filename ? `/vod/thumbs/${row.thumb_filename}` : null,
      }));

      return NextResponse.json({ ok: true, items });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Error fetching videos from database:', e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
