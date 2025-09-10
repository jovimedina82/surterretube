import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { promises as fsp } from "fs";
import path from "path";
import { spawn } from "child_process";

export const dynamic = "force-dynamic";

const VOD_DIR = "/mnt/media/vod";
const FILES_DIR = path.join(VOD_DIR, "files");
const THUMBS_DIR = path.join(VOD_DIR, "thumbs");
const PUBLISH_JSON = path.join(VOD_DIR, "published.json");

type PubIndex = Record<string, boolean>;

function ok(data: any = {}) {
  return NextResponse.json({ ok: true, ...data });
}
function bad(error = "bad_request", status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function safeBase(name: string) {
  const base = name.replace(/\.[^.]+$/, "");
  const ext = ".mp4";
  const s = base.replace(/[^a-zA-Z0-9 \-_.]/g, "").trim() || "video";
  return s.endsWith(".mp4") ? s : s + ext;
}

async function ensureDirs() {
  await fsp.mkdir(VOD_DIR, { recursive: true });
  await fsp.mkdir(FILES_DIR, { recursive: true });
  await fsp.mkdir(THUMBS_DIR, { recursive: true });
}

async function readPub(): Promise<PubIndex> {
  try {
    const txt = await fsp.readFile(PUBLISH_JSON, "utf8");
    return JSON.parse(txt) as PubIndex;
  } catch {
    return {};
  }
}

async function writePub(pub: PubIndex) {
  const tmp = PUBLISH_JSON + ".tmp";
  await fsp.writeFile(tmp, JSON.stringify(pub, null, 2));
  await fsp.rename(tmp, PUBLISH_JSON);
}

async function listVideos() {
  await ensureDirs();
  const pub = await readPub();
  const names = await fsp.readdir(VOD_DIR);
  const mp4s = names.filter((n) => n.toLowerCase().endsWith(".mp4"));
  const items = await Promise.all(
    mp4s.map(async (file) => {
      const p = path.join(VOD_DIR, file);
      const st = await fsp.stat(p);
      const thumbName = file.replace(/\.mp4$/i, ".jpg");
      const thumbPath = path.join(THUMBS_DIR, thumbName);
      let thumb: string | null = null;
      try {
        await fsp.access(thumbPath);
        thumb = `/vod/thumbs/${thumbName}`;
      } catch {}
      return {
        id: file,
        file,
        size: st.size,
        mtime: st.mtime.toISOString(),
        url: `/vod/${file}`,
        thumb,
        published: !!pub[file],
      };
    })
  );
  items.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
  return items;
}

async function concatPartsToFile(partsDir: string, outFile: string) {
  const names = await fsp.readdir(partsDir);
  const parts = names
    .filter((n) => n.endsWith(".part"))
    .sort((a, b) => {
      const ai = parseInt(a.split(".")[0] || "0", 10);
      const bi = parseInt(b.split(".")[0] || "0", 10);
      return ai - bi;
    });

  await fsp.writeFile(outFile, new Uint8Array(0));
  for (const n of parts) {
    const buf = await fsp.readFile(path.join(partsDir, n));
    await fsp.appendFile(outFile, buf);
  }
}

async function makeThumb(inFile: string, outJpg: string) {
  await new Promise<void>((res, rej) => {
    const ff = spawn("ffmpeg", ["-y", "-ss", "00:00:01", "-i", inFile, "-frames:v", "1", outJpg]);
    ff.on("error", rej);
    ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exit ${code}`))));
  });
}

/* ---------- GET: list library ---------- */
export async function GET(req: NextRequest) {
  await requireAdmin(req);
  try {
    const items = await listVideos();
    return ok({ items });
  } catch (e) {
    console.error(e);
    return bad("server_error", 500);
  }
}

/* ---------- POST: chunked upload ---------- */
export async function POST(req: NextRequest) {
  await requireAdmin(req);
  try {
    await ensureDirs();

    const uploadId = req.headers.get("x-upload-id") || "";
    const encName = req.headers.get("x-file-name") || "";
    const finalFlag = req.headers.get("x-chunk-final") === "1";
    const idxStr = req.headers.get("x-chunk-index") || "0";

    if (!uploadId || !encName) return bad("missing_headers", 400);

    const decodedName = decodeURIComponent(encName);
    const safeName = safeBase(decodedName);

    const sessionDir = path.join(FILES_DIR, uploadId);
    const partsDir = path.join(sessionDir, "parts");
    await fsp.mkdir(partsDir, { recursive: true });

    const body = Buffer.from(await req.arrayBuffer());
    const idx = parseInt(idxStr, 10) || 0;
    const partPath = path.join(partsDir, `${idx}.part`);
    await fsp.writeFile(partPath, body);

    if (finalFlag) {
      const outMp4 = path.join(VOD_DIR, safeName);
      await concatPartsToFile(partsDir, outMp4);

      const jpgName = safeName.replace(/\.mp4$/i, ".jpg");
      const outJpg = path.join(THUMBS_DIR, jpgName);
      try {
        await makeThumb(outMp4, outJpg);
      } catch (e) {
        console.warn("ffmpeg thumbnail failed:", e);
      }
      try {
        await fsp.rm(sessionDir, { recursive: true, force: true });
      } catch {}

      const items = await listVideos();
      return ok({ finalized: true, items });
    }

    return ok({ received: true });
  } catch (e) {
    console.error(e);
    return bad("upload_failed", 500);
  }
}

/* ---------- DELETE: remove a file ---------- */
export async function DELETE(req: NextRequest) {
  await requireAdmin(req);
  try {
    const { file } = (await req.json().catch(() => ({}))) as { file?: string };
    if (!file || !/\.mp4$/i.test(file)) return bad("invalid_file");

    const mp4 = path.join(VOD_DIR, path.basename(file));
    const jpg = path.join(THUMBS_DIR, path.basename(file).replace(/\.mp4$/i, ".jpg"));

    try {
      await fsp.unlink(mp4);
    } catch {}
    try {
      await fsp.unlink(jpg);
    } catch {}

    // remove publish flag if present
    const pub = await readPub();
    if (pub[file]) {
      delete pub[file];
      await writePub(pub);
    }

    const items = await listVideos();
    return ok({ items });
  } catch (e) {
    console.error(e);
    return bad("delete_failed", 500);
  }
}

/* ---------- PATCH: rename a file ---------- */
export async function PATCH(req: NextRequest) {
  await requireAdmin(req);
  try {
    const { from, to } = (await req.json().catch(() => ({}))) as {
      from?: string
      to?: string
    };
    if (!from || !/\.mp4$/i.test(from)) return bad("invalid_from");
    if (!to) return bad("invalid_to");

    const newBase = safeBase(to);
    const oldMp4 = path.join(VOD_DIR, path.basename(from));
    const newMp4 = path.join(VOD_DIR, path.basename(newBase));

    await fsp.rename(oldMp4, newMp4).catch((e) => {
      throw new Error("rename_failed: " + e.message);
    });

    // rename thumb if present
    const oldJpg = path.join(THUMBS_DIR, path.basename(from).replace(/\.mp4$/i, ".jpg"));
    const newJpg = path.join(THUMBS_DIR, path.basename(newBase).replace(/\.mp4$/i, ".jpg"));
    try {
      await fsp.rename(oldJpg, newJpg);
    } catch {}

    // carry over publish flag
    const pub = await readPub();
    if (pub[from]) {
      delete pub[from];
      pub[newBase] = true;
      await writePub(pub);
    }

    const items = await listVideos();
    return ok({ items });
  } catch (e) {
    console.error(e);
    return bad("rename_failed", 500);
  }
}
