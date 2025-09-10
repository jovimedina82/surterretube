import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { promises as fsp } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const VOD_DIR = "/mnt/media/vod";
const PUBLISH_JSON = path.join(VOD_DIR, "published.json");

type PubIndex = Record<string, boolean>;

function ok(data: any = {}) {
  return NextResponse.json({ ok: true, ...data });
}
function bad(error = "bad_request", status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
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

export async function POST(req: NextRequest) {
  await requireAdmin(req);
  try {
    const { file, published } = (await req.json().catch(() => ({}))) as {
      file?: string
      published?: boolean
    };
    if (!file || !/\.mp4$/i.test(file)) return bad("invalid_file");
    if (typeof published !== "boolean") return bad("invalid_flag");

    const pub = await readPub();
    if (published) {
      pub[file] = true;
    } else {
      delete pub[file];
    }
    await writePub(pub);

    return ok({ file, published });
  } catch (e) {
    console.error(e);
    return bad("toggle_failed", 500);
  }
}
