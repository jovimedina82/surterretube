import { NextResponse } from "next/server";
import { promises as fsp } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const VOD_DIR = "/mnt/media/vod";
const THUMBS_DIR = path.join(VOD_DIR, "thumbs");
const PUBLISH_JSON = path.join(VOD_DIR, "published.json");

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
    const pub = await readPub();
    const files = Object.keys(pub).filter((f) => pub[f]);

    const items = await Promise.all(
      files.map(async (file) => {
        const mp4 = path.join(VOD_DIR, file);
        const st = await fsp.stat(mp4).catch(() => null);
        if (!st) return null;

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
        };
      })
    );

    const filtered = items.filter(Boolean) as any[];
    filtered.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
    return NextResponse.json({ ok: true, items: filtered });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
