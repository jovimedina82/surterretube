// src/lib/db.ts
import { Pool } from 'pg'
import fs from 'fs'
import { config as dotenv } from 'dotenv'

// load frontend .env/.env.local if present
dotenv()

// fallback: load chat service env if PG vars are still missing
if (!process.env.PGHOST && fs.existsSync('/opt/surterretube/chat/.env')) {
  dotenv({ path: '/opt/surterretube/chat/.env' })
}

// sanity check
for (const k of ['PGHOST','PGDATABASE','PGUSER','PGPASSWORD']) {
  if (!process.env[k]) throw new Error(`Missing env: ${k}`)
}

// lazy pool (avoids constructing with bad env)
let pool: Pool | null = null
function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      max: 5,
    })
  }
  return pool
}

export const query = (text: string, params?: any[]) => getPool().query(text, params)
