import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

export const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(resolve(root, '.env'))) loadEnvFile(resolve(root, '.env'));
export const config = {
  host: process.env.API_HOST || '127.0.0.1',
  port: Number(process.env.API_PORT || 3001),
  origins: new Set((process.env.APP_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173').split(',').map(value => value.trim())),
  secureCookies: process.env.COOKIE_SECURE === 'true',
};
export function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!process.env.POSTGRES_PASSWORD) throw new Error('POSTGRES_PASSWORD is missing. Run npm run dev to create .env.');
  const user = encodeURIComponent(process.env.POSTGRES_USER || 'kuda');
  const password = encodeURIComponent(process.env.POSTGRES_PASSWORD);
  const database = encodeURIComponent(process.env.POSTGRES_DB || 'kuda');
  return `postgresql://${user}:${password}@127.0.0.1:${process.env.POSTGRES_PORT || '55432'}/${database}`;
}
