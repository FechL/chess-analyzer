import pg from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { databaseUrl } from './config.mjs';

export function createPool(options = {}) {
  return new pg.Pool({ connectionString: databaseUrl(), max: 10, ...options });
}
export async function transaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
export async function migrate(pool) {
  const directory = new URL('./migrations/', import.meta.url);
  const files = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
  await transaction(pool, async client => {
    await client.query('SELECT pg_advisory_xact_lock(574392081)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const name of files) {
      const applied = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
      if (applied.rowCount) continue;
      await client.query(await readFile(new URL(name, directory), 'utf8'));
      await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
      console.log(`Applied migration: ${name}`);
    }
  });
}
