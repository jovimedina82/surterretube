'use client';

import { useEffect, useState } from 'react';

type Row = {
  id: number;
  created_at: string;
  domain: string | null;
  stream_id: string | null;
  hls_url: string | null;
  status_ok: number;
  status_warn: number;
  status_fail: number;
  details: unknown;
};

export default function DiagnosticsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const r = await fetch('/api/admin/system/diagnostics/history?limit=10', { cache: 'no-store' });
      if (!r.ok) throw new Error(`history ${r.status}`);
      const data = (await r.json()) as { rows: Row[] };
      setRows(data.rows);
    } catch (e: any) {
      setErr(e.message || 'failed to load history');
      setRows([]);
    }
  }

  async function run() {
    setLoading(true);
    setErr(null);
    setFlash(null);
    try {
      const r = await fetch('/api/admin/system/diagnostics/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(body?.error || `run ${r.status}`);
      setFlash('Checks completed and saved.');
      await load();
    } catch (e: any) {
      setErr(e.message || 'run failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="px-6 py-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">System diagnostics</h1>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-md bg-emerald-600 text-white px-4 py-2 disabled:opacity-60"
        >
          {loading ? 'Running…' : 'Run checks'}
        </button>
      </div>

      <p className="mt-3 text-sm text-gray-600">
        Checks Nginx, RTMPS (stunnel4), SRS, Chat API, Next.js UI, storage and Postgres. Results are
        saved; the latest 10 runs are shown below.
      </p>

      {flash && <div className="mt-4 text-emerald-700">{flash}</div>}
      {err && <div className="mt-4 text-red-600">Error: {err}</div>}

      <div className="mt-6 border rounded-xl p-4">
        {rows === null ? (
          <div className="text-gray-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-gray-500">No previous runs. Click “Run checks”.</div>
        ) : (
          <ul className="space-y-4">
            {rows.map((r) => (
              <li key={r.id} className="border rounded-lg p-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-sm text-gray-500">
                    <b>When:</b> {new Date(r.created_at).toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">
                    <b>Domain:</b> {r.domain || '—'}
                  </span>
                  <span className="text-sm text-gray-500">
                    <b>Stream:</b> {r.stream_id || '—'}
                  </span>
                  {r.hls_url && (
                    <a
                      href={r.hls_url}
                      target="_blank"
                      className="text-sm text-blue-700 underline"
                    >
                      HLS
                    </a>
                  )}
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-emerald-700">OK: {r.status_ok}</span>{' '}
                  <span className="text-amber-700">Warn: {r.status_warn}</span>{' '}
                  <span className="text-red-700">Fail: {r.status_fail}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
