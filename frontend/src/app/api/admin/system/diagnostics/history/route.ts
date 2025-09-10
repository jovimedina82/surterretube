import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);

  const { rows } = await query(
    `SELECT id, created_at, domain, stream_id, hls_url, status_ok, status_warn, status_fail, details
       FROM public.admin_diag_runs
       ORDER BY id DESC
       LIMIT $1`,
    [limit],
  );

  return NextResponse.json({ rows });
}
