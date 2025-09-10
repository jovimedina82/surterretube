"use client";

import React, { useEffect, useRef, useState } from "react";

// --- small helpers ---
const chunkSize = 8 * 1024 * 1024; // 8 MB
const fmtBytes = (n: number) => {
  if (!Number.isFinite(n)) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

type Item = {
  id: string;
  file: string;
  size: number;
  mtime: string;
  url: string;
  thumb: string | null;
  published: boolean; // ⬅️ NEW
};


export default function ContentLibraryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    "idle"
  );
  const abortRef = useRef<AbortController | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch library
  const fetchList = async () => {
    setErr(null);
    setLoadingList(true);
    try {
      const r = await fetch("/api/admin/videos", { credentials: "include" });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`HTTP ${r.status}: ${txt}`);
      }
      const j = await r.json();
      setItems(j.items || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load library");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // Drag & drop styles/handlers
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onPrevent = (ev: Event) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    const onEnter = (ev: Event) => {
      onPrevent(ev);
      el.classList.add("dragging");
    };
    const onLeave = (ev: Event) => {
      onPrevent(ev);
      el.classList.remove("dragging");
    };
    const onDrop = (ev: Event) => {
      onPrevent(ev);
      el.classList.remove("dragging");
      const dragEv = ev as DragEvent;
      const f = dragEv.dataTransfer?.files?.[0];
      if (f) {
        setFile(f);
        setStatus("idle");
        setPct(0);
      }
    };

    ["dragenter", "dragover"].forEach((t) => el.addEventListener(t, onEnter));
    ["dragleave", "dragend"].forEach((t) => el.addEventListener(t, onLeave));
    el.addEventListener("drop", onDrop);

    return () => {
      ["dragenter", "dragover"].forEach((t) =>
        el.removeEventListener(t, onEnter)
      );
      ["dragleave", "dragend"].forEach((t) =>
        el.removeEventListener(t, onLeave)
      );
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  const chooseFile = () => fileInputRef.current?.click();

  const cancelUpload = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setStatus("idle");
    setPct(0);
  };

  const startUpload = async () => {
    if (!file || busy) return;
    setBusy(true);
    setStatus("uploading");
    setPct(0);
    const controller = new AbortController();
    abortRef.current = controller;

    const uploadId = uid();

    try {
      const totalChunks = Math.ceil(file.size / chunkSize);
      let sent = 0;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const blob = file.slice(start, end);
        const buf = await blob.arrayBuffer();

        // retry up to 3x for each chunk
        let ok = false,
          attempt = 0;
        while (!ok && attempt < 3) {
          attempt++;
          try {
            const r = await fetch("/api/admin/videos", {
              method: "POST",
              body: buf,
              credentials: "include",
              headers: {
                "Content-Type": "application/octet-stream",
                "X-Upload-Id": uploadId,
                "X-File-Name": encodeURIComponent(file.name),
                "X-Chunk-Index": String(i),
                "X-Chunk-Final": i === totalChunks - 1 ? "1" : "0",
              },
              signal: controller.signal,
            });
            if (!r.ok) throw new Error(`Chunk ${i + 1}/${totalChunks} failed`);
            ok = true;

            // If it was the final chunk, the server returns the refreshed list
            if (i === totalChunks - 1) {
              const j = await r.json();
              if (j.items) setItems(j.items);
            }
          } catch (e) {
            if (attempt >= 3) throw e;
            await sleep(800 * attempt);
          }
        }

        sent = end;
        setPct(Math.round((sent / file.size) * 100));
      }

      setStatus("done");
      setTimeout(() => {
        setFile(null);
        setPct(0);
        setStatus("idle");
      }, 900);
    } catch (e: any) {
      if (controller.signal.aborted) {
        // cancelled
      } else {
        console.error(e);
        setStatus("error");
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  // Actions on cards
  const openItem = (it: Item) => window.open(it.url, "_blank");

  const renameItem = async (it: Item) => {
    const input = prompt("New file name (with or without .mp4):", it.file);
    if (!input || input === it.file) return;
    const r = await fetch("/api/admin/videos", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: it.file, to: input }),
    });
    if (!r.ok) {
      alert("Rename failed");
      return;
    }
    const j = await r.json();
    setItems(j.items || []);
  };

  const deleteItem = async (it: Item) => {
    if (!confirm(`Delete "${it.file}"?`)) return;
    const r = await fetch("/api/admin/videos", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: it.file }),
    });
    if (!r.ok) {
      alert("Delete failed");
      return;
    }
    const j = await r.json();
    setItems(j.items || []);
  };

  const togglePublish = async (it: Item) => {
    const next = !it.published;
    const r = await fetch("/api/admin/videos/publish", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: it.file, published: next }),
    });
    if (!r.ok) {
      alert("Failed to toggle publish");
      return;
    }
    // Re-fetch to reflect the new state
    await fetchList();
  };
  

  return (
    <div className="page">
      <h1>Content Library</h1>
      <h2>📹 Video Upload</h2>

      {/* Uploader */}
      <div ref={dropRef} className="uploader">
        <div className="row">
          {/* Browse button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              setStatus("idle");
              setPct(0);
            }}
          />
          <button
            className="btn"
            type="button"
            onClick={chooseFile}
            disabled={busy}
            aria-label="Choose file"
          >
            Browse file…
          </button>

          <div className="fileText">
            {file ? file.name : "No file selected"}
          </div>

          <button
            className={`btn ${file && !busy ? "primary" : "disabled"}`}
            type="button"
            disabled={!file || busy}
            onClick={startUpload}
          >
            Start upload
          </button>

          <button
            className={`btn ${busy ? "danger" : ""}`}
            type="button"
            disabled={!busy}
            onClick={cancelUpload}
          >
            Cancel
          </button>
        </div>

        {/* Helper text */}
        <div className="help">
          You can also drag &amp; drop a video anywhere on this box. Large files
          are split into 8&nbsp;MB chunks and streamed to{" "}
          <code>/api/admin/videos</code>. Each chunk retries up to 3× on
          transient errors. On the last chunk the server concatenates and makes
          a thumbnail.
        </div>

        {/* Progress */}
        <div className="progressWrap" aria-hidden={status === "idle"}>
          <div className="bar">
            <div
              className={`fill ${status}`}
              style={{ width: `${pct}%` }}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              role="progressbar"
            />
          </div>
          <div className="progressText">
            {status === "uploading" && file
              ? `${pct}%  •  ${fmtBytes(file.size)}`
              : status === "done"
              ? "100% — Done!"
              : status === "error"
              ? "Something went wrong"
              : " "}
          </div>
        </div>
      </div>

      {/* Library */}
      <div className="libHeader">
        <h2>📚 Content Library</h2>
        <button className="btn" onClick={fetchList} disabled={loadingList}>
          {loadingList ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {err && <div className="error">Error: {err}</div>}

      <div className="grid">
        {items.map((it) => (
          <div className="card" key={it.id}>
            <div className="thumb">
              {it.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.thumb} alt={it.file} />
              ) : (
                <div className="noThumb">No thumbnail</div>
              )}
            </div>
            <div className="meta">
              <div className="name" title={it.file}>
                {it.file}
              </div>

              <div className="subRow">
                <div className="sub">
                  {new Date(it.mtime).toLocaleString()} · {fmtBytes(it.size)}
                </div>
                <span className={`pill ${it.published ? "on" : "off"}`}>
                  {it.published ? "Published" : "Unpublished"}
                </span>
              </div>

              <div className="actions">
                <button
                  className={`btn ${it.published ? "muted" : "primary"}`}
                  onClick={() => togglePublish(it)}
                  title={it.published ? "Unpublish" : "Publish"}
                >
                  {it.published ? "Unpublish" : "Publish"}
                </button>
                <button className="btn" onClick={() => openItem(it)}>
                  Open
                </button>
                <button className="btn" onClick={() => renameItem(it)}>
                  Rename
                </button>
                <button className="btn danger" onClick={() => deleteItem(it)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && !loadingList && (
          <div className="empty">No videos yet. Use the upload above.</div>
        )}
      </div>

      {/* styles */}
      <style jsx>{`
        
.page {
          padding: 12px 18px 48px;
          max-width: 1100px;
        }
        h1 {
          font-size: 28px;
          margin: 0 0 14px;
        }
        h2 {
          font-size: 22px;
          margin: 0;
        }

        .uploader {
          border: 2px dashed #b9c3cf;
          border-radius: 14px;
          padding: 16px;
          background: #fafcff;
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
          margin-bottom: 18px;
        }
        .uploader.dragging {
          border-color: #4f8cff;
          box-shadow: 0 0 0 4px rgba(79, 140, 255, 0.12);
          background: #f7fbff;
        }
        .row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .fileText {
          min-width: 200px;
          color: #4b5563;
        }
        .help {
          margin-top: 10px;
          color: #6b7280;
          font-size: 14px;
        }

        .progressWrap {
          margin-top: 14px;
        }
        .bar {
          height: 10px;
          background: #e5e7eb;
          border-radius: 999px;
          overflow: hidden;
        }
        .fill {
          height: 100%;
          width: 0%;
          background: #16a34a; /* green */
          transition: width 0.2s ease;
        }
        .fill.error {
          background: #dc2626; /* red */
        }
        .progressText {
          margin-top: 6px;
          font-size: 13px;
          color: #4b5563;
        }

        .libHeader {
          margin: 8px 0 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .error {
          color: #b91c1c;
          background: #fee2e2;
          border: 1px solid #fecaca;
          padding: 10px 12px;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
        .card {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
          display: flex;
          flex-direction: column;
        }
        .thumb {
          aspect-ratio: 16/9;
          background: #f3f4f6;
          display: grid;
          place-items: center;
        }
        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .noThumb {
          color: #9ca3af;
          font-size: 14px;
        }
        .meta {
          padding: 10px 12px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .name {
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sub {
          color: #6b7280;
          font-size: 13px;
        }
        .subRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .actions {
          display: flex;
          gap: 8px;
          margin-top: 2px;
          flex-wrap: wrap;
        }

        .btn {
          appearance: none;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #1f2937;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 14px;
          line-height: 1;
          cursor: pointer;
          transition: background 0.12s ease, box-shadow 0.12s ease,
            border-color 0.12s ease, color 0.12s ease;
        }
        .btn:hover {
          background: #f8fafc;
        }
        .btn:disabled,
        .btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn.primary {
          background: #2563eb;
          color: #fff;
          border-color: #2563eb;
        }
        .btn.primary:hover {
          background: #1d4ed8;
        }
        .btn.danger {
          background: #ef4444;
          border-color: #ef4444;
          color: #fff;
        }
        .btn.danger:hover {
          background: #dc2626;
          border-color: #dc2626;
        }
        .btn.muted {
          background: #f3f4f6;
          border-color: #cbd5e1;
          color: #111827;
        }

        .pill {
          font-size: 12px;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid;
          line-height: 1;
          white-space: nowrap;
        }
        .pill.on {
          color: #065f46;
          background: #d1fae5;
          border-color: #10b981;
        }
        .pill.off {
          color: #6b7280;
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .empty {
          color: #6b7280;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          padding: 22px;
          text-align: center;
          grid-column: 1 / -1;
          background: #fafafa;
        }
        

      `}</style>
    </div>
  );
}
