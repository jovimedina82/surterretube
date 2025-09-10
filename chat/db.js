// /opt/surterretube/chat/db.js
// db.js - Postgres pool and helper
const { Pool } = require('pg');

// Validate required environment variables
if (!process.env.PGPASSWORD) {
  console.error('FATAL: PGPASSWORD environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'surterre',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'surterretube_prod',
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // Additional security configurations
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  statement_timeout: 10000, // 10 second timeout for queries
});

pool.on('error', (err) => {
  console.error('pg pool error', err);
});

// Enhanced query function with logging and error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('DB Query:', { text: text.substring(0, 100), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', {
      query: text.substring(0, 100),
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    throw error;
  }
};

module.exports = {
  query,
  getPool: () => pool,
};
