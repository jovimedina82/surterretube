// src/lib/users.ts
import { promises as fsp } from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = "/mnt/media/app";
const USERS_JSON = path.join(DATA_DIR, "users.json");

export type UserRecord = {
  id: string;                 // random id
  name: string;
  email: string;
  role: "admin" | "moderator" | "user";
  created_at: string;         // ISO
  last_seen: string;          // ISO
  source?: "azure" | "manual";
};

async function ensureDataDir() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
}

async function readJsonSafe<T>(file: string, fallback: T): Promise<T> {
  try {
    const buf = await fsp.readFile(file, "utf8");
    return JSON.parse(buf) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: any) {
  const tmp = file + ".tmp";
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2));
  await fsp.rename(tmp, file);
}

export async function listUsers(): Promise<UserRecord[]> {
  await ensureDataDir();
  return await readJsonSafe<UserRecord[]>(USERS_JSON, []);
}

export async function upsertUserByEmail(name: string, email: string, source: "azure" | "manual" = "azure"): Promise<UserRecord> {
  await ensureDataDir();
  const now = new Date().toISOString();
  const users = await listUsers();

  const emailKey = (email || "").trim().toLowerCase();
  if (!emailKey) {
    throw new Error("email_required");
  }

  const existing = users.find(u => u.email.toLowerCase() === emailKey);
  if (existing) {
    // update last_seen and name (do not change role/created_at)
    existing.last_seen = now;
    if (name && name.trim() && existing.name !== name) {
      existing.name = name.trim();
    }
    await writeJson(USERS_JSON, users);
    return existing;
  }

  const rec: UserRecord = {
    id: crypto.randomUUID(),
    name: (name || "").trim() || emailKey,
    email: emailKey,
    role: "user",
    created_at: now,
    last_seen: now,
    source,
  };

  users.push(rec);
  await writeJson(USERS_JSON, users);
  return rec;
}
