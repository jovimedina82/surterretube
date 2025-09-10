import { promises as fsp } from "fs";
import path from "path";

const VOD_DIR = "/mnt/media/vod";
const INDEX_PATH = path.join(VOD_DIR, "_index.json");

type VideoMeta = {
  published: boolean;
  title?: string;
  createdAt?: number; // epoch ms
};

type IndexShape = {
  videos: Record<string, VideoMeta>;
};

async function ensureIndexDir() {
  // VOD_DIR should already exist, but don’t crash if it doesn’t.
  try {
    await fsp.mkdir(VOD_DIR, { recursive: true });
  } catch {}
}

async function readIndex(): Promise<IndexShape> {
  await ensureIndexDir();
  try {
    const raw = await fsp.readFile(INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.videos) {
      return parsed as IndexShape;
    }
  } catch {}
  return { videos: {} };
}

async function writeIndex(idx: IndexShape) {
  const tmp = INDEX_PATH + ".tmp";
  await fsp.writeFile(tmp, JSON.stringify(idx, null, 2));
  await fsp.rename(tmp, INDEX_PATH);
}

export async function setPublished(name: string, published: boolean) {
  const idx = await readIndex();
  const v = idx.videos[name] || { published: false, createdAt: Date.now() };
  v.published = !!published;
  idx.videos[name] = v;
  await writeIndex(idx);
}

export async function setTitle(name: string, title: string) {
  const idx = await readIndex();
  const v = idx.videos[name] || { published: false, createdAt: Date.now() };
  v.title = title;
  idx.videos[name] = v;
  await writeIndex(idx);
}

export async function removeVideo(name: string) {
  const idx = await readIndex();
  delete idx.videos[name];
  await writeIndex(idx);
}

export async function renameVideo(oldName: string, newName: string) {
  const idx = await readIndex();
  if (idx.videos[oldName]) {
    idx.videos[newName] = idx.videos[oldName];
    delete idx.videos[oldName];
    await writeIndex(idx);
  }
}

export async function ensureVideoEntry(name: string) {
  const idx = await readIndex();
  if (!idx.videos[name]) {
    idx.videos[name] = { published: false, createdAt: Date.now() };
    await writeIndex(idx);
  }
}

export async function getPublishedNames(): Promise<string[]> {
  const idx = await readIndex();
  return Object.entries(idx.videos)
    .filter(([, meta]) => !!meta.published)
    .map(([name]) => name);
}

export async function getAllMeta(): Promise<Record<string, VideoMeta>> {
  const idx = await readIndex();
  return idx.videos;
}
