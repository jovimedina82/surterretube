import { NextResponse } from "next/server";
import { Pool } from "pg";
import { promises as fsp } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const VOD_DIR = "/mnt/media/vod";
const THUMBS_DIR = path.join(VOD_DIR, "thumbs");
const PUBLISH_JSON = path.join(VOD_DIR, "published.json");

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

type PubIndex = Record<string, boolean>;

async function readPub(): Promise<PubIndex> {
  try {
    const txt = await fsp.readFile(PUBLISH_JSON, "utf8");
    return JSON.parse(txt) as PubIndex;
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const client = await pool.connect();
    const dbVideos = new Map<string, any>();
    const allItems: any[] = [];

    try {
      // 1. Get videos from database
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

      // Store database videos in a map by filename
      result.rows.forEach((row) => {
        const item = {
          id: row.id.toString(), // Numeric ID from database
          file: row.file || row.filename,
          size: row.size,
          mtime: row.mtime,
          url: `/vod/${row.filename}`,
          thumb: row.thumb_filename ? `/vod/thumbs/${row.thumb_filename}` : null,
          hasDbId: true, // Flag to indicate this has a real DB ID
        };
        dbVideos.set(row.filename, item);
        allItems.push(item);
      });

      // 2. Also check published.json for filesystem videos not in database
      const pub = await readPub();
      const publishedFiles = Object.keys(pub).filter((f) => pub[f]);

      for (const file of publishedFiles) {
        // Skip if already in database
        if (dbVideos.has(file)) continue;

        // Add filesystem video
        const mp4 = path.join(VOD_DIR, file);
        const st = await fsp.stat(mp4).catch(() => null);
        if (!st) continue;

        const thumbName = file.replace(/\.mp4$/i, ".jpg");
        const thumbPath = path.join(THUMBS_DIR, thumbName);
        let thumb: string | null = null;
        try {
          await fsp.access(thumbPath);
          thumb = `/vod/thumbs/${thumbName}`;
        } catch {}

        allItems.push({
          id: `fs_${Buffer.from(file).toString('base64')}`, // Use base64 encoded filename as ID
          file,
          size: st.size,
          mtime: st.mtime.toISOString(),
          url: `/vod/${file}`,
          thumb,
          hasDbId: false, // Flag to indicate this is filesystem-only
        });
      }

      // Sort by mtime descending
      allItems.sort((a, b) => {
        const timeA = new Date(a.mtime).getTime();
        const timeB = new Date(b.mtime).getTime();
        return timeB - timeA;
      });

      return NextResponse.json({ ok: true, items: allItems });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Error fetching videos:', e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
