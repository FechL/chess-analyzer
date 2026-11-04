import { createPool, migrate } from './db.mjs';
const pool = createPool();
try { await migrate(pool); } finally { await pool.end(); }
