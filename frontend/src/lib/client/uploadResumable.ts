// src/lib/client/uploadResumable.ts
export type UploadProgress = {
  sentBytes: number;
  totalBytes: number;
  percent: number;
};

/**
 * Upload a File to /api/admin/videos in resumable 8MB chunks,
 * then POST a finalize request.
 */
export async function uploadResumable(
  file: File,
  displayName: string,
  onProgress?: (p: UploadProgress) => void,
  signal?: AbortSignal
) {
  const CHUNK = 8 * 1024 * 1024; // 8 MB
  const total = file.size;
  const totalChunks = Math.ceil(total / CHUNK);
  const uploadId = crypto.randomUUID();

  let sent = 0;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK;
    const end = Math.min(start + CHUNK, total);
    const chunk = file.slice(start, end);

    const res = await fetch("/api/admin/videos", {
      method: "PUT",
      headers: {
        "x-upload-id": uploadId,
        "x-chunk-index": String(i),
        "x-chunks-total": String(totalChunks),
        "x-chunk-size": String(CHUNK),
        "x-file-name": file.name,
        "x-file-size": String(total),
        "Content-Type": "application/octet-stream",
      },
      body: chunk,
      signal,
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`Chunk ${i + 1}/${totalChunks} failed: ${msg}`);
    }

    sent = end;
    onProgress?.({
      sentBytes: sent,
      totalBytes: total,
      percent: Math.round((sent / total) * 10000) / 100, // 2 decimals
    });
  }

  // Finalize
  const finalize = await fetch("/api/admin/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uploadId,
      filename: file.name,
      displayName,
      mimeType: file.type,
      size: file.size,
    }),
    signal,
  });

  if (!finalize.ok) {
    const msg = await finalize.text().catch(() => finalize.statusText);
    throw new Error(`Finalize failed: ${msg}`);
  }

  return finalize.json();
}
