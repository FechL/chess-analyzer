import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export function ensureDevEnv() {
  const file = resolve(projectRoot, '.env');
  if (!existsSync(file)) {
    const template = readFileSync(resolve(projectRoot, '.env.example'), 'utf8');
    writeFileSync(file, template.replace('replace-with-a-long-random-password', randomBytes(32).toString('hex')), { mode: 0o600, flag: 'wx' });
    console.log('Created .env with a generated database password.');
  }
  loadEnvFile(file);
}
