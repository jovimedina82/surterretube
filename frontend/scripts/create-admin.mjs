// /opt/surterretube/frontend/scripts/create-admin.mjs

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config as dotenv } from 'dotenv'
import bcrypt from 'bcryptjs'
import pg from 'pg'

// --- load env with fallback, but only accept a file if it defines the needed PG vars
const NEED = ['PGHOST','PGDATABASE','PGUSER','PGPASSWORD']
const CWD = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(CWD, '..')
const CANDIDATES = [
  path.join(FRONTEND, '.env'),
  path.join(FRONTEND, '.env.local'),
  '/opt/surterretube/chat/.env',
]

function hasAllPgVars(env) {
  return NEED.every(k => env[k] && String(env[k]).length > 0)
}

let loadedFrom = null
for (const p of CANDIDATES) {
  if (!fs.existsSync(p)) continue
  // load into a temp object without polluting process.env yet
  const buf = fs.readFileSync(p)
  const lines = buf.toString().split(/\r?\n/)
  const temp = { ...process.env }
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const key = m[1]
    let val = m[2]
    // strip quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    temp[key] = val
  }
  if (hasAllPgVars(temp)) {
    dotenv({ path: p })
    loadedFrom = p
    console.log(`[create-admin] Loaded env from: ${p}`)
    break
  }
}

// final fallback: if user exported ENV_PATH, honor it
if (!loadedFrom && process.env.ENV_PATH && fs.existsSync(process.env.ENV_PATH)) {
  dotenv({ path: process.env.ENV_PATH })
  if (hasAllPgVars(process.env)) {
    loadedFrom = process.env.ENV_PATH
    console.log(`[create-admin] Loaded env from ENV_PATH: ${loadedFrom}`)
  }
}

if (!hasAllPgVars(process.env)) {
  console.error('Missing PG env vars (PGHOST, PGDATABASE, PGUSER, PGPASSWORD).')
  console.error('Checked:', CANDIDATES.join(', '), 'and ENV_PATH if set.')
  process.exit(1)
}

const chosen = CANDIDATES.find(p => fs.existsSync(p))
if (chosen) {
  dotenv({ path: chosen })
  console.log(`[create-admin] Loaded env from: ${chosen}`)
} else {
  console.warn('[create-admin] No .env found in frontend or chat; relying on process env only.')
}

// --- rest of the file stays the same below ---
const { PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD } = process.env
if (!PGHOST || !PGDATABASE || !PGUSER || !PGPASSWORD) {
  console.error('Missing PG env vars (PGHOST, PGDATABASE, PGUSER, PGPASSWORD).')
  process.exit(1)
}

const email = process.argv[2]
const password = process.argv[3]
const name = process.argv[4] || 'Admin'
if (!email || !password) {
  console.error('Usage: create-admin.mjs <email> <password> [display_name]')
  process.exit(1)
}

const pool = new pg.Pool({
  host: PGHOST,
  port: Number(PGPORT || 5432),
  database: PGDATABASE,
  user: PGUSER,
  password: PGPASSWORD,
  max: 3
})

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
}

async function main() {
  await ensureTable()
  const hash = await bcrypt.hash(password, 12)
  await pool.query(
    `INSERT INTO admin_users (email, password_hash, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           display_name = EXCLUDED.display_name,
           updated_at = now()`,
    [email, hash, name]
  )
  console.log(`Admin upserted: ${email}`)
}

main()
  .then(() => pool.end())
  .catch(err => { console.error(err); pool.end().then(()=>process.exit(1)) })
